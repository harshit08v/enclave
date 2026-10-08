/**
 * ENCLAVE Room Relay & State Coordinator — Hardened V1
 * Synchronizes room presence, directional key derivation, wire packet authentication,
 * sequence replay protection, and destruction state machine across tabs and network.
 */

import {
  RoomMeta,
  WirePacket,
  RoomParticipant,
  DecryptedMessage,
  RoomLifecycleState,
  MessageReplyMeta,
  MessageReaction,
  MessageMediaMeta
} from '@/packages/protocol';
import {
  EncryptedPayload,
  encryptMessage,
  decryptMessage,
  deriveEphemeralSessionKey,
  generateSecureId,
  zeroizeBuffer,
  encryptMediaBlob,
  decryptMediaBlob
} from '@/packages/crypto';
import { validateMediaFile } from '@/lib/mediaConfig';

export type MessageListener = (message: DecryptedMessage) => void;
export type PresenceListener = (participants: RoomParticipant[], state: RoomLifecycleState) => void;
export type DissolutionListener = (reason: string) => void;
export type RawPacketListener = (packet: WirePacket) => void;
export type ReactionListener = (reaction: {
  targetMessageId: string;
  emoji: string;
  action: 'add' | 'remove';
  userId: string;
  userName: string;
}) => void;

export class EnclaveRoomSession {
  public roomId: string;
  public user: RoomParticipant;
  private roomMasterSecret: Uint8Array | null = null;
  private senderKey: CryptoKey | null = null;
  private receiverKeys: Map<string, CryptoKey> = new Map();
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
  private activeObjectUrls: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(roomId: string, user: RoomParticipant, roomMasterSecret: Uint8Array) {
    this.roomId = roomId;
    this.user = { ...user, isSelf: true };
    this.roomMasterSecret = new Uint8Array(roomMasterSecret);

    this.participants.set(user.id, this.user);
    this.initSessionKeys();
    this.initBroadcastChannel();
    this.startHeartbeat();
  }

  private async initSessionKeys() {
    if (!this.roomMasterSecret) return;
    this.senderKey = await deriveEphemeralSessionKey(this.roomMasterSecret, this.user.id);
  }

  private async getReceiverKey(senderId: string): Promise<CryptoKey | null> {
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

    // Announce presence immediately
    this.broadcast({
      type: 'presence_announce',
      participant: {
        id: this.user.id,
        displayName: this.user.displayName,
        joinedAt: this.user.joinedAt
      }
    });

    // Also notify API relay
    this.syncWithServerRelay('join');
  }

  private async syncWithServerRelay(action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here') {
    try {
      const res = await fetch(`/api/rooms/${this.roomId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          participantId: this.user.id,
          displayName: this.user.displayName
        })
      });
      if (res.status === 410 || res.status === 404) {
        this.handleRoomDestroyed('Room has completed its lifecycle and is destroyed.');
      }
    } catch {
      // Offline / Local fallback handles via BroadcastChannel
    }
  }

  public async sendImHere(): Promise<void> {
    this.broadcast({
      type: 'presence_heartbeat',
      participant: {
        id: this.user.id,
        displayName: this.user.displayName,
        joinedAt: this.user.joinedAt
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
        joinedAt: this.user.joinedAt
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
    this.state = 'DESTROYED';
    this.dissolutionListeners.forEach(fn => fn(reason));
    this.zeroizeAndCleanup();
  }

  private async handleIncomingPacket(packet: WirePacket) {
    if (packet.roomId !== this.roomId || this.isDestroyed) return;

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

    this.rawPacketListeners.forEach(fn => fn(packet));

    try {
      const isSelf = packet.senderId === this.user.id;
      const key = isSelf ? this.senderKey : await this.getReceiverKey(packet.senderId);
      if (!key) throw new Error('No session key available');

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

      // Decrypt message verifying Canonical AAD
      const plaintext = await decryptMessage(
        key,
        packet.payload,
        this.roomId,
        packet.packetId,
        packet.senderId,
        packet.version
      );

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
        replyTo: packet.replyTo,
        mediaMeta: packet.mediaMeta
      };

      this.messageListeners.forEach(fn => fn(message));
    } catch (err) {
      // Decryption failed or tag mismatched: do NOT leak plaintext or stack trace
    }
  }

  public async sendMessage(text: string, replyTo?: MessageReplyMeta): Promise<DecryptedMessage> {
    if (this.isDestroyed || !this.senderKey) {
      throw new Error('Enclave session is inactive or destroyed');
    }

    const trimmed = text.trim();
    if (!trimmed) throw new Error('Cannot send empty message');

    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();

    const encryptedPayload = await encryptMessage(
      this.senderKey,
      trimmed,
      this.roomId,
      packetId,
      this.user.id,
      seq,
      now,
      1
    );

    const wirePacket: WirePacket = {
      version: 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'chat_message',
      replyTo
    };

    // Mark outgoing packet as seen locally to prevent self-echo duplicate processing
    this.seenPacketIds.add(packetId);
    let mySeqSet = this.seenSequences.get(this.user.id);
    if (!mySeqSet) {
      mySeqSet = new Set();
      this.seenSequences.set(this.user.id, mySeqSet);
    }
    mySeqSet.add(seq);

    // Broadcast across local browser contexts/tabs
    this.broadcast({
      type: 'encrypted_wire_packet',
      packet: wirePacket
    });

    // Notify API server relay for external network tabs
    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wirePacket)
    }).catch(() => {});

    const localMessage: DecryptedMessage = {
      id: packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      text: trimmed,
      timestamp: now,
      isSelf: true,
      rawPayload: encryptedPayload,
      replyTo
    };

    this.rawPacketListeners.forEach(fn => fn(wirePacket));
    return localMessage;
  }

  public async sendMediaMessage(
    file: File,
    caption?: string,
    replyTo?: MessageReplyMeta
  ): Promise<DecryptedMessage> {
    if (this.isDestroyed || !this.senderKey) {
      throw new Error('Enclave session is inactive or destroyed');
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
    const uploadRes = await fetch(`/api/rooms/${this.roomId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const encryptedPayload = await encryptMessage(
      this.senderKey,
      trimmedCaption,
      this.roomId,
      packetId,
      this.user.id,
      seq,
      now,
      1
    );

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
      loadingState: 'ready'
    };

    const wirePacket: WirePacket = {
      version: 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'media_message',
      mediaMeta: {
        ...mediaMeta,
        localBlobUrl: undefined // Recipient will derive their own local blob URL after downloading/decrypting
      },
      replyTo
    };

    // Mark outgoing packet as seen locally to prevent self-echo duplicate processing
    this.seenPacketIds.add(packetId);
    let myMediaSeqSet = this.seenSequences.get(this.user.id);
    if (!myMediaSeqSet) {
      myMediaSeqSet = new Set();
      this.seenSequences.set(this.user.id, myMediaSeqSet);
    }
    myMediaSeqSet.add(seq);

    // Broadcast across local browser contexts/tabs
    this.broadcast({
      type: 'encrypted_wire_packet',
      packet: wirePacket
    });

    // Notify API server relay
    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wirePacket)
    }).catch(() => {});

    const localMessage: DecryptedMessage = {
      id: packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      text: trimmedCaption,
      timestamp: now,
      isSelf: true,
      rawPayload: encryptedPayload,
      mediaMeta,
      replyTo
    };

    this.rawPacketListeners.forEach(fn => fn(wirePacket));
    return localMessage;
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

    const res = await fetch(`/api/rooms/${this.roomId}/media?mediaId=${encodeURIComponent(mediaId)}`);
    if (!res.ok) {
      throw new Error(`Media fetch failed: status ${res.status}`);
    }

    const data = await res.json();
    const key = senderId === this.user.id ? this.senderKey : await this.getReceiverKey(senderId);
    if (!key) {
      throw new Error('No decryption key available for sender');
    }

    const decryptedBytes = await decryptMediaBlob(
      key,
      {
        iv: data.iv,
        ciphertext: data.ciphertext,
        mimeType: data.mimeType || mimeType,
        timestamp: data.timestamp || timestamp
      },
      this.roomId,
      mediaId,
      1
    );

    const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    this.activeObjectUrls.add(objectUrl);
    return objectUrl;
  }

  public async sendReaction(
    targetMessageId: string,
    emoji: string,
    action: 'add' | 'remove' = 'add'
  ): Promise<void> {
    if (this.isDestroyed || !this.senderKey) return;

    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();

    const encryptedPayload = await encryptMessage(
      this.senderKey,
      JSON.stringify({ targetMessageId, emoji, action }),
      this.roomId,
      packetId,
      this.user.id,
      seq,
      now,
      1
    );

    const wirePacket: WirePacket = {
      version: 1,
      packetId,
      roomId: this.roomId,
      senderId: this.user.id,
      senderName: this.user.displayName,
      sequence: seq,
      timestamp: now,
      payload: encryptedPayload,
      type: 'reaction',
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

    this.broadcast({
      type: 'encrypted_wire_packet',
      packet: wirePacket
    });

    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wirePacket)
    }).catch(() => {});

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

  public async leaveRoom(): Promise<void> {
    if (this.isDestroyed) return;

    this.broadcast({
      type: 'presence_leave',
      participantId: this.user.id
    });

    this.participants.delete(this.user.id);
    this.syncWithServerRelay('leave');

    if (this.participants.size === 0) {
      this.broadcast({
        type: 'room_destruction_triggered',
        reason: 'Final participant left the Enclave.'
      });
      this.syncWithServerRelay('destroy');
    }

    this.zeroizeAndCleanup();
  }

  public destroyRoomSession(reason: string): void {
    this.handleRoomDestroyed(reason);
  }

  public forceDestroy(): void {
    this.broadcast({
      type: 'room_destruction_triggered',
      reason: 'Manual room obliteration requested.'
    });
    this.syncWithServerRelay('destroy');
    this.handleRoomDestroyed('Room intentionally destroyed.');
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.broadcast({
        type: 'presence_heartbeat',
        participant: {
          id: this.user.id,
          displayName: this.user.displayName,
          joinedAt: this.user.joinedAt
        }
      });
      this.syncWithServerRelay('heartbeat');
    }, 10000);
  }

  private broadcast(message: any) {
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
