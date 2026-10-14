/**
 * ENCLAVE Room Relay & State Coordinator — Hardened V1
 * Synchronizes room presence, directional key derivation, wire packet authentication,
 * sequence replay protection, and destruction state machine across tabs and network.
 */

import {
  WirePacket,
  RoomParticipant,
  DecryptedMessage,
  RoomLifecycleState,
  MessageReplyMeta,
  MessageMediaMeta,
  CallSignalPayload
} from '@/packages/protocol';
import {
  EnclaveCryptoKey,
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
export type CallSignalListener = (signal: CallSignalPayload) => void;
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

export class EnclaveRoomSession {
  public roomId: string;
  public user: RoomParticipant;
  private authCommitment: string | null = null;
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
  public isCallActive = false;
  private activeObjectUrls: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private callFastSyncInterval: NodeJS.Timeout | null = null;
  private lastPolledTimestamp = 0;
  private lastPolledCursor = 0;
  private isPolling = false;
  private isDestroyed = false;

  constructor(roomId: string, user: RoomParticipant, roomMasterSecret: Uint8Array, authCommitment?: string) {
    this.roomId = roomId;
    this.user = { ...user, isSelf: true };
    this.authCommitment = authCommitment || null;
    this.roomMasterSecret = new Uint8Array(roomMasterSecret);
    this.lastPolledTimestamp = Date.now() - 5000;

    this.participants.set(user.id, this.user);
    this.initSessionKeys();
    this.initBroadcastChannel();
    this.startSyncLoop();
  }

  private async initSessionKeys() {
    if (!this.roomMasterSecret) return;
    this.senderKey = await deriveEphemeralSessionKey(this.roomMasterSecret, this.user.id);
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
        joinedAt: this.user.joinedAt
      }
    });

    // Also notify API relay
    this.syncWithServerRelay('join');
  }

  private async syncWithServerRelay(action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here') {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.authCommitment) {
        headers['Authorization'] = `Bearer ${this.authCommitment}`;
      }
      const res = await fetch(`/api/rooms/${this.roomId}/presence`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          participantId: this.user.id,
          displayName: this.user.displayName
        })
      });
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
              this.participants.set(p.id, {
                id: p.id,
                displayName: p.displayName || 'Anonymous',
                joinedAt: p.joinedAt || Date.now(),
                isSelf: false
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
      const headers: Record<string, string> = {};
      if (this.authCommitment) {
        headers['Authorization'] = `Bearer ${this.authCommitment}`;
      }

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
    if (this.isDestroyed) return;
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

      // Check if packet is a call signal
      if (packet.type === 'call_signal') {
        try {
          const signal: CallSignalPayload = packet.callSignalData || JSON.parse(plaintext);
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
        mediaMeta: packet.mediaMeta
      };

      this.messageListeners.forEach(fn => fn(message));

      // If incoming message from remote participant, send delivery receipt
      if (!isSelf) {
        this.sendReceipt(packet.packetId, 'delivered').catch(() => {});
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.sendReceipt(packet.packetId, 'read').catch(() => {});
        }
      }
    } catch (err) {
      // Decryption failed or tag mismatched: do NOT leak plaintext or stack trace
    }
  }

  public async sendReceipt(targetMessageId: string, status: 'delivered' | 'read'): Promise<void> {
    if (this.isDestroyed || !this.senderKey) return;

    const packetId = generateSecureId('pkt', 8);
    const seq = this.sendSequence++;
    const now = Date.now();

    const encryptedPayload = await encryptMessage(
      this.senderKey,
      JSON.stringify({ targetMessageId, status }),
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
      type: status === 'read' ? 'receipt_read' : 'receipt_delivered',
      receiptData: {
        targetMessageId,
        status
      }
    };

    this.seenPacketIds.add(packetId);

    this.broadcast({
      type: 'encrypted_wire_packet',
      packet: wirePacket
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authCommitment) {
      headers['Authorization'] = `Bearer ${this.authCommitment}`;
    }
    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers,
      body: JSON.stringify(wirePacket)
    }).catch(() => {});
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
    const relayHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authCommitment) {
      relayHeaders['Authorization'] = `Bearer ${this.authCommitment}`;
    }
    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers: relayHeaders,
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
      status: 'sent',
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
    const uploadHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authCommitment) {
      uploadHeaders['Authorization'] = `Bearer ${this.authCommitment}`;
    }
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
    const mediaRelayHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authCommitment) {
      mediaRelayHeaders['Authorization'] = `Bearer ${this.authCommitment}`;
    }
    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers: mediaRelayHeaders,
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
      status: 'sent',
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

    const downloadHeaders: Record<string, string> = {};
    if (this.authCommitment) {
      downloadHeaders['Authorization'] = `Bearer ${this.authCommitment}`;
    }

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

    const rxRelayHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authCommitment) {
      rxRelayHeaders['Authorization'] = `Bearer ${this.authCommitment}`;
    }
    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers: rxRelayHeaders,
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
    if (this.isDestroyed || !this.senderKey) return;

    const packetId = generateSecureId('sig', 8);
    const seq = this.sendSequence++;
    const now = Date.now();

    const encryptedPayload = await encryptMessage(
      this.senderKey,
      JSON.stringify(signal),
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
      type: 'call_signal',
      callSignalData: signal
    };

    this.seenPacketIds.add(packetId);

    // Broadcast across local browser contexts/tabs
    this.broadcast({
      type: 'encrypted_wire_packet',
      packet: wirePacket
    });

    // Notify API server relay
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authCommitment) {
      headers['Authorization'] = `Bearer ${this.authCommitment}`;
    }
    fetch(`/api/rooms/${this.roomId}/relay`, {
      method: 'POST',
      headers,
      body: JSON.stringify(wirePacket)
    }).catch(() => {});

    // Trigger immediate poll so responses are received swiftly
    void this.pollRelayPackets();
  }

  public triggerPoll(): Promise<void> {
    return this.pollRelayPackets();
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

    // Call DELETE API and sync destroy
    const headers: Record<string, string> = {};
    if (this.authCommitment) {
      headers['Authorization'] = `Bearer ${this.authCommitment}`;
    }

    try {
      await fetch(`/api/rooms/${this.roomId}`, {
        method: 'DELETE',
        headers
      });
    } catch {}

    await this.syncWithServerRelay('destroy');
    this.handleRoomDestroyed('Room intentionally destroyed.');
  }

  private startSyncLoop() {
    let tickCount = 0;
    this.syncInterval = setInterval(async () => {
      if (this.isDestroyed) return;
      tickCount++;

      // Poll packets on every tick (1s)
      await this.pollRelayPackets();

      // Presence heartbeat every 3 ticks (3s)
      if (tickCount % 3 === 0) {
        this.broadcast({
          type: 'presence_heartbeat',
          participant: {
            id: this.user.id,
            displayName: this.user.displayName,
            joinedAt: this.user.joinedAt
          }
        });
        await this.syncWithServerRelay('heartbeat');
      }
    }, 1000);
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
