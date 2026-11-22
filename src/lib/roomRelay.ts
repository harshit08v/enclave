/**
 * ENCLAVE Room Relay & State Coordinator — Hardened V2
 * Synchronizes room presence, Double Ratchet cryptographic sessions, wire packet authentication,
 * Ed25519 identity verification, sequence replay protection, and destruction state machine across tabs and network.
 */

import {
  WirePacket,
  RoomParticipant,
  DecryptedMessage,
  RoomLifecycleState,
  MessageReplyMeta,
  MessageMediaMeta,
  CallSignalPayload,
  RatchetHeader,
  EncryptedPayload
} from '@/packages/protocol';
import {
  EnclaveCryptoKey,
  encryptMessage,
  decryptMessage,
  deriveEphemeralSessionKey,
  generateSecureId,
  zeroizeBuffer,
  encryptMediaBlob,
  decryptMediaBlob,
  createRelayAuthToken,
  WebDoubleRatchetSession,
  getWebCryptoSubtle
} from '@/packages/crypto';
import { validateMediaFile } from '@/lib/mediaConfig';
import { getPrivacyPreferences } from '@/lib/privacyPreferences';
import {
  StoredDeviceIdentity,
  SignedPrekeyCertificate,
  getOrCreateDeviceIdentity,
  getDevicePrekeyCertificate,
  signWithDeviceIdentity,
  verifyDeviceIdentitySignature,
  calculateSafetyNumber,
  verifyPrekeySignature,
  verifyPrekeyCertificate
} from '@/lib/deviceIdentity';

export type MessageListener = (message: DecryptedMessage) => void;
export type PresenceListener = (participants: RoomParticipant[], state: RoomLifecycleState) => void;
export type DissolutionListener = (reason: string) => void;
export type RawPacketListener = (packet: WirePacket) => void;
export type CallSignalListener = (signal: CallSignalPayload) => void;
export type DisappearingTimerListener = (seconds: number) => void;
export type TypingListener = (userId: string, userName: string, isTyping: boolean) => void;
export type ReceiptListener = (receipt: {
  targetMessageId: string;
  status: 'delivered' | 'read';
  recipientId: string;
}) => void;
export type ReactionListener = (reaction: {
  targetMessageId: string;
  emoji: string;
  action: 'add' | 'remove';
  userId: string;
  userName: string;
}) => void;

export interface IdentityAlertDetails {
  senderId: string;
  senderName: string;
  oldKey: string;
  newKey: string;
  safetyNumber?: string | null;
  quarantinedCount: number;
}
export type IdentityAlertListener = (alert: IdentityAlertDetails) => void;

export class EnclaveRoomSession {
  public roomId: string;
  public user: RoomParticipant;
  public authCommitment: string | null = null;
  public relayAuthKey: string | null = null;
  public adminPrivateKey: string | null = null;
  public deviceIdentity: StoredDeviceIdentity | null = null;
  private knownPeerIdentities: Map<string, string> = new Map();
  private identityChangeListeners: Set<(senderId: string, oldKey: string, newKey: string) => void> = new Set();
  private ratchetSessions: Map<string, WebDoubleRatchetSession> = new Map();
  private inMemoryPeerIdentities: Map<string, { identityKey: string; status: 'trusted' | 'verified' | 'rejected'; timestamp: number }> = new Map();
  private quarantinedPackets: Map<string, WirePacket[]> = new Map();
  private identityAlertListeners: Set<IdentityAlertListener> = new Set();
  public tabSessionId: string = generateSecureId('tab', 8);
  public isSessionOwner = true;
  public currentOwnershipGeneration = 1;
  private webLockAbortController: AbortController | null = null;
  private webLockReleaseResolve: (() => void) | null = null;
  public peerQuarantined = false;
  private retiredPeerPrekeys: Set<string> = new Set<string>();
  private trustedPeerIdentities: Map<string, string> = new Map<string, string>();
  private leaseHeartbeatInterval: NodeJS.Timeout | null = null;
  private ownershipLostListeners: Set<() => void> = new Set();
  private roomFullListeners: Set<(reason: string) => void> = new Set();

  private roomMasterSecret: Uint8Array | null = null;
  private senderKey: EnclaveCryptoKey | null = null;
  private receiverKeys: Map<string, EnclaveCryptoKey> = new Map();
  private sendSequence = 1;
  private seenSequences: Map<string, Set<number>> = new Map();
  private seenPacketIds: Set<string> = new Set();
  private channel: BroadcastChannel | null = null;
  private participants: Map<string, RoomParticipant> = new Map();
  private state: RoomLifecycleState = 'WAITING';
  private messageListeners: Set<MessageListener> = new Set();
  private presenceListeners: Set<PresenceListener> = new Set();
  private dissolutionListeners: Set<DissolutionListener> = new Set();
  private rawPacketListeners: Set<RawPacketListener> = new Set();
  private reactionListeners: Set<ReactionListener> = new Set();
  private receiptListeners: Set<ReceiptListener> = new Set();
  private callSignalListeners: Set<CallSignalListener> = new Set();
  private disappearingTimerListeners: Set<DisappearingTimerListener> = new Set();
  private typingListeners: Set<TypingListener> = new Set();
  private disappearingTimerSec = 0;
  private lastTypingSentState = false;
  private lastTypingSentTime = 0;
  public isCallActive = false;
  private activeObjectUrls: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private callFastSyncInterval: NodeJS.Timeout | null = null;
  private fastBurstInterval: NodeJS.Timeout | null = null;
  private fastBurstTimeout: NodeJS.Timeout | null = null;
  private lastPolledTimestamp = 0;
  private lastPolledCursor = 0;
  private isPolling = false;
  private isDestroyed = false;

  constructor(
    roomId: string,
    user: RoomParticipant,
    roomMasterSecret: Uint8Array,
    authCommitment?: string,
    relayAuthKey?: string,
    adminPrivateKey?: string,
    deviceIdentity?: StoredDeviceIdentity
  ) {
    this.roomId = roomId;
    this.user = { ...user, isSelf: true };
    this.authCommitment = authCommitment || null;
    this.relayAuthKey = relayAuthKey || authCommitment || null;
    this.adminPrivateKey = adminPrivateKey || null;
    this.roomMasterSecret = new Uint8Array(roomMasterSecret);
    if (deviceIdentity) {
      this.deviceIdentity = deviceIdentity;
      this.user.identityKey = deviceIdentity.identityPublicKeyHex;
      this.user.prekey = deviceIdentity.prekeyPublicKeyHex;
      this.user.prekeySignature = deviceIdentity.prekeySignatureHex;
      this.user.prekeyId = deviceIdentity.prekeyId || `pk_${deviceIdentity.prekeyPublicKeyHex.slice(0, 12)}`;
      this.user.prekeyCreatedAt = deviceIdentity.prekeyCreatedAt || deviceIdentity.createdAt || Date.now();
      this.user.prekeyExpiresAt = deviceIdentity.prekeyExpiresAt || (this.user.prekeyCreatedAt + 7 * 86400 * 1000);
    }
    this.lastPolledTimestamp = Date.now() - 5000;

    this.participants.set(user.id, this.user);
    this.initTabLease();
    this.initSessionKeys();
    this.initBroadcastChannel();
    this.startSyncLoop();
  }

  private getLeaseStorageKey(): string {
    const idKey = this.deviceIdentity?.identityPublicKeyHex || this.user.identityKey || this.user.id;
    return `enclave_tab_lease_${this.roomId}_${idKey}`;
  }

  private initTabLease(): void {
    if (typeof window === 'undefined') return;

    const leaseKey = this.getLeaseStorageKey();
    const now = Date.now();

    // 1. Web Locks API (exclusive lease if supported)
    if (typeof navigator !== 'undefined' && (navigator as any).locks && typeof (navigator as any).locks.request === 'function') {
      const lockName = `enclave_lock_${this.roomId}_${this.deviceIdentity?.identityPublicKeyHex || this.user.identityKey || this.user.id}`;
      this.webLockAbortController = new AbortController();
      (navigator as any).locks.request(
        lockName,
        { mode: 'exclusive', signal: this.webLockAbortController.signal },
        async () => {
          if (!this.isSessionOwner) {
            this.isSessionOwner = true;
            this.currentOwnershipGeneration++;
          }
          return new Promise<void>((resolve) => {
            this.webLockReleaseResolve = resolve;
          });
        }
      ).catch(() => {
        if (this.isSessionOwner) {
          this.handleOwnershipLost();
        }
      });
    }

    // 2. LocalStorage Lease Coordination & Heartbeat
    try {
      const raw = localStorage.getItem(leaseKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.tabSessionId && parsed.tabSessionId !== this.tabSessionId) {
          if (now - (parsed.lastRenewedAt || 0) < 5000) {
            // Claim active ownership and inform prior tab over BroadcastChannel
            this.broadcast({
              type: 'tab_ownership_claim',
              tabSessionId: this.tabSessionId,
              identityKey: this.user.identityKey,
              challenger: true
            });
          }
        }
      }

      localStorage.setItem(leaseKey, JSON.stringify({
        tabSessionId: this.tabSessionId,
        identityKey: this.user.identityKey,
        lastRenewedAt: now
      }));
    } catch {}

    this.leaseHeartbeatInterval = setInterval(() => {
      if (!this.isSessionOwner) return;
      try {
        const raw = localStorage.getItem(leaseKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.tabSessionId && parsed.tabSessionId !== this.tabSessionId) {
            this.handleOwnershipLost();
            return;
          }
        }
        localStorage.setItem(leaseKey, JSON.stringify({
          tabSessionId: this.tabSessionId,
          identityKey: this.user.identityKey,
          lastRenewedAt: Date.now()
        }));
      } catch {}
    }, 1500);
  }

  public handleOwnershipLost(): void {
    if (!this.isSessionOwner) return;
    this.isSessionOwner = false;
    this.currentOwnershipGeneration++;
    if (this.webLockAbortController) {
      try {
        this.webLockAbortController.abort();
      } catch {}
      this.webLockAbortController = null;
    }
    if (this.webLockReleaseResolve) {
      this.webLockReleaseResolve();
      this.webLockReleaseResolve = null;
    }
    if (this.leaseHeartbeatInterval) {
      clearInterval(this.leaseHeartbeatInterval);
      this.leaseHeartbeatInterval = null;
    }
    this.ownershipLostListeners.forEach(fn => fn());
  }

  public claimOwnership(): boolean {
    this.currentOwnershipGeneration++;
    this.isSessionOwner = true;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(this.getLeaseStorageKey(), JSON.stringify({
          tabSessionId: this.tabSessionId,
          identityKey: this.user.identityKey,
          lastRenewedAt: Date.now()
        }));
      } catch {}
    }
    this.broadcast({
      type: 'tab_ownership_claim',
      tabSessionId: this.tabSessionId,
      identityKey: this.user.identityKey,
      challenger: true
    });
    return true;
  }

  public onOwnershipLost(fn: () => void): () => void {
    this.ownershipLostListeners.add(fn);
    return () => this.ownershipLostListeners.delete(fn);
  }

  public onRoomFull(fn: (reason: string) => void): () => void {
    this.roomFullListeners.add(fn);
    return () => this.roomFullListeners.delete(fn);
  }

  public handleRoomFull(reason: string): void {
    if (this.isDestroyed) return;
    this.state = 'ENDING';
    this.roomFullListeners.forEach(fn => fn(reason));
    this.cleanup();
  }

  public async getAuthHeaders(method: string, path: string): Promise<Record<string, string>> {
    const key = this.relayAuthKey || this.authCommitment;
    if (!key) return {};
    const cleanMethod = (method || 'GET').trim().toUpperCase();
    const cleanPath = (path || `/api/rooms/${this.roomId}`).trim().toLowerCase();
    try {
      const token = await createRelayAuthToken(key, this.roomId, this.user.id, cleanMethod, cleanPath);
      return {
        'Authorization': `Bearer ${token}`
      };
    } catch {
      return {
        'Authorization': `Bearer ${key}`
      };
    }
  }

  public async postRelayPacket(wirePacket: WirePacket): Promise<void> {
    try {
      const authHeaders = await this.getAuthHeaders('POST', `/api/rooms/${this.roomId}/relay`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders
      };
      await fetch(`/api/rooms/${this.roomId}/relay`, {
        method: 'POST',
        headers,
        body: JSON.stringify(wirePacket)
      });
    } catch {}
  }

  public async signAndEmitWirePacket(wirePacket: WirePacket): Promise<void> {
    if (!this.isSessionOwner) {
      throw new Error('This tab has lost session ownership. An active session is open in another tab.');
    }
    const opGen = this.currentOwnershipGeneration;
    if (!this.deviceIdentity) {
      try {
        this.deviceIdentity = await getOrCreateDeviceIdentity();
      } catch {}
    }
    if (this.deviceIdentity) {
      try {
        wirePacket.version = 2;
        wirePacket.senderIdentityKey = this.deviceIdentity.identityPublicKeyHex;
        const canonicalSignPayload = `${wirePacket.packetId}:${wirePacket.roomId}:${wirePacket.senderId}:${wirePacket.sequence}:${wirePacket.timestamp}:${wirePacket.payload.ciphertext}`;
        wirePacket.signature = await signWithDeviceIdentity(
          this.deviceIdentity,
          new TextEncoder().encode(canonicalSignPayload)
        );
      } catch (err) {
        console.warn('[ENCLAVE] Failed to sign wire packet with device identity:', err);
      }
    }

    this.broadcast({
      type: 'encrypted_wire_packet',
      packet: wirePacket
    });

    void this.postRelayPacket(wirePacket);
  }

  public onIdentityChange(fn: (senderId: string, oldKey: string, newKey: string) => void): () => void {
    this.identityChangeListeners.add(fn);
    return () => this.identityChangeListeners.delete(fn);
  }

  public async getSafetyNumberForPeer(peerSenderId: string): Promise<string | null> {
    if (!this.deviceIdentity) return null;
    const peerKey = this.knownPeerIdentities.get(peerSenderId);
    if (!peerKey) return null;
    return calculateSafetyNumber(this.deviceIdentity.identityPublicKeyHex, peerKey);
  }

  public onIdentityAlert(fn: IdentityAlertListener): () => void {
    this.identityAlertListeners.add(fn);
    return () => this.identityAlertListeners.delete(fn);
  }

  public getStoredPeerIdentity(peerId: string): { identityKey: string; status: 'trusted' | 'verified' | 'rejected'; timestamp: number } | null {
    if (typeof window === 'undefined') {
      return this.inMemoryPeerIdentities.get(peerId) || null;
    }
    try {
      const raw = sessionStorage.getItem(`enclave_peer_id_${this.roomId}_${peerId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return this.inMemoryPeerIdentities.get(peerId) || null;
  }

  public storePeerIdentity(peerId: string, data: { identityKey: string; status: 'trusted' | 'verified' | 'rejected'; timestamp: number }): void {
    this.inMemoryPeerIdentities.set(peerId, data);
    this.knownPeerIdentities.set(peerId, data.identityKey);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`enclave_peer_id_${this.roomId}_${peerId}`, JSON.stringify(data));
      } catch {}
    }
  }

  public async verifyAndAcceptPeerIdentity(peerSenderId: string, newKey: string): Promise<void> {
    this.storePeerIdentity(peerSenderId, {
      identityKey: newKey,
      status: 'verified',
      timestamp: Date.now()
    });

    // Reset ratchet session for this peer to ensure fresh cryptographic state
    this.ratchetSessions.delete(peerSenderId);

    // Replay/process any quarantined packets from this newly verified identity
    const quarantined = this.quarantinedPackets.get(peerSenderId) || [];
    this.quarantinedPackets.delete(peerSenderId);

    for (const pkt of quarantined) {
      await this.handleIncomingPacket(pkt);
    }
  }

  public rejectPeerIdentity(peerSenderId: string): void {
    this.storePeerIdentity(peerSenderId, {
      identityKey: 'BLOCKED',
      status: 'rejected',
      timestamp: Date.now()
    });
    this.quarantinedPackets.delete(peerSenderId);
  }

  public async getOrCreateRatchetSession(
    peerId: string,
    peerDHPublicKeyHex?: string,
    peerIdentityPublicKeyHex?: string,
    isInitiator?: boolean,
    peerPrekeySignature?: string,
    peerPrekeyId?: string,
    peerPrekeyCreatedAt?: number,
    peerPrekeyExpiresAt?: number
  ): Promise<WebDoubleRatchetSession> {
    let session = this.ratchetSessions.get(peerId);
    if (session) {
      if (peerIdentityPublicKeyHex && !session.peerIdentityPublicKeyHex) {
        session.peerIdentityPublicKeyHex = peerIdentityPublicKeyHex;
      }
      return session;
    }

    if (!this.deviceIdentity) {
      this.deviceIdentity = await getOrCreateDeviceIdentity();
    }

    if (!this.roomMasterSecret) {
      throw new Error('Cannot create ratchet session: missing room master secret');
    }

    // Derive pairwise Root Key from Room Master Secret (RMS) using HKDF
    const subtle = getWebCryptoSubtle();
    const rmsKey = await subtle.importKey(
      'raw',
      this.roomMasterSecret as unknown as BufferSource,
      'HKDF',
      false,
      ['deriveBits']
    );

    const sortedIds = [this.user.id.toLowerCase(), peerId.toLowerCase()].sort().join(':');
    const info = new TextEncoder().encode(`ENCLAVE v2 | Pairwise Root Key | ${this.roomId} | ${sortedIds}`);
    const rootBits = await subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32) as unknown as BufferSource,
        info: info as unknown as BufferSource
      },
      rmsKey,
      256
    );
    const pairwiseRootKey = new Uint8Array(rootBits);

    // If explicit initiator role passed (true for sender, false for receiver), use it; otherwise compare sorted IDs
    const roleIsInitiator = typeof isInitiator === 'boolean'
      ? isInitiator
      : this.user.id.toLowerCase() < peerId.toLowerCase();

    let initialPeerDH = peerDHPublicKeyHex;
    const p = this.participants.get(peerId);
    if (!initialPeerDH && p && p.prekey) {
      initialPeerDH = p.prekey;
    }

    const effectivePeerIdKey = peerIdentityPublicKeyHex || (p && p.identityKey);
    const effectivePrekeySig = peerPrekeySignature || (p && p.prekeySignature);
    const effectivePrekeyId = peerPrekeyId || (p && p.prekeyId);
    const effectivePrekeyCreatedAt = peerPrekeyCreatedAt || (p && p.prekeyCreatedAt);
    const effectivePrekeyExpiresAt = peerPrekeyExpiresAt || (p && p.prekeyExpiresAt);

    const isPeerPrekeyHandshake = roleIsInitiator || (!!peerPrekeySignature && p && initialPeerDH === p.prekey);
    if (isPeerPrekeyHandshake) {
      if (!effectivePeerIdKey) {
        throw new Error(`Peer identity public key missing for participant ${peerId}. Unauthenticated prekey handshake is rejected.`);
      }
      if (!initialPeerDH) {
        throw new Error(`Peer prekey missing for participant ${peerId}. Cannot establish prekey handshake.`);
      }
      if (!effectivePrekeySig) {
        throw new Error(`Peer prekey signature missing for participant ${peerId}. Uncertified prekeys are rejected.`);
      }

      // Check replay of retired prekeys
      if (this.retiredPeerPrekeys.has(initialPeerDH.toLowerCase())) {
        throw new Error(`Replayed prekey detected for participant ${peerId}. Retired prekeys cannot be reused.`);
      }

      // Verify prekey certificate
      const certVerification = await verifyPrekeyCertificate({
        identityKey: effectivePeerIdKey,
        prekey: initialPeerDH,
        signature: effectivePrekeySig,
        prekeyId: effectivePrekeyId,
        createdAt: effectivePrekeyCreatedAt,
        expiresAt: effectivePrekeyExpiresAt
      });

      if (!certVerification.valid) {
        if (certVerification.error === 'EXPIRED_PREKEY_CERTIFICATE') {
          throw new Error(`Peer prekey certificate has expired for participant ${peerId}. Handshake rejected.`);
        }
        throw new Error(`Peer prekey signature verification failed for participant ${peerId}. Potential MITM or uncertified prekey.`);
      }
    }

    // Authenticate peer identity key against persistent trust (TOFU & key change detection)
    if (effectivePeerIdKey) {
      await this.authenticatePeerIdentityKey(peerId, effectivePeerIdKey);
    }

    session = await WebDoubleRatchetSession.create(
      this.deviceIdentity.identityPublicKeyHex,
      this.deviceIdentity.identityPrivateKeyPkcs8Hex,
      pairwiseRootKey,
      roleIsInitiator,
      initialPeerDH,
      effectivePeerIdKey || peerIdentityPublicKeyHex,
      this.deviceIdentity.prekeyPrivateKeyPkcs8Hex,
      this.deviceIdentity.prekeyPublicKeyHex
    );

    this.ratchetSessions.set(peerId, session);
    return session;
  }

  public async authenticatePeerIdentityKey(peerId: string, peerIdentityKeyHex: string): Promise<void> {
    const normalizedPeerKey = peerIdentityKeyHex.toLowerCase();
    const storageKey = `enclave_trusted_peer_${this.roomId}_${peerId}`;

    let trustedKey = this.trustedPeerIdentities.get(peerId);
    if (!trustedKey && typeof window !== 'undefined' && window.localStorage) {
      try {
        trustedKey = localStorage.getItem(storageKey) || undefined;
      } catch {}
    }

    if (trustedKey) {
      if (trustedKey.toLowerCase() !== normalizedPeerKey) {
        this.peerQuarantined = true;
        throw new Error(
          `Peer identity key changed for participant ${peerId}! ` +
          `Expected ${trustedKey}, got ${peerIdentityKeyHex}. Potential MITM or identity substitution attack.`
        );
      }
    } else {
      this.trustedPeerIdentities.set(peerId, normalizedPeerKey);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(storageKey, normalizedPeerKey);
        } catch {}
      }
    }
  }

  private async initSessionKeys() {
    if (!this.roomMasterSecret) return;
    this.senderKey = await deriveEphemeralSessionKey(this.roomMasterSecret, this.user.id);
    try {
      if (!this.deviceIdentity) {
        this.deviceIdentity = await getOrCreateDeviceIdentity();
      }
      this.user.identityKey = this.deviceIdentity.identityPublicKeyHex;
      this.user.prekey = this.deviceIdentity.prekeyPublicKeyHex;
      this.user.prekeySignature = this.deviceIdentity.prekeySignatureHex;
      this.user.prekeyId = this.deviceIdentity.prekeyId || `pk_${this.deviceIdentity.prekeyPublicKeyHex.slice(0, 12)}`;
      this.user.prekeyCreatedAt = this.deviceIdentity.prekeyCreatedAt || this.deviceIdentity.createdAt || Date.now();
      this.user.prekeyExpiresAt = this.deviceIdentity.prekeyExpiresAt || (this.user.prekeyCreatedAt + 7 * 86400 * 1000);

      // Broadcast fresh presence containing identity key and initial prekey
      this.broadcast({
        type: 'presence_announce',
        participant: {
          id: this.user.id,
          displayName: this.user.displayName,
          joinedAt: this.user.joinedAt,
          identityKey: this.user.identityKey,
          prekey: this.user.prekey,
          prekeySignature: this.user.prekeySignature,
          prekeyId: this.user.prekeyId,
          prekeyCreatedAt: this.user.prekeyCreatedAt,
          prekeyExpiresAt: this.user.prekeyExpiresAt
        }
      });
      void this.syncWithServerRelay('heartbeat');
    } catch {}
  }

  private async getReceiverKey(senderId: string): Promise<EnclaveCryptoKey | null> {
    if (!this.roomMasterSecret) return null;
    let key = this.receiverKeys.get(senderId);
    if (!key) {
      key = await deriveEphemeralSessionKey(this.roomMasterSecret, senderId);
      this.receiverKeys.set(senderId, key);
    }
    return key;
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;

    this.channel = new BroadcastChannel(`enclave_room_${this.roomId}`);
    this.channel.onmessage = async (event) => {
      if (this.isDestroyed) return;
      const data = event.data;

      if (!data || !data.type) return;

      switch (data.type) {
        case 'tab_ownership_claim':
          if (
            data.tabSessionId &&
            data.tabSessionId !== this.tabSessionId &&
            data.identityKey &&
            this.user.identityKey &&
            data.identityKey.toLowerCase() === this.user.identityKey.toLowerCase()
          ) {
            this.handleOwnershipLost();
          }
          break;

        case 'presence_announce':
          this.handlePresenceAnnounce(data.participant);
          break;

        case 'presence_heartbeat':
          this.handleHeartbeat(data.participant);
          break;

        case 'presence_leave':
          this.handleParticipantLeave(data.participantId);
          break;

        case 'room_destruction_triggered':
          this.handleRoomDestroyed(data.reason || 'Final participant exited');
          break;

        case 'encrypted_wire_packet':
          await this.handleIncomingPacket(data.packet);
          break;
      }
    };

    // Announce presence immediately via BroadcastChannel
    this.broadcast({
      type: 'presence_announce',
      participant: {
        id: this.user.id,
        displayName: this.user.displayName,
        joinedAt: this.user.joinedAt,
        identityKey: this.user.identityKey,
        prekey: this.user.prekey,
        prekeySignature: this.user.prekeySignature
      }
    });

    // Also notify API relay
    this.syncWithServerRelay('join');
  }

  private async syncWithServerRelay(action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here') {
    try {
      const authHeaders = await this.getAuthHeaders('POST', `/api/rooms/${this.roomId}/presence`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders
      };
      const res = await fetch(`/api/rooms/${this.roomId}/presence`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          participantId: this.user.id,
          displayName: this.user.displayName,
          isGuest: Boolean(this.user.isGuest),
          identityKey: this.deviceIdentity?.identityPublicKeyHex,
          prekey: this.deviceIdentity?.prekeyPublicKeyHex,
          prekeySignature: this.deviceIdentity?.prekeySignatureHex,
          prekeyId: this.user.prekeyId || (this.deviceIdentity?.prekeyPublicKeyHex ? `pk_${this.deviceIdentity.prekeyPublicKeyHex.slice(0, 12)}` : undefined),
          prekeyCreatedAt: this.user.prekeyCreatedAt || this.deviceIdentity?.prekeyCreatedAt,
          prekeyExpiresAt: this.user.prekeyExpiresAt || this.deviceIdentity?.prekeyExpiresAt
        })
      });
      if (res.status === 409) {
        const errData = await res.json().catch(() => ({}));
        this.handleRoomFull(errData.error || 'Room is full. Maximum two participants allowed.');
        return;
      }
      if (res.status === 410 || res.status === 404) {
        this.handleRoomDestroyed('Room has completed its lifecycle and is destroyed.');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.participants && Array.isArray(data.participants)) {
          const serverIds = new Set<string>();
          for (const p of data.participants) {
            serverIds.add(p.id);
            if (p.id !== this.user.id) {
              const existingPeer = this.participants.get(p.id);
              if (existingPeer && existingPeer.prekey && p.prekey && existingPeer.prekey.toLowerCase() !== p.prekey.toLowerCase()) {
                this.retiredPeerPrekeys.add(existingPeer.prekey.toLowerCase());
              }
              this.participants.set(p.id, {
                id: p.id,
                displayName: p.displayName || 'Anonymous',
                joinedAt: p.joinedAt || Date.now(),
                isSelf: false,
                identityKey: p.identityKey,
                prekey: p.prekey,
                prekeySignature: p.prekeySignature,
                prekeyId: p.prekeyId,
                prekeyCreatedAt: p.prekeyCreatedAt,
                prekeyExpiresAt: p.prekeyExpiresAt
              });
            }
          }

          // Prune departed participants
          for (const id of Array.from(this.participants.keys())) {
            if (id !== this.user.id && !serverIds.has(id)) {
              this.participants.delete(id);
              this.receiverKeys.delete(id);
            }
          }
        }

        if (data.state && data.state !== 'DESTROYED') {
          this.state = data.state;
        } else if (this.participants.size >= 2) {
          this.state = 'ACTIVE';
        }

        this.notifyPresence();
      }
    } catch {
      // Offline / Local fallback handles via BroadcastChannel
    }
  }

  private async pollRelayPackets() {
    if (this.isDestroyed || this.isPolling) return;
    this.isPolling = true;

    try {
      const authHeaders = await this.getAuthHeaders('GET', `/api/rooms/${this.roomId}/relay`);
      const headers: Record<string, string> = { ...authHeaders };

      const query = this.lastPolledCursor > 0
        ? `cursor=${this.lastPolledCursor}`
        : `since=${this.lastPolledTimestamp}`;

      const res = await fetch(`/api/rooms/${this.roomId}/relay?${query}`, {
        headers
      });

      if (res.status === 410 || res.status === 404) {
        this.handleRoomDestroyed('Room has completed its lifecycle and is destroyed.');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const packets: WirePacket[] = data.packets || [];
        for (const pkt of packets) {
          if (typeof pkt.relaySeq === 'number' && pkt.relaySeq > this.lastPolledCursor) {
            this.lastPolledCursor = pkt.relaySeq;
          }
          if (pkt.timestamp > this.lastPolledTimestamp) {
            this.lastPolledTimestamp = pkt.timestamp;
          }
          if (pkt.senderId !== this.user.id) {
            await this.handleIncomingPacket(pkt);
          }
        }
        if (typeof data.nextCursor === 'number' && data.nextCursor > this.lastPolledCursor) {
          this.lastPolledCursor = data.nextCursor;
        }
      }
    } catch {
      // Transient network delay
    } finally {
      this.isPolling = false;
    }
  }

  public async sendImHere(): Promise<void> {
    this.broadcast({
      type: 'presence_heartbeat',
      participant: {
        id: this.user.id,
        displayName: this.user.displayName,
        joinedAt: this.user.joinedAt,
        identityKey: this.deviceIdentity?.identityPublicKeyHex,
        prekey: this.deviceIdentity?.prekeyPublicKeyHex,
        prekeySignature: this.deviceIdentity?.prekeySignatureHex
      }
    });
    await this.syncWithServerRelay('im_here');
  }

  private handlePresenceAnnounce(remoteUser: RoomParticipant) {
    if (remoteUser.id === this.user.id) return;
    this.participants.set(remoteUser.id, { ...remoteUser, isSelf: false });
    this.state = this.participants.size >= 2 ? 'ACTIVE' : 'WAITING';
    this.notifyPresence();

    // Respond with our own presence
    this.broadcast({
      type: 'presence_heartbeat',
      participant: {
        id: this.user.id,
        displayName: this.user.displayName,
        joinedAt: this.user.joinedAt,
        identityKey: this.deviceIdentity?.identityPublicKeyHex,
        prekey: this.deviceIdentity?.prekeyPublicKeyHex,
        prekeySignature: this.deviceIdentity?.prekeySignatureHex
      }
    });
  }

  private handleHeartbeat(remoteUser: RoomParticipant) {
    if (remoteUser.id === this.user.id) return;
    this.participants.set(remoteUser.id, { ...remoteUser, isSelf: false });
    this.state = this.participants.size >= 2 ? 'ACTIVE' : 'WAITING';
    this.notifyPresence();
  }

  private handleParticipantLeave(participantId: string) {
    this.participants.delete(participantId);
    this.receiverKeys.delete(participantId);

    if (this.participants.size <= 1) {
      this.state = this.participants.size === 1 ? 'ENDING' : 'DESTROYED';
    }

    this.notifyPresence();

    if (this.participants.size === 0) {
      this.destroyRoomSession('All participants have departed.');
    }
  }

  private handleRoomDestroyed(reason: string) {
    if (this.isDestroyed) return;
    this.state = 'DESTROYED';
    this.dissolutionListeners.forEach(fn => fn(reason));
    this.zeroizeAndCleanup();
  }

  private async handleIncomingPacket(packet: WirePacket) {
    if (!this.isSessionOwner) {
      // Evicted or secondary tab: drop incoming packet immediately without advancing ratchet or storing skipped keys
      return;
    }
    const opGen = this.currentOwnershipGeneration;

    // When incoming packet arrives, accelerate polling burst for responsive conversation flow
    this.triggerFastPollingBurst(6000);
    if (packet.roomId !== this.roomId || this.isDestroyed) return;

    // Drop already-expired packets immediately to prevent delayed replay
    if (packet.expiresAt && Date.now() >= packet.expiresAt) {
      return;
    }

    // 1. Replay & Duplicate Packet Protection
    if (this.seenPacketIds.has(packet.packetId)) {
      return; // Drop duplicate packet silently
    }
    this.seenPacketIds.add(packet.packetId);
    if (this.seenPacketIds.size > 200) {
      const first = this.seenPacketIds.values().next().value;
      if (first) this.seenPacketIds.delete(first);
    }

    // Sequence window checking
    let seqSet = this.seenSequences.get(packet.senderId);
    if (!seqSet) {
      seqSet = new Set();
      this.seenSequences.set(packet.senderId, seqSet);
    }
    if (seqSet.has(packet.sequence)) {
      return; // Sequence replay detected: drop
    }
    seqSet.add(packet.sequence);

    // 1b. Cryptographic Identity Signature Verification & Identity Substitution Quarantine
    if (packet.senderIdentityKey && packet.signature) {
      const canonicalSignPayload = `${packet.packetId}:${packet.roomId}:${packet.senderId}:${packet.sequence}:${packet.timestamp}:${packet.payload.ciphertext}`;
      const isValidSig = await verifyDeviceIdentitySignature(
        packet.senderIdentityKey,
        new TextEncoder().encode(canonicalSignPayload),
        packet.signature
      );
      if (!isValidSig) {
        console.warn('[ENCLAVE] Dropping forged or tampered packet: Ed25519 signature invalid');
        return;
      }

      // Phase 3: Identity Key Change Detection & Unverified Packet Quarantine
      const senderId = packet.senderId;
      const newKey = packet.senderIdentityKey;
      const storedRecord = this.getStoredPeerIdentity(senderId);

      if (storedRecord) {
        if (storedRecord.status === 'rejected') {
          console.warn(`[ENCLAVE SECURITY ALERT] Dropped packet from permanently rejected identity ${senderId}`);
          return;
        }

        if (storedRecord.identityKey.toLowerCase() !== newKey.toLowerCase()) {
          if (storedRecord.status !== 'verified') {
            console.warn(`[ENCLAVE SECURITY ALERT] Identity key substitution detected for participant ${senderId}! Quarantining packet.`);

            let quarantined = this.quarantinedPackets.get(senderId);
            if (!quarantined) {
              quarantined = [];
              this.quarantinedPackets.set(senderId, quarantined);
            }
            quarantined.push(packet);

            let safetyNum: string | null = null;
            if (this.deviceIdentity) {
              try {
                safetyNum = await calculateSafetyNumber(this.deviceIdentity.identityPublicKeyHex, newKey);
              } catch {}
            }

            this.identityAlertListeners.forEach(fn => fn({
              senderId,
              senderName: packet.senderName,
              oldKey: storedRecord.identityKey,
              newKey,
              safetyNumber: safetyNum,
              quarantinedCount: quarantined!.length
            }));

            // CRITICAL SECURITY INVARIANT: Abort immediately! Do NOT decrypt or display as trusted!
            return;
          }
        }
      } else {
        // First contact: Record identity as trusted (TOFU)
        this.storePeerIdentity(senderId, {
          identityKey: newKey,
          status: 'trusted',
          timestamp: Date.now()
        });
      }
    }

    this.rawPacketListeners.forEach(fn => fn(packet));

    // Handle typing indicator (ephemeral transient notification, does not advance ratchet)
    if (packet.type === 'typing_indicator') {
      if (packet.senderId === this.user.id) return;
      const isTyping = (packet as any).isTyping === true || (packet as any).typingData?.isTyping === true;
      this.typingListeners.forEach(fn => fn(packet.senderId, packet.senderName, isTyping));
      return;
    }

    try {
      const isSelf = packet.senderId === this.user.id;
      let plaintext: string;

      // Phase 2: Double Ratchet Decryption for live messaging runtime
      if (packet.ratchetHeader && (packet.version === 2 || packet.version === 1)) {
        const ratchet = await this.getOrCreateRatchetSession(
          packet.senderId,
          packet.ratchetHeader.dhPub,
          packet.senderIdentityKey,
          false
        );
        const canonicalEnvelope = packet.senderIdentityKey && packet.signature
          ? new TextEncoder().encode(`${packet.packetId}:${packet.roomId}:${packet.senderId}:${packet.sequence}:${packet.timestamp}:${packet.payload.ciphertext}`)
          : undefined;
        plaintext = await ratchet.ratchetDecrypt(
          packet.payload.ciphertext,
          packet.payload.iv,
          packet.ratchetHeader,
          packet.signature || '',
          canonicalEnvelope
        );
      } else {
        // Enforce Double Ratchet in production; reject unratcheted downgrade attempts
        const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
        if (isProduction) {
          console.warn('[ENCLAVE SECURITY] Rejected unratcheted wire packet in production mode');
          return;
        }

        const key = isSelf ? this.senderKey : await this.getReceiverKey(packet.senderId);
        if (!key) throw new Error('No session key available');

        plaintext = await decryptMessage(
          key,
          packet.payload,
          this.roomId,
          packet.packetId,
          packet.senderId,
          packet.version
        );
      }

      if (!this.isSessionOwner || this.currentOwnershipGeneration !== opGen) {
        // Tab lost ownership while decrypting; abort without dispatching message
        return;
      }

      // Handle room-wide disappearing timer update
      if (packet.type === 'disappearing_timer_update') {
        let newSec = packet.disappearingTimerSec;
        if (newSec === undefined) {
          try {
            const parsed = JSON.parse(plaintext);
            newSec = parsed.disappearingTimerSec;
          } catch {}
        }
        const finalSec = newSec ?? 0;
        this.disappearingTimerSec = finalSec;
        this.disappearingTimerListeners.forEach(fn => fn(finalSec));
        return;
      }

      // Check if packet is a receipt
      if (
        (packet.type === 'receipt_delivered' || packet.type === 'receipt_read') &&
        packet.receiptData
      ) {
        this.receiptListeners.forEach(fn =>
          fn({
            targetMessageId: packet.receiptData!.targetMessageId,
            status: packet.receiptData!.status,
            recipientId: packet.senderId
          })
        );
        return;
      }

      // Check if packet is a reaction
      if (packet.type === 'reaction' && packet.reactionData) {
        this.reactionListeners.forEach(fn =>
          fn({
            targetMessageId: packet.reactionData!.targetMessageId,
            emoji: packet.reactionData!.emoji,
            action: packet.reactionData!.action,
            userId: packet.senderId,
            userName: packet.senderName
          })
        );
        return;
      }

      // Check if packet is a call signal
      if (packet.type === 'call_signal') {
        try {
          const signal: CallSignalPayload = JSON.parse(plaintext);
          this.callSignalListeners.forEach(fn => fn(signal));
        } catch {
          // malformed signal payload: ignore safely
        }
        return;
      }

      const message: DecryptedMessage = {
        id: packet.packetId,
        roomId: packet.roomId,
        senderId: packet.senderId,
        senderName: packet.senderName,
        sequence: packet.sequence,
        text: plaintext,
        timestamp: packet.timestamp,
        isSelf,
        rawPayload: packet.payload,
        status: isSelf ? 'sent' : undefined,
        replyTo: packet.replyTo,
        mediaMeta: packet.mediaMeta,
        expiresAt: packet.expiresAt,
        ttlSeconds: packet.ttlSeconds
      };

      this.messageListeners.forEach(fn => fn(message));

      // If incoming message from remote participant, send delivery receipt only if allowed by privacy preferences
      if (!isSelf) {
        const prefs = getPrivacyPreferences();
        if (prefs.readReceipts) {
          this.sendReceipt(packet.packetId, 'delivered').catch(() => {});
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            this.sendReceipt(packet.packetId, 'read').catch(() => {});
          }
        }
      }
    } catch (err) {
      // Decryption failed or tag mismatched: do NOT leak plaintext or stack trace
    }
  }

  public async sendReceipt(targetMessageId: string, status: 'delivered' | 'read'): Promise<void> {
    if (this.isDestroyed || !this.isSessionOwner || this.participants.size > 2) return;
    const opGen = this.currentOwnershipGeneration;

    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();
    const receiptPayload = JSON.stringify({ targetMessageId, status });

    const remotePeer = Array.from(this.participants.values()).find(p => p.id !== this.user.id);
    let encryptedPayload: EncryptedPayload;
    let ratchetHeader: RatchetHeader | undefined;

    if (remotePeer) {
      const ratchet = await this.getOrCreateRatchetSession(
        remotePeer.id,
        remotePeer.prekey,
        remotePeer.identityKey,
        true,
        remotePeer.prekeySignature
      );
      const ratchetRes = await ratchet.ratchetEncrypt(receiptPayload);
      encryptedPayload = {
        ciphertext: ratchetRes.ciphertext,
        iv: ratchetRes.iv,
        sequence: seq,
        timestamp: now
      };
      ratchetHeader = ratchetRes.ratchetHeader;
    } else if (this.senderKey) {
      encryptedPayload = await encryptMessage(
        this.senderKey,
        receiptPayload,
        this.roomId,
        packetId,
        this.user.id,
        seq,
        now,
        1
      );
    } else {
      return;
    }

    if (!this.isSessionOwner || this.currentOwnershipGeneration !== opGen) {
      throw new Error('Aborted: Tab lost active ratchet ownership during operation.');
    }

    const wirePacket: WirePacket = {
      version: ratchetHeader ? 2 : 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: status === 'read' ? 'receipt_read' : 'receipt_delivered',
      ratchetHeader,
      receiptData: {
        targetMessageId,
        status
      }
    };

    this.seenPacketIds.add(packetId);
    let mySeqSet = this.seenSequences.get(this.user.id);
    if (!mySeqSet) {
      mySeqSet = new Set();
      this.seenSequences.set(this.user.id, mySeqSet);
    }
    mySeqSet.add(seq);

    void this.signAndEmitWirePacket(wirePacket);
  }

  public async sendMessage(text: string, replyTo?: MessageReplyMeta): Promise<DecryptedMessage> {
    if (this.isDestroyed) {
      throw new Error('Enclave session is inactive or destroyed');
    }
    if (!this.isSessionOwner) {
      throw new Error('This tab has lost session ownership. An active session is open in another tab.');
    }
    const opGen = this.currentOwnershipGeneration;
    if (this.participants.size > 2) {
      throw new Error('Room participant limit exceeded. Enclave rooms support a maximum of two participants for pairwise cryptographic assurance.');
    }

    const trimmed = text.trim();
    if (!trimmed) throw new Error('Cannot send empty message');

    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();
    const ttlSeconds = this.disappearingTimerSec > 0 ? this.disappearingTimerSec : undefined;
    const expiresAt = ttlSeconds ? now + (ttlSeconds * 1000) : undefined;

    // Identify remote peer in room
    const remotePeer = Array.from(this.participants.values()).find(p => p.id !== this.user.id);
    let encryptedPayload: EncryptedPayload;
    let ratchetHeader: RatchetHeader | undefined;

    if (remotePeer) {
      const ratchet = await this.getOrCreateRatchetSession(
        remotePeer.id,
        remotePeer.prekey,
        remotePeer.identityKey,
        true,
        remotePeer.prekeySignature
      );
      const ratchetRes = await ratchet.ratchetEncrypt(trimmed);
      encryptedPayload = {
        ciphertext: ratchetRes.ciphertext,
        iv: ratchetRes.iv,
        sequence: seq,
        timestamp: now
      };
      ratchetHeader = ratchetRes.ratchetHeader;
    } else {
      if (!this.senderKey) {
        throw new Error('Enclave session keys not initialized');
      }
      encryptedPayload = await encryptMessage(
        this.senderKey,
        trimmed,
        this.roomId,
        packetId,
        this.user.id,
        seq,
        now,
        1
      );
    }

    if (!this.isSessionOwner || this.currentOwnershipGeneration !== opGen) {
      throw new Error('Aborted: Tab lost active ratchet ownership during message encryption.');
    }

    const wirePacket: WirePacket = {
      version: ratchetHeader ? 2 : 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'chat_message',
      ratchetHeader,
      replyTo,
      ttlSeconds,
      expiresAt
    };

    // Mark outgoing packet as seen locally to prevent self-echo duplicate processing
    this.seenPacketIds.add(packetId);
    let mySeqSet = this.seenSequences.get(this.user.id);
    if (!mySeqSet) {
      mySeqSet = new Set();
      this.seenSequences.set(this.user.id, mySeqSet);
    }
    mySeqSet.add(seq);

    await this.signAndEmitWirePacket(wirePacket);

    const localMessage: DecryptedMessage = {
      id: packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      text: trimmed,
      timestamp: now,
      isSelf: true,
      status: 'sent',
      rawPayload: encryptedPayload,
      replyTo,
      ttlSeconds,
      expiresAt
    };

    this.rawPacketListeners.forEach(fn => fn(wirePacket));
    return localMessage;
  }

  public async sendMediaMessage(
    file: File,
    caption?: string,
    replyTo?: MessageReplyMeta,
    viewOnce = false
  ): Promise<DecryptedMessage> {
    if (this.isDestroyed || !this.senderKey) {
      throw new Error('Enclave session is inactive or destroyed');
    }
    if (!this.isSessionOwner) {
      throw new Error('This tab has lost session ownership. An active session is open in another tab.');
    }
    const opGen = this.currentOwnershipGeneration;
    if (this.participants.size > 2) {
      throw new Error('Room participant limit exceeded. Enclave rooms support a maximum of two participants for pairwise cryptographic assurance.');
    }

    const validation = validateMediaFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid media file');
    }

    const mediaId = generateSecureId('med', 8);
    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

    // 1. Read file bytes
    const arrayBuf = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuf);

    // 2. Encrypt media payload locally with AES-256-GCM + Media AAD
    const encryptedBundle = await encryptMediaBlob(
      this.senderKey,
      fileBytes,
      this.roomId,
      mediaId,
      file.type,
      now,
      1
    );

    // 3. Upload blind ciphertext bundle to server storage
    const authHeaders = await this.getAuthHeaders('POST', `/api/rooms/${this.roomId}/media`);
    const uploadHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders
    };
    const uploadRes = await fetch(`/api/rooms/${this.roomId}/media`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify({
        mediaId,
        iv: encryptedBundle.iv,
        ciphertext: encryptedBundle.ciphertext,
        mimeType: file.type,
        size: file.size,
        timestamp: now
      })
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload encrypted media bundle to room relay');
    }

    // 4. Encrypt caption (or empty string) as the message payload
    const trimmedCaption = caption?.trim() || '';
    const remotePeer = Array.from(this.participants.values()).find(p => p.id !== this.user.id);
    let encryptedPayload: EncryptedPayload;
    let ratchetHeader: RatchetHeader | undefined;

    if (remotePeer) {
      const ratchet = await this.getOrCreateRatchetSession(
        remotePeer.id,
        remotePeer.prekey,
        remotePeer.identityKey,
        true,
        remotePeer.prekeySignature
      );
      const ratchetRes = await ratchet.ratchetEncrypt(trimmedCaption);
      encryptedPayload = {
        ciphertext: ratchetRes.ciphertext,
        iv: ratchetRes.iv,
        sequence: seq,
        timestamp: now
      };
      ratchetHeader = ratchetRes.ratchetHeader;
    } else {
      encryptedPayload = await encryptMessage(
        this.senderKey,
        trimmedCaption,
        this.roomId,
        packetId,
        this.user.id,
        seq,
        now,
        1
      );
    }

    // 5. Create local Object URL for immediate zero-latency local rendering
    const localBlobUrl = URL.createObjectURL(file);
    this.activeObjectUrls.add(localBlobUrl);

    const mediaMeta: MessageMediaMeta = {
      mediaId,
      mediaType,
      mimeType: file.type,
      fileName: file.name,
      size: file.size,
      caption: trimmedCaption || undefined,
      localBlobUrl,
      loadingState: 'ready',
      viewOnce: viewOnce ? true : undefined
    };

    const ttlSeconds = this.disappearingTimerSec > 0 ? this.disappearingTimerSec : undefined;
    const expiresAt = ttlSeconds ? now + (ttlSeconds * 1000) : undefined;

    if (!this.isSessionOwner || this.currentOwnershipGeneration !== opGen) {
      throw new Error('Aborted: Tab lost active ratchet ownership during media encryption.');
    }

    const wirePacket: WirePacket = {
      version: ratchetHeader ? 2 : 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'media_message',
      ratchetHeader,
      mediaMeta: {
        ...mediaMeta,
        localBlobUrl: undefined // Recipient will derive their own local blob URL after downloading/decrypting
      },
      replyTo,
      ttlSeconds,
      expiresAt
    };

    // Mark outgoing packet as seen locally to prevent self-echo duplicate processing
    this.seenPacketIds.add(packetId);
    let myMediaSeqSet = this.seenSequences.get(this.user.id);
    if (!myMediaSeqSet) {
      myMediaSeqSet = new Set();
      this.seenSequences.set(this.user.id, myMediaSeqSet);
    }
    myMediaSeqSet.add(seq);

    void this.signAndEmitWirePacket(wirePacket);

    const localMessage: DecryptedMessage = {
      id: packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      text: trimmedCaption,
      timestamp: now,
      isSelf: true,
      status: 'sent',
      rawPayload: encryptedPayload,
      mediaMeta,
      replyTo,
      ttlSeconds,
      expiresAt
    };

    this.rawPacketListeners.forEach(fn => fn(wirePacket));
    return localMessage;
  }

  public getDisappearingTimer(): number {
    return this.disappearingTimerSec;
  }

  public onDisappearingTimerChange(fn: DisappearingTimerListener): () => void {
    this.disappearingTimerListeners.add(fn);
    return () => this.disappearingTimerListeners.delete(fn);
  }

  public async setDisappearingTimer(seconds: number): Promise<void> {
    const valid = [0, 30, 300, 3600, 86400];
    if (!valid.includes(seconds)) {
      throw new Error(`Invalid disappearing message duration: ${seconds}s`);
    }
    this.disappearingTimerSec = seconds;

    if (this.isDestroyed) return;
    if (!this.isSessionOwner) {
      throw new Error('This tab has lost session ownership. An active session is open in another tab.');
    }
    const opGen = this.currentOwnershipGeneration;
    if (this.participants.size > 2) {
      throw new Error('Room participant limit exceeded. Enclave rooms support a maximum of two participants for pairwise cryptographic assurance.');
    }

    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();
    const timerPayload = JSON.stringify({ disappearingTimerSec: seconds });

    const remotePeer = Array.from(this.participants.values()).find(p => p.id !== this.user.id);
    let encryptedPayload: EncryptedPayload;
    let ratchetHeader: RatchetHeader | undefined;

    if (remotePeer) {
      const ratchet = await this.getOrCreateRatchetSession(
        remotePeer.id,
        remotePeer.prekey,
        remotePeer.identityKey,
        true,
        remotePeer.prekeySignature
      );
      const ratchetRes = await ratchet.ratchetEncrypt(timerPayload);
      encryptedPayload = {
        ciphertext: ratchetRes.ciphertext,
        iv: ratchetRes.iv,
        sequence: seq,
        timestamp: now
      };
      ratchetHeader = ratchetRes.ratchetHeader;
    } else if (this.senderKey) {
      encryptedPayload = await encryptMessage(
        this.senderKey,
        timerPayload,
        this.roomId,
        packetId,
        this.user.id,
        seq,
        now,
        1
      );
    } else {
      return;
    }

    if (!this.isSessionOwner || this.currentOwnershipGeneration !== opGen) {
      throw new Error('Aborted: Tab lost active ratchet ownership during operation.');
    }

    const wirePacket: WirePacket = {
      version: ratchetHeader ? 2 : 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'disappearing_timer_update',
      ratchetHeader,
      disappearingTimerSec: seconds
    };

    this.seenPacketIds.add(packetId);
    let mySeqSet = this.seenSequences.get(this.user.id);
    if (!mySeqSet) {
      mySeqSet = new Set();
      this.seenSequences.set(this.user.id, mySeqSet);
    }
    mySeqSet.add(seq);

    void this.signAndEmitWirePacket(wirePacket);

    this.disappearingTimerListeners.forEach(fn => fn(seconds));
  }

  public sendTyping(isTyping: boolean): void {
    const prefs = getPrivacyPreferences();
    if (!prefs.typingIndicators || this.isDestroyed || !this.isSessionOwner || this.participants.size > 2) return;

    const now = Date.now();
    // Throttle repeated true packets within 2000ms
    if (isTyping && this.lastTypingSentState && (now - this.lastTypingSentTime < 2000)) {
      return;
    }
    // Don't send redundant false packets if already not typing
    if (!isTyping && !this.lastTypingSentState) {
      return;
    }

    this.lastTypingSentState = isTyping;
    this.lastTypingSentTime = now;

    void (async () => {
      const now = Date.now();
      const seq = this.sendSequence++;
      const packetId = generateSecureId('pkt', 8);

      let encryptedPayload = {
        ciphertext: 'typing',
        iv: 'transient',
        sequence: seq,
        timestamp: now
      };

      if (this.senderKey) {
        try {
          encryptedPayload = await encryptMessage(
            this.senderKey,
            JSON.stringify({ isTyping }),
            this.roomId,
            packetId,
            this.user.id,
            seq,
            now,
            1
          );
        } catch {}
      }

      const wirePacket: WirePacket = {
        version: 1,
        packetId,
        roomId: this.roomId,
        senderId: this.user.id,
        senderName: this.user.displayName,
        sequence: seq,
        timestamp: now,
        payload: encryptedPayload,
        type: 'typing_indicator',
        isTyping,
        typingData: { isTyping }
      };

      this.seenPacketIds.add(packetId);

      void this.signAndEmitWirePacket(wirePacket);
    })();
  }

  public onTypingChange(fn: TypingListener): () => void {
    this.typingListeners.add(fn);
    return () => this.typingListeners.delete(fn);
  }

  public async downloadAndDecryptMedia(
    mediaId: string,
    mimeType: string,
    timestamp: number,
    senderId: string
  ): Promise<string> {
    if (this.isDestroyed) {
      throw new Error('Room is destroyed');
    }

    const authHeaders = await this.getAuthHeaders('GET', `/api/rooms/${this.roomId}/media`);
    const downloadHeaders: Record<string, string> = { ...authHeaders };

    // Try fetching with up to 3 attempts in case of slight network latency
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(`/api/rooms/${this.roomId}/media?mediaId=${encodeURIComponent(mediaId)}`, {
          headers: downloadHeaders,
          cache: 'no-store'
        });
        if (res.ok) break;
      } catch {
        // Network error retry
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }

    if (!res || !res.ok) {
      throw new Error(`Media fetch failed: status ${res?.status || 'unknown'}`);
    }

    const data = await res.json();
    const mediaPayload = (data && data.media) ? data.media : data;
    if (!mediaPayload || !mediaPayload.ciphertext || !mediaPayload.iv) {
      throw new Error('Malformed or empty encrypted media bundle received from relay');
    }

    const key = senderId === this.user.id ? this.senderKey : await this.getReceiverKey(senderId);
    if (!key) {
      throw new Error('No decryption key available for sender');
    }

    const cleanMime = (mediaPayload.mimeType || mimeType || '').toLowerCase();
    const primaryTimestamp = typeof mediaPayload.timestamp === 'number' && !isNaN(mediaPayload.timestamp)
      ? mediaPayload.timestamp
      : timestamp;

    let decryptedBytes: Uint8Array;
    try {
      decryptedBytes = await decryptMediaBlob(
        key,
        {
          iv: mediaPayload.iv,
          ciphertext: mediaPayload.ciphertext,
          mimeType: cleanMime,
          timestamp: primaryTimestamp
        },
        this.roomId,
        mediaId,
        1
      );
    } catch (primaryErr) {
      // If primary timestamp failed and packet timestamp is provided and different, fallback to packet timestamp
      if (timestamp && timestamp !== primaryTimestamp) {
        decryptedBytes = await decryptMediaBlob(
          key,
          {
            iv: mediaPayload.iv,
            ciphertext: mediaPayload.ciphertext,
            mimeType: cleanMime,
            timestamp
          },
          this.roomId,
          mediaId,
          1
        );
      } else {
        throw primaryErr;
      }
    }

    const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: cleanMime });
    const objectUrl = URL.createObjectURL(blob);
    this.activeObjectUrls.add(objectUrl);
    return objectUrl;
  }

  public async decryptConsumedMedia(
    mediaId: string,
    mediaPayload: { ciphertext: string; iv: string; mimeType: string; timestamp?: number },
    timestamp: number,
    senderId: string
  ): Promise<string> {
    if (this.isDestroyed) {
      throw new Error('Room is destroyed');
    }

    const key = senderId === this.user.id ? this.senderKey : await this.getReceiverKey(senderId);
    if (!key) {
      throw new Error('No decryption key available for sender');
    }

    const cleanMime = (mediaPayload.mimeType || '').toLowerCase();
    const primaryTimestamp = typeof mediaPayload.timestamp === 'number' && !isNaN(mediaPayload.timestamp)
      ? mediaPayload.timestamp
      : timestamp;

    let decryptedBytes: Uint8Array;
    try {
      decryptedBytes = await decryptMediaBlob(
        key,
        {
          iv: mediaPayload.iv,
          ciphertext: mediaPayload.ciphertext,
          mimeType: cleanMime,
          timestamp: primaryTimestamp
        },
        this.roomId,
        mediaId,
        1
      );
    } catch (primaryErr) {
      if (timestamp && timestamp !== primaryTimestamp) {
        decryptedBytes = await decryptMediaBlob(
          key,
          {
            iv: mediaPayload.iv,
            ciphertext: mediaPayload.ciphertext,
            mimeType: cleanMime,
            timestamp
          },
          this.roomId,
          mediaId,
          1
        );
      } else {
        throw primaryErr;
      }
    }

    const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: cleanMime });
    const objectUrl = URL.createObjectURL(blob);
    this.activeObjectUrls.add(objectUrl);
    return objectUrl;
  }

  public async sendReaction(
    targetMessageId: string,
    emoji: string,
    action: 'add' | 'remove' = 'add'
  ): Promise<void> {
    if (this.isDestroyed) return;
    if (!this.isSessionOwner) {
      throw new Error('This tab has lost session ownership. An active session is open in another tab.');
    }
    const opGen = this.currentOwnershipGeneration;
    if (this.participants.size > 2) {
      throw new Error('Room participant limit exceeded. Enclave rooms support a maximum of two participants for pairwise cryptographic assurance.');
    }

    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();
    const rxPayload = JSON.stringify({ targetMessageId, emoji, action });

    const remotePeer = Array.from(this.participants.values()).find(p => p.id !== this.user.id);
    let encryptedPayload: EncryptedPayload;
    let ratchetHeader: RatchetHeader | undefined;

    if (remotePeer) {
      const ratchet = await this.getOrCreateRatchetSession(
        remotePeer.id,
        remotePeer.prekey,
        remotePeer.identityKey,
        true,
        remotePeer.prekeySignature
      );
      const ratchetRes = await ratchet.ratchetEncrypt(rxPayload);
      encryptedPayload = {
        ciphertext: ratchetRes.ciphertext,
        iv: ratchetRes.iv,
        sequence: seq,
        timestamp: now
      };
      ratchetHeader = ratchetRes.ratchetHeader;
    } else if (this.senderKey) {
      encryptedPayload = await encryptMessage(
        this.senderKey,
        rxPayload,
        this.roomId,
        packetId,
        this.user.id,
        seq,
        now,
        1
      );
    } else {
      return;
    }

    if (!this.isSessionOwner || this.currentOwnershipGeneration !== opGen) {
      throw new Error('Aborted: Tab lost active ratchet ownership during operation.');
    }

    const wirePacket: WirePacket = {
      version: ratchetHeader ? 2 : 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'reaction',
      ratchetHeader,
      reactionData: {
        targetMessageId,
        emoji,
        action
      }
    };

    // Mark outgoing packet as seen locally to prevent self-echo duplicate processing
    this.seenPacketIds.add(packetId);
    let myRxSeqSet = this.seenSequences.get(this.user.id);
    if (!myRxSeqSet) {
      myRxSeqSet = new Set();
      this.seenSequences.set(this.user.id, myRxSeqSet);
    }
    myRxSeqSet.add(seq);

    void this.signAndEmitWirePacket(wirePacket);

    // Notify local reaction listeners
    this.reactionListeners.forEach(fn =>
      fn({
        targetMessageId,
        emoji,
        action,
        userId: this.user.id,
        userName: this.user.displayName
      })
    );
  }

  public onCallSignal(fn: CallSignalListener): () => void {
    this.callSignalListeners.add(fn);
    return () => {
      this.callSignalListeners.delete(fn);
    };
  }

  public setCallActive(active: boolean): void {
    this.isCallActive = active;
    if (active) {
      if (!this.callFastSyncInterval) {
        this.callFastSyncInterval = setInterval(() => {
          if (this.isDestroyed || !this.isCallActive) {
            if (this.callFastSyncInterval) clearInterval(this.callFastSyncInterval);
            this.callFastSyncInterval = null;
            return;
          }
          void this.pollRelayPackets();
        }, 400);
      }
    } else {
      if (this.callFastSyncInterval) {
        clearInterval(this.callFastSyncInterval);
        this.callFastSyncInterval = null;
      }
    }
  }

  public async sendCallSignal(signal: CallSignalPayload): Promise<void> {
    if (this.isDestroyed) return;
    if (!this.isSessionOwner) {
      throw new Error('This tab has lost session ownership. An active session is open in another tab.');
    }
    const opGen = this.currentOwnershipGeneration;
    if (this.participants.size > 2) {
      throw new Error('Room participant limit exceeded. Enclave rooms support a maximum of two participants for pairwise cryptographic assurance.');
    }

    const packetId = generateSecureId('sig', 8);
    const seq = this.sendSequence++;
    const now = Date.now();
    const signalStr = JSON.stringify(signal);

    const remotePeer = Array.from(this.participants.values()).find(p => p.id !== this.user.id);
    let encryptedPayload: EncryptedPayload;
    let ratchetHeader: RatchetHeader | undefined;

    if (remotePeer) {
      const ratchet = await this.getOrCreateRatchetSession(
        remotePeer.id,
        remotePeer.prekey,
        remotePeer.identityKey,
        true,
        remotePeer.prekeySignature
      );
      const ratchetRes = await ratchet.ratchetEncrypt(signalStr);
      encryptedPayload = {
        ciphertext: ratchetRes.ciphertext,
        iv: ratchetRes.iv,
        sequence: seq,
        timestamp: now
      };
      ratchetHeader = ratchetRes.ratchetHeader;
    } else if (this.senderKey) {
      encryptedPayload = await encryptMessage(
        this.senderKey,
        signalStr,
        this.roomId,
        packetId,
        this.user.id,
        seq,
        now,
        1
      );
    } else {
      return;
    }

    if (!this.isSessionOwner || this.currentOwnershipGeneration !== opGen) {
      throw new Error('Aborted: Tab lost active ratchet ownership during operation.');
    }

    const wirePacket: WirePacket = {
      version: ratchetHeader ? 2 : 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'call_signal',
      ratchetHeader
    };

    this.seenPacketIds.add(packetId);

    void this.signAndEmitWirePacket(wirePacket);

    // Trigger immediate poll so responses are received swiftly (except high-frequency ice candidates)
    if (signal.signalType !== 'ice_candidate') {
      void this.pollRelayPackets();
    }
  }

  public triggerPoll(): Promise<void> {
    return this.pollRelayPackets();
  }

  public async joinRoomPresence(): Promise<void> {
    await this.syncWithServerRelay('join');
  }

  public getAuthCommitment(): string | null {
    return this.authCommitment;
  }

  public async leaveRoom(): Promise<void> {
    if (this.isDestroyed) return;

    this.broadcast({
      type: 'presence_leave',
      participantId: this.user.id
    });

    this.participants.delete(this.user.id);
    await this.syncWithServerRelay('leave');

    if (this.participants.size === 0) {
      this.broadcast({
        type: 'room_destruction_triggered',
        reason: 'Final participant left the Enclave.'
      });
      await this.syncWithServerRelay('destroy');
    }

    this.zeroizeAndCleanup();
  }

  /**
   * Cleans up local timers, network polling, channels, and keys silently.
   * Does NOT broadcast dissolution or trigger UI dissolution listeners.
   */
  public cleanup(): void {
    this.zeroizeAndCleanup();
  }

  public destroyRoomSession(reason: string): void {
    this.handleRoomDestroyed(reason);
  }

  public async forceDestroy(): Promise<void> {
    if (this.isDestroyed) return;

    this.broadcast({
      type: 'room_destruction_triggered',
      reason: 'Manual room obliteration requested.'
    });

    try {
      const authHeaders = await this.getAuthHeaders('DELETE', `/api/rooms/${this.roomId}`);
      const headers: Record<string, string> = { ...authHeaders };
      await fetch(`/api/rooms/${this.roomId}`, {
        method: 'DELETE',
        headers
      });
    } catch {}

    await this.syncWithServerRelay('destroy');
    this.handleRoomDestroyed('Room intentionally destroyed.');
  }

  public triggerFastPollingBurst(durationMs = 6000): void {
    if (this.isDestroyed) return;
    void this.pollRelayPackets();
    if (this.fastBurstTimeout) clearTimeout(this.fastBurstTimeout);
    if (!this.fastBurstInterval) {
      this.fastBurstInterval = setInterval(() => {
        if (this.isDestroyed) {
          if (this.fastBurstInterval) clearInterval(this.fastBurstInterval);
          this.fastBurstInterval = null;
          return;
        }
        void this.pollRelayPackets();
      }, 250);
    }
    this.fastBurstTimeout = setTimeout(() => {
      if (this.fastBurstInterval) {
        clearInterval(this.fastBurstInterval);
        this.fastBurstInterval = null;
      }
      this.fastBurstTimeout = null;
    }, durationMs);
  }

  private startSyncLoop() {
    let tickCount = 0;
    this.syncInterval = setInterval(async () => {
      if (this.isDestroyed) return;
      tickCount++;

      // Poll packets on every tick (450ms for low latency delivery)
      await this.pollRelayPackets();

      // High-responsiveness presence discovery:
      // When alone in room (waiting for peer), sync presence on every 2 ticks (~900ms)!
      // Once mutual presence is confirmed (2+ participants), relax to every 6 ticks (~2.7s).
      const shouldSyncPresence = this.participants.size < 2 ? tickCount % 2 === 0 : tickCount % 6 === 0;
      if (shouldSyncPresence) {
        this.broadcast({
          type: 'presence_heartbeat',
          participant: {
            id: this.user.id,
            displayName: this.user.displayName,
            joinedAt: this.user.joinedAt,
            identityKey: this.user.identityKey,
            prekey: this.user.prekey,
            prekeySignature: this.user.prekeySignature
          }
        });
        await this.syncWithServerRelay('heartbeat');
      }
    }, 450);
  }

  private broadcast(message: unknown) {
    if (this.channel && !this.isDestroyed) {
      try {
        this.channel.postMessage(message);
      } catch {
        // Channel closed
      }
    }
  }

  private notifyPresence() {
    const list = Array.from(this.participants.values());
    this.presenceListeners.forEach(fn => fn(list, this.state));
  }

  private zeroizeAndCleanup() {
    this.isDestroyed = true;
    this.state = 'DESTROYED';

    if (this.roomMasterSecret) {
      zeroizeBuffer(this.roomMasterSecret);
      this.roomMasterSecret = null;
    }

    this.senderKey = null;
    this.receiverKeys.clear();
    this.seenSequences.clear();
    this.seenPacketIds.clear();
    this.lastTypingSentState = false;
    this.lastTypingSentTime = 0;

    if (this.leaseHeartbeatInterval) {
      clearInterval(this.leaseHeartbeatInterval);
      this.leaseHeartbeatInterval = null;
    }
    if (typeof window !== 'undefined') {
      try {
        const leaseKey = this.getLeaseStorageKey();
        const raw = localStorage.getItem(leaseKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.tabSessionId === this.tabSessionId) {
            localStorage.removeItem(leaseKey);
          }
        }
      } catch {}
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.callFastSyncInterval) {
      clearInterval(this.callFastSyncInterval);
      this.callFastSyncInterval = null;
    }
    this.isCallActive = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.participants.clear();

    // Revoke all created Object URLs from memory
    this.activeObjectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    this.activeObjectUrls.clear();
  }

  public onReaction(fn: ReactionListener) {
    this.reactionListeners.add(fn);
    return () => this.reactionListeners.delete(fn);
  }

  public onReceipt(fn: ReceiptListener) {
    this.receiptListeners.add(fn);
    return () => this.receiptListeners.delete(fn);
  }

  public onMessage(fn: MessageListener) {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  public onPresence(fn: PresenceListener) {
    this.presenceListeners.add(fn);
    fn(Array.from(this.participants.values()), this.state);
    return () => this.presenceListeners.delete(fn);
  }

  public onDissolution(fn: DissolutionListener) {
    this.dissolutionListeners.add(fn);
    return () => this.dissolutionListeners.delete(fn);
  }

  public onRawPacket(fn: RawPacketListener) {
    this.rawPacketListeners.add(fn);
    return () => this.rawPacketListeners.delete(fn);
  }

  public getParticipantCount(): number {
    return this.participants.size;
  }

  public getState(): RoomLifecycleState {
    return this.state;
  }
}
