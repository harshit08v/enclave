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

export interface RoomMeta {
  id: string; // Random public identifier (e.g. '8f92-c0e4')
  salt: string; // Base64 salt for Argon2id KDF
  authCommitment: string; // SHA-256 hash commitment of derived auth key
  wrappedSecretBundle: WrappedSecretBundle; // AES-GCM-wrapped Room Master Secret
  createdAt: number;
  oneTimeAccess: boolean;
  participantCount: number;
  state: RoomLifecycleState;
  accessCount: number;
  destroyedAt?: number;
  accessMode?: 'with_pass' | 'without_pass';
  requirePass?: boolean;
  lastActivity?: number;
  inactivityLimitMs?: number;
  warningThresholdMs?: number;
  serverTime?: number;
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
}

export interface WirePacket {
  version: 1;
  packetId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  sequence: number;
  timestamp: number;
  payload: EncryptedPayload;
  type: 'chat_message' | 'media_message' | 'reaction' | 'system_notice' | 'typing_indicator' | 'presence_leave';
  mediaMeta?: MessageMediaMeta;
  replyTo?: MessageReplyMeta;
  reactionData?: {
    targetMessageId: string;
    emoji: string;
    action: 'add' | 'remove';
  };
}

export interface RoomParticipant {
  id: string;
  displayName: string;
  joinedAt: number;
  isSelf?: boolean;
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
  mediaMeta?: MessageMediaMeta;
  replyTo?: MessageReplyMeta;
  reactions?: MessageReaction[];
}

