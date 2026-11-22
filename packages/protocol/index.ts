/**
 * ENCLAVE Protocol Package — Hardened V1
 * Defines formal room lifecycle state machine, wire packet framing, presence models, and envelope schemas.
 */

import type { EncryptedPayload, WrappedSecretBundle } from '../crypto';

export type { EncryptedPayload, WrappedSecretBundle };

export type RoomLifecycleState =
  | 'CREATED'
  | 'WAITING'
  | 'ACTIVE'
  | 'ENDING'
  | 'DESTROYING'
  | 'DESTROYED';

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface RoomMeta {
  id: string; // Random public identifier (e.g. '8f92-c0e4')
  salt: string; // Base64 salt for Argon2id KDF
  authCommitment?: string; // Legacy/internal only: NEVER returned by public GET endpoints
  adminPublicKey?: string; // Ed25519 creator public key (hex) for authenticated room destruction
  relayAuthKey?: string; // Server-held scoped HMAC relay auth key (internal server record only)
  wrappedSecretBundle: WrappedSecretBundle; // AES-GCM-wrapped Room Master Secret
  createdAt: number;
  oneTimeAccess: boolean;
  participantCount: number;
  state: RoomLifecycleState;
  accessCount: number;
  destroyedAt?: number;
  accessMode?: 'with_pass' | 'without_pass';
  requirePass?: boolean;
  creatorId?: string;
  lastActivity?: number;
  inactivityLimitMs?: number;
  warningThresholdMs?: number;
  serverTime?: number;
  disappearingTimerSec?: number;
}

export interface MessageReplyMeta {
  id: string;
  senderName: string;
  snippet: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface MessageMediaMeta {
  mediaId: string;
  mediaType: 'image' | 'video';
  mimeType: string;
  fileName?: string;
  size: number;
  duration?: number;
  caption?: string;
  localBlobUrl?: string;
  loadingState?: 'encrypting' | 'uploading' | 'downloading' | 'decrypting' | 'ready' | 'error';
  viewOnce?: boolean;
  viewedAt?: number;
}

export interface RatchetHeader {
  dhPub: string; // Hex-encoded X25519 ephemeral ratchet public key
  pn: number; // Previous sending chain length
  n: number; // Message index in current sending chain
}

export interface WirePacket {
  version: 1 | 2;
  packetId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  sequence: number;
  timestamp: number;
  payload: EncryptedPayload;
  type:
    | 'chat_message'
    | 'media_message'
    | 'reaction'
    | 'receipt_delivered'
    | 'receipt_read'
    | 'system_notice'
    | 'typing_indicator'
    | 'presence_leave'
    | 'call_signal'
    | 'disappearing_timer_update';
  ratchetHeader?: RatchetHeader;
  senderIdentityKey?: string;
  signature?: string;
  callSignalData?: CallSignalPayload;
  receiptData?: {
    targetMessageId: string;
    status: 'delivered' | 'read';
  };
  mediaMeta?: MessageMediaMeta;
  replyTo?: MessageReplyMeta;
  reactionData?: {
    targetMessageId: string;
    emoji: string;
    action: 'add' | 'remove';
  };
  typingData?: {
    isTyping: boolean;
  };
  isTyping?: boolean;
  disappearingTimerSec?: number;
  expiresAt?: number;
  ttlSeconds?: number;
  relaySeq?: number;
}

export interface CallSignalPayload {
  callId: string;
  signalType:
    | 'invite'
    | 'ringing'
    | 'accept'
    | 'decline'
    | 'cancel'
    | 'busy'
    | 'offer'
    | 'answer'
    | 'ice_candidate'
    | 'media_state'
    | 'end';
  callType: 'voice' | 'video';
  callerId: string;
  callerName: string;
  targetUserId?: string;
  sdp?: string;
  candidate?: any;
candidates?: any[];
  mediaState?: {
    isMuted?: boolean;
    isVideoEnabled?: boolean;
    isScreenSharing?: boolean;
  };
  reason?: string;
  timestamp: number;
}

export interface RoomParticipant {
  id: string;
  displayName: string;
  joinedAt: number;
  isSelf?: boolean;
  isGuest?: boolean;
  identityKey?: string; // Hex-encoded Ed25519 identity public key
  prekey?: string;      // Hex-encoded X25519 initial ephemeral ratchet DH public key
  prekeyId?: string;    // Unique identifier for the prekey
  prekeyCreatedAt?: number; // Prekey creation timestamp ms
  prekeyExpiresAt?: number; // Prekey expiration timestamp ms
  prekeySignature?: string; // Hex-encoded Ed25519 signature binding prekey to identityKey
}

export interface DecryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  sequence: number;
  text: string;
  timestamp: number;
  isSelf: boolean;
  rawPayload: EncryptedPayload;
  status?: MessageDeliveryStatus;
  mediaMeta?: MessageMediaMeta;
  replyTo?: MessageReplyMeta;
  reactions?: MessageReaction[];
  expiresAt?: number;
  ttlSeconds?: number;
}

export interface RelayAuthTokenPayload {
  rid: string; // Room ID
  pid: string; // Participant ID
  m: string; // HTTP Method ('GET', 'POST', 'DELETE')
  p: string; // Normalized pathname (e.g. '/api/rooms/abc/relay')
  ts: number; // Timestamp in milliseconds
  nonce: string; // Unique CSPRNG nonce
}

export interface AdminDestructionProofPayload {
  action: 'DESTROY_ROOM';
  roomId: string;
  ts: number;
  nonce: string;
}

