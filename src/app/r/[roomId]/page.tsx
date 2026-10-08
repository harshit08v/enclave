'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  KeyRound,
  ArrowRight,
  ArrowUp,
  MoreHorizontal,
  LogOut,
  Info,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Radio,
  Lock,
  Link2,
  ChevronDown,
  Plus,
  Reply,
  X,
  Loader2,
  Maximize2
} from 'lucide-react';
import { getStoredUser, createAnonymousUser, consumeEphemeralPassTransit, EnclaveUser } from '@/lib/authStore';
import { deriveRoomKeys, unwrapRoomSecret, timingSafeEqual, getOpenAccessPassphrase } from '@/packages/crypto';
import {
  RoomMeta,
  WirePacket,
  DecryptedMessage,
  RoomParticipant,
  RoomLifecycleState,
  MessageReplyMeta
} from '@/packages/protocol';
import { EnclaveRoomSession } from '@/lib/roomRelay';
import CiphertextInspectorModal from '@/components/app/CiphertextInspectorModal';
import RoomDetailsDrawer from '@/components/app/RoomDetailsDrawer';
import LeaveConfirmationModal from '@/components/app/LeaveConfirmationModal';
import MediaPreviewModal from '@/components/app/MediaPreviewModal';
import MediaLightboxModal from '@/components/app/MediaLightboxModal';
import { Button } from '@/components/ui/button';
import { validateMediaFile, formatFileSize } from '@/lib/mediaConfig';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮'];

export default function EnclaveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  // Authentication & Room Metadata
  const [currentUser, setCurrentUser] = useState<EnclaveUser | null>(null);
  const [roomMeta, setRoomMeta] = useState<RoomMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [roomDestroyed, setRoomDestroyed] = useState(false);

  // Join Flow State
  const [accessPass, setAccessPass] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  // Active Session & Chat State
  const [roomSession, setRoomSession] = useState<EnclaveRoomSession | null>(null);
  const roomSessionRef = useRef<EnclaveRoomSession | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [systemNotices, setSystemNotices] = useState<{ id: string; text: string; timestamp: number }[]>([]);
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [roomState, setRoomState] = useState<RoomLifecycleState>('WAITING');
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [sendFailed, setSendFailed] = useState(false);

  // Sprint: Media & Interactions State
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageReplyMeta | null>(null);
  const [lightboxItem, setLightboxItem] = useState<{
    url: string;
    mediaType: 'image' | 'video';
    fileName?: string;
    senderName: string;
    timestamp: number;
  } | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Waiting Room Inactivity & Heartbeat State
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);

  // UI Menus, Drawers & Scroll Controls
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [inspectPacket, setInspectPacket] = useState<WirePacket | null>(null);
  const [latestPacket, setLatestPacket] = useState<WirePacket | null>(null);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Decrypt incoming remote media automatically
  const handleDecryptRemoteMedia = useCallback(
    async (session: EnclaveRoomSession, msg: DecryptedMessage) => {
      if (!msg.mediaMeta || msg.mediaMeta.localBlobUrl || msg.isSelf) return;

      try {
        const url = await session.downloadAndDecryptMedia(
          msg.mediaMeta.mediaId,
          msg.mediaMeta.mimeType,
          msg.timestamp,
          msg.senderId
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  mediaMeta: {
                    ...m.mediaMeta!,
                    localBlobUrl: url,
                    loadingState: 'ready'
                  }
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  mediaMeta: {
                    ...m.mediaMeta!,
                    loadingState: 'error'
                  }
                }
              : m
          )
        );
      }
    },
    []
  );

  // 1. Join Room Handler
  const executeJoin = useCallback(
    async (passToUse: string, meta: RoomMeta, user: EnclaveUser) => {
      setAccessDenied(false);
      setIsVerifying(true);
      setVerificationStep('Deriving keys...');

      try {
        const keyBundle = await deriveRoomKeys(passToUse.trim(), meta.salt);

        if (!timingSafeEqual(keyBundle.authCommitment, meta.authCommitment)) {
          setAccessDenied(true);
          setIsVerifying(false);
          setVerificationStep(null);
          return;
        }

        setVerificationStep('Unwrapping Room Master Secret...');
        await new Promise((r) => setTimeout(r, 100));

        const roomMasterSecret = await unwrapRoomSecret(
          keyBundle.keyWrappingKey,
          meta.wrappedSecretBundle
        );

        setVerificationStep('Establishing ephemeral session keys...');
        await new Promise((r) => setTimeout(r, 100));

        // Clean up any existing session
        if (roomSessionRef.current) {
          roomSessionRef.current.destroyRoomSession('Reconnecting session');
        }

        const session = new EnclaveRoomSession(
          roomId,
          {
            id: user.id,
            displayName: user.displayName,
            joinedAt: Date.now()
          },
          roomMasterSecret
        );

        session.onMessage((msg) => {
          setMessages((prev) => {
            // Deduplicate by message ID
            if (prev.some((m) => m.id === msg.id)) {
              return prev;
            }
            return [...prev, msg];
          });

          // If remote media message, initiate decryption
          if (msg.mediaMeta && !msg.isSelf) {
            handleDecryptRemoteMedia(session, msg);
          }

          const container = messagesContainerRef.current;
          if (container) {
            const isScrolledToBottom =
              container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            if (!isScrolledToBottom) {
              setHasUnreadBelow(true);
            } else {
              setTimeout(() => scrollToBottom(), 50);
            }
          }
        });

        session.onReaction((reactionData) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== reactionData.targetMessageId) return m;

              const existingReactions = m.reactions ? [...m.reactions] : [];
              const rxIndex = existingReactions.findIndex((r) => r.emoji === reactionData.emoji);

              if (reactionData.action === 'add') {
                if (rxIndex >= 0) {
                  const target = existingReactions[rxIndex];
                  if (!target.users.includes(reactionData.userId)) {
                    existingReactions[rxIndex] = {
                      ...target,
                      count: target.count + 1,
                      users: [...target.users, reactionData.userId]
                    };
                  }
                } else {
                  existingReactions.push({
                    emoji: reactionData.emoji,
                    count: 1,
                    users: [reactionData.userId]
                  });
                }
              } else if (reactionData.action === 'remove') {
                if (rxIndex >= 0) {
                  const target = existingReactions[rxIndex];
                  const filteredUsers = target.users.filter((u) => u !== reactionData.userId);
                  if (filteredUsers.length === 0) {
                    existingReactions.splice(rxIndex, 1);
                  } else {
                    existingReactions[rxIndex] = {
                      ...target,
                      count: filteredUsers.length,
                      users: filteredUsers
                    };
                  }
                }
              }

              return {
                ...m,
                reactions: existingReactions
              };
            })
          );
        });

        session.onPresence((list, state) => {
          setParticipants((prev) => {
            if (list.length > prev.length && prev.length > 0) {
              const newMember = list[list.length - 1];
              if (newMember.id !== user.id) {
                setSystemNotices((sn) => [
                  ...sn,
                  { id: `join_${Date.now()}`, text: 'Someone joined the room.', timestamp: Date.now() }
                ]);
              }
            }
            return list;
          });
          setRoomState(state);
          if (list.length >= 2) {
            setShowInactivityWarning(false);
            setSecondsRemaining(null);
          }
        });

        session.onDissolution(() => {
          setRoomDestroyed(true);
          setIsJoined(false);
        });

        session.onRawPacket((packet) => {
          setLatestPacket(packet);
        });

        roomSessionRef.current = session;
        setRoomSession(session);
        setIsJoined(true);
        setIsVerifying(false);
        setConnectionState('connected');
        setLastActivity(Date.now());
        setTimeout(() => scrollToBottom(), 100);
      } catch {
        setAccessDenied(true);
        setIsVerifying(false);
        setVerificationStep(null);
      }
    },
    [roomId, handleDecryptRemoteMedia]
  );

  // 2. Initial Load & Auto-Entry
  useEffect(() => {
    let user = getStoredUser();
    if (!user) {
      user = createAnonymousUser();
    }
    const transitPass = consumeEphemeralPassTransit(roomId);

    const timer = setTimeout(() => {
      setCurrentUser(user);
      if (transitPass) {
        setAccessPass(transitPass);
      }
    }, 0);

    const fetchMeta = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (res.status === 410 || res.status === 404) {
          setRoomDestroyed(true);
          setLoadingMeta(false);
          return;
        }

        const data: RoomMeta = await res.json();
        if (data.state === 'DESTROYED' || data.state === 'DESTROYING') {
          setRoomDestroyed(true);
          setLoadingMeta(false);
          return;
        }

        setRoomMeta(data);
        if (data.lastActivity) {
          setLastActivity(data.lastActivity);
        }

        if (data.requirePass === false) {
          const openPass = getOpenAccessPassphrase(roomId);
          executeJoin(openPass, data, user!);
        } else if (transitPass) {
          executeJoin(transitPass, data, user!);
        }
      } catch {
        setConnectionState('disconnected');
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMeta();
    return () => {
      clearTimeout(timer);
      if (roomSessionRef.current) {
        roomSessionRef.current.destroyRoomSession('Component unmounted');
      }
    };
  }, [roomId, executeJoin]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setHasUnreadBelow(false);
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;
    if (isAtBottom) {
      setHasUnreadBelow(false);
    }
  };

  // 3. Waiting Room Inactivity Countdown Timer
  useEffect(() => {
    if (!isJoined || roomState === 'ACTIVE' || participants.length >= 2 || roomDestroyed) {
      setShowInactivityWarning(false);
      setSecondsRemaining(null);
      return;
    }

    const limitMs = roomMeta?.inactivityLimitMs || 180000;
    const warningMs = roomMeta?.warningThresholdMs || 120000;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));

      setSecondsRemaining(remaining);

      if (remaining <= warningMs / 1000 && remaining > 0) {
        setShowInactivityWarning(true);
      } else {
        setShowInactivityWarning(false);
      }

      if (remaining <= 0) {
        setRoomDestroyed(true);
        if (roomSessionRef.current) {
          roomSessionRef.current.forceDestroy();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isJoined, roomState, participants.length, lastActivity, roomMeta, roomDestroyed]);

  // 4. Activity Refresh ("I'm Here" from Inactivity Warning only)
  const handleImHere = async () => {
    if (roomSessionRef.current) {
      await roomSessionRef.current.sendImHere();
    }
    setLastActivity(Date.now());
    setShowInactivityWarning(false);
  };

  // 5. Submit Access Pass
  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessPass.trim() || !roomMeta || !currentUser) return;
    executeJoin(accessPass.trim(), roomMeta, currentUser);
  };

  // 6. Send Text Message Handler (with strict deduplication & single-send protection)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !roomSession || isSendingRef.current) return;

    isSendingRef.current = true;
    setIsSending(true);
    setSendFailed(false);

    const textToSend = inputText.trim();
    const replyMeta = replyingTo || undefined;
    setInputText('');
    setReplyingTo(null);

    try {
      const localMsg = await roomSession.sendMessage(textToSend, replyMeta);
      setMessages((prev) => {
        if (prev.some((m) => m.id === localMsg.id)) {
          return prev;
        }
        return [...prev, localMsg];
      });
      setLastActivity(Date.now());
      setTimeout(() => scrollToBottom(), 50);
    } catch {
      setSendFailed(true);
      setInputText(textToSend); // Restore if send failed
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 7. Media Selection & Upload Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setMediaError(validation.error || 'Invalid media file');
      setTimeout(() => setMediaError(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedMediaFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMedia = async (caption: string) => {
    if (!selectedMediaFile || !roomSession) return;
    setIsSending(true);
    try {
      const localMsg = await roomSession.sendMediaMessage(
        selectedMediaFile,
        caption,
        replyingTo || undefined
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === localMsg.id)) {
          return prev;
        }
        return [...prev, localMsg];
      });
      setSelectedMediaFile(null);
      setReplyingTo(null);
      setLastActivity(Date.now());
      setTimeout(() => scrollToBottom(), 50);
    } catch (err: any) {
      setSendFailed(true);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  // 8. Reaction Toggle
  const handleToggleReaction = async (msg: DecryptedMessage, emoji: string) => {
    if (!roomSession || !currentUser) return;
    const existing = msg.reactions?.find((r) => r.emoji === emoji);
    const hasReacted = existing?.users.includes(currentUser.id);
    const action = hasReacted ? 'remove' : 'add';

    await roomSession.sendReaction(msg.id, emoji, action);
  };

  // 9. Start Reply
  const handleStartReply = (msg: DecryptedMessage) => {
    const snippet =
      msg.text || (msg.mediaMeta ? `[${msg.mediaMeta.mediaType === 'video' ? 'Video' : 'Photo'}]` : '');
    setReplyingTo({
      id: msg.id,
      senderName: msg.isSelf ? 'You' : msg.senderName,
      snippet: snippet.length > 50 ? snippet.slice(0, 47) + '...' : snippet
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // 10. Copy Room Link
  const handleCopyLink = () => {
    const cleanUrl = `${window.location.origin}/r/${roomId}`;
    navigator.clipboard.writeText(cleanUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setMenuOpen(false);
  };

  // 11. Leave Room
  const handleLeaveAndDestroy = async () => {
    setShowLeaveModal(false);
    if (roomSessionRef.current) {
      await roomSessionRef.current.leaveRoom();
    }
    router.push('/app');
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // RENDER: DESTROYED ROOM STATE
  // ==========================================
  if (roomDestroyed) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-center items-center px-6 relative selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
        <div className="max-w-md w-full text-center space-y-6 relative z-10 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 shadow-xs">
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase text-[var(--text-muted)] tracking-widest font-semibold">
              THIS ROOM IS GONE.
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
              Nothing here. That&apos;s the point.
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              This conversation has ended and the room is no longer available. All cryptographic keys, media payloads, and ephemeral memory buffers have been permanently zeroized.
            </p>
          </div>

          <Button asChild className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white" size="lg">
            <Link href="/app" className="flex items-center justify-center space-x-2">
              <span>Return to ENCLAVE</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: LOADING METADATA
  // ==========================================
  if (loadingMeta) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-mono text-xs text-[var(--text-muted)]">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>CONNECTING TO RELAY...</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: JOIN FLOW (ACCESS PASS PROMPT)
  // ==========================================
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-center py-12 px-4 sm:px-6 relative selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
        <div className="max-w-md mx-auto w-full relative z-10 space-y-6">
          <div className="text-center space-y-1">
            <Link href="/" className="inline-block">
              <span className="font-mono text-base font-semibold tracking-widest text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                ENCLAVE
              </span>
            </Link>
            <div className="text-xs font-mono text-[var(--text-muted)]">
              ROOM: {roomId}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[10px] font-mono text-[var(--accent)] font-semibold uppercase mb-1">
                <Lock className="w-3 h-3" />
                <span>PASS REQUIRED</span>
              </div>
              <h2 className="text-2xl font-medium text-[var(--text-primary)] tracking-tight">
                Enter access pass
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Enter the out-of-band access pass shared by the room creator.
              </p>
            </div>

            {accessDenied && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 flex items-start space-x-2 text-xs text-rose-700 dark:text-rose-400 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Access denied.</div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                    Check the access pass and try again.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleManualJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Access Pass
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={accessPass}
                    onChange={(e) => setAccessPass(e.target.value)}
                    placeholder="Enter access pass"
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg pl-10 pr-3 py-2.5 text-sm font-mono text-[var(--text-primary)] font-semibold focus:border-[var(--accent)] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {verificationStep && (
                <div className="p-3 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center space-x-2 text-xs font-mono text-[var(--accent)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span>{verificationStep}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isVerifying || !accessPass.trim()}
                className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
                size="lg"
              >
                <span>{isVerifying ? 'Verifying...' : 'Enter room'}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="pt-4 border-t border-[var(--border)] text-center text-xs font-mono text-[var(--text-muted)]">
              The pass is verified client-side before unwrapping the Room Master Secret.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: CHAT ROOM
  // ==========================================
  const isWaitingOnly = participants.length <= 1;

  // Combine messages & system notices sorted by timestamp
  const allStreamItems = [
    ...messages.map((m) => ({ kind: 'message' as const, data: m })),
    ...systemNotices.map((n) => ({ kind: 'notice' as const, data: n }))
  ].sort((a, b) => a.data.timestamp - b.data.timestamp);

  // Status Badge Label
  let statusBadgeLabel = `${participants.length} HERE`;
  let statusDotClass = 'bg-[var(--accent)]';

  if (isWaitingOnly) {
    statusBadgeLabel = 'WAITING · 1 HERE';
    statusDotClass = 'bg-amber-600 animate-pulse';
  } else {
    statusBadgeLabel = `PRIVATE · ${participants.length} HERE`;
  }

  if (showInactivityWarning && isWaitingOnly && secondsRemaining !== null) {
    statusBadgeLabel = `ENDING SOON · ${formatCountdown(secondsRemaining)}`;
    statusDotClass = 'bg-amber-600 animate-ping';
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Left: Brand & Room Identity */}
          <div className="flex items-center space-x-3">
            <Link href="/app" className="flex items-center space-x-2 group">
              <span className="font-mono text-sm font-semibold tracking-widest text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                ENCLAVE
              </span>
            </Link>

            <span className="text-[var(--border-strong)]">/</span>

            <span className="text-xs font-mono text-[var(--text-secondary)] tracking-wide uppercase hidden sm:inline">
              PRIVATE ROOM
            </span>

            <span className="text-xs font-mono text-[var(--text-muted)] sm:hidden">
              {roomId}
            </span>
          </div>

          {/* Right: Presence, Mode & Action Menu */}
          <div className="flex items-center space-x-3">
            {/* Dynamic Room Status Badge */}
            <div className="flex items-center space-x-1.5 font-mono text-xs text-[var(--text-primary)] bg-[var(--surface)] px-2.5 py-1 rounded-full border border-[var(--border)] shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${statusDotClass}`} />
              <span className="font-medium tracking-tight uppercase text-[11px]">
                {statusBadgeLabel}
              </span>
            </div>

            {/* Access Mode Tag */}
            <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
              {roomMeta?.requirePass !== false ? (
                <>
                  <Lock className="w-3 h-3 text-[var(--accent)]" />
                  <span>PASS REQUIRED</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3 h-3 text-[var(--accent)]" />
                  <span>LINK ACCESS</span>
                </>
              )}
            </div>

            {/* Three-Dot Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Room options"
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 z-50 text-xs font-mono animate-in fade-in">
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-3.5 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--surface-muted)] flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link copied' : 'Copy link'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowDrawer(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--surface-muted)] flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>Room details</span>
                  </button>

                  <div className="border-t border-[var(--border)] my-1" />

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowLeaveModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave room</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. INACTIVITY WARNING BANNER (Holds "I'm here" refresh strictly separate from composer) */}
      {showInactivityWarning && isWaitingOnly && secondsRemaining !== null && (
        <div className="bg-[#FEF3C7] border-b border-[#FDE68A] dark:bg-amber-950/60 dark:border-amber-900 px-4 py-2.5 text-xs font-mono text-[#92400E] dark:text-amber-300 sticky top-14 sm:top-16 z-20">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#92400E] dark:text-amber-300" />
              <div>
                <span className="font-semibold">This room is becoming inactive.</span>
                <span className="ml-1">
                  It will be destroyed in <span className="font-bold">{formatCountdown(secondsRemaining)}</span>
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleImHere}
              className="bg-[#92400E] text-white hover:bg-[#78350F] h-7 px-3 text-[11px]"
            >
              I&apos;m here
            </Button>
          </div>
        </div>
      )}

      {/* 3. CONVERSATION VIEWPORT */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col justify-between relative overflow-hidden">
        {isWaitingOnly && messages.length === 0 ? (
          /* WAITING / EMPTY ROOM PHILOSOPHY VIEW (Clean, No Composer Clutter) */
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
            <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 shadow-xs space-y-6">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-normal text-[var(--text-primary)] tracking-tight leading-tight">
                  Nothing here.
                </h1>
                <p className="text-base font-medium text-[var(--accent)]">
                  That&apos;s the point.
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pt-1">
                  This conversation exists only while you&apos;re here. Share the room link to begin.
                </p>
              </div>

              {/* Calm Waiting Status */}
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-center space-x-2 text-xs font-mono text-[var(--text-muted)] py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                  <span>Waiting for someone to join…</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE CONVERSATION STREAM */
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 space-y-4 overflow-y-auto pr-1 pb-4 min-h-[380px] max-h-[calc(100vh-270px)]"
          >
            {allStreamItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                <h2 className="text-2xl font-normal text-[var(--text-primary)]">Nothing here.</h2>
                <p className="text-xs text-[var(--text-secondary)]">That&apos;s the point. This conversation exists only while you&apos;re here.</p>
              </div>
            ) : (
              allStreamItems.map((item, idx) => {
                if (item.kind === 'notice') {
                  return (
                    <div key={item.data.id} className="py-2 flex items-center justify-center">
                      <div className="flex items-center space-x-3 text-xs font-mono text-[var(--text-muted)] max-w-sm w-full">
                        <div className="flex-1 border-t border-[var(--border)]" />
                        <span>{item.data.text}</span>
                        <div className="flex-1 border-t border-[var(--border)]" />
                      </div>
                    </div>
                  );
                }

                const msg = item.data;
                const isSelf = msg.isSelf;
                const prevItem = allStreamItems[idx - 1];
                const isGrouped =
                  prevItem &&
                  prevItem.kind === 'message' &&
                  prevItem.data.senderId === msg.senderId &&
                  msg.timestamp - prevItem.data.timestamp < 120000;

                const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={msg.id}
                    className={`group relative flex flex-col ${isSelf ? 'items-end' : 'items-start'} ${
                      isGrouped ? 'mt-1' : 'mt-4'
                    }`}
                  >
                    {!isGrouped && (
                      <div className="flex items-center space-x-2 text-[10px] font-mono text-[var(--text-muted)] mb-1 px-1">
                        <span className={isSelf ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-primary)] font-semibold'}>
                          {isSelf ? 'You' : msg.senderName}
                        </span>
                        <span>·</span>
                        <span>{formattedTime}</span>
                      </div>
                    )}

                    {/* Message Bubble + Action Overlay Container */}
                    <div className="relative max-w-[85%] sm:max-w-md">
                      {/* Replying Banner in message */}
                      {msg.replyTo && (
                        <div
                          className={`text-xs px-3 py-1.5 rounded-t-xl border-t border-x font-mono truncate ${
                            isSelf
                              ? 'bg-[var(--accent-hover)]/30 border-[var(--accent-border)] text-white/90'
                              : 'bg-[var(--surface-muted)] border-[var(--border)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <span className="font-semibold">{msg.replyTo.senderName}: </span>
                          <span className="italic">{msg.replyTo.snippet}</span>
                        </div>
                      )}

                      {/* Main Message Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm transition-all shadow-2xs ${
                          msg.replyTo ? 'rounded-t-none' : ''
                        } ${
                          isSelf
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]'
                        }`}
                      >
                        {/* Media Attachment if present */}
                        {msg.mediaMeta && (
                          <div className="mb-2 space-y-1.5">
                            {msg.mediaMeta.loadingState === 'downloading' ||
                            msg.mediaMeta.loadingState === 'decrypting' ? (
                              <div className="flex items-center justify-center p-6 bg-black/10 rounded-xl space-x-2 font-mono text-xs">
                                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                                <span>Decrypting attachment in-memory...</span>
                              </div>
                            ) : msg.mediaMeta.loadingState === 'error' ? (
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-mono text-rose-500">
                                Failed to decrypt attachment.
                              </div>
                            ) : msg.mediaMeta.localBlobUrl ? (
                              <div className="relative rounded-xl overflow-hidden border border-black/10 group/media cursor-pointer">
                                {msg.mediaMeta.mediaType === 'image' ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={msg.mediaMeta.localBlobUrl}
                                    alt={msg.mediaMeta.fileName || 'Encrypted image'}
                                    className="max-h-72 w-full object-cover rounded-xl"
                                    onClick={() =>
                                      setLightboxItem({
                                        url: msg.mediaMeta!.localBlobUrl!,
                                        mediaType: 'image',
                                        fileName: msg.mediaMeta!.fileName,
                                        senderName: msg.senderName,
                                        timestamp: msg.timestamp
                                      })
                                    }
                                  />
                                ) : (
                                  <video
                                    src={msg.mediaMeta.localBlobUrl}
                                    controls
                                    className="max-h-72 w-full rounded-xl bg-black"
                                  />
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxItem({
                                      url: msg.mediaMeta!.localBlobUrl!,
                                      mediaType: msg.mediaMeta!.mediaType,
                                      fileName: msg.mediaMeta!.fileName,
                                      senderName: msg.senderName,
                                      timestamp: msg.timestamp
                                    })
                                  }
                                  aria-label="Expand media"
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white opacity-0 group-hover/media:opacity-100 transition-opacity"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between text-[10px] font-mono opacity-75">
                              <span>
                                {msg.mediaMeta.fileName ||
                                  (msg.mediaMeta.mediaType === 'video' ? 'video' : 'photo')}
                              </span>
                              <span>{formatFileSize(msg.mediaMeta.size)}</span>
                            </div>
                          </div>
                        )}

                        {/* Text Content */}
                        {msg.text && (
                          <div className="break-words whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </div>
                        )}
                      </div>

                      {/* Floating Action Menu for Reactions & Reply */}
                      <div
                        className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-[var(--surface)] border border-[var(--border)] rounded-full px-2 py-0.5 shadow-md z-10 ${
                          isSelf ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
                        }`}
                      >
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg, emoji)}
                            className="text-xs hover:scale-125 transition-transform px-0.5 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className="w-px h-3 bg-[var(--border)] mx-0.5" />
                        <button
                          type="button"
                          onClick={() => handleStartReply(msg)}
                          title="Reply"
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Displayed Reactions Pill */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div
                          className={`flex flex-wrap gap-1 mt-1 ${
                            isSelf ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.reactions.map((rx) => {
                            const hasReacted = currentUser && rx.users.includes(currentUser.id);
                            return (
                              <button
                                key={rx.emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg, rx.emoji)}
                                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs font-mono border transition-colors cursor-pointer ${
                                  hasReacted
                                    ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)] font-semibold'
                                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                <span>{rx.emoji}</span>
                                {rx.count > 1 && <span>{rx.count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Floating Unread / Scroll-to-Bottom Indicator */}
        {hasUnreadBelow && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={scrollToBottom}
              className="bg-[var(--accent)] text-white text-xs font-mono px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 hover:bg-[var(--accent-hover)] transition-all animate-bounce"
            >
              <span>New messages below</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4. WHATSAPP-STYLE PRIVACY NOTICE & COMPOSER AREA */}
        <div className="pt-2 z-10 space-y-2">
          {/* Subtle WhatsApp-Style Privacy & Ephemerality Notice */}
          <div className="text-center px-4 py-1 select-none pointer-events-none">
            <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed text-center">
              <Lock className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
              <span>
                Your chats are end-to-end encrypted. Only you and the recipient can read them. When you leave, this conversation will be permanently destroyed.
              </span>
            </div>
          </div>

          {/* Active Reply Banner */}
          {replyingTo && (
            <div className="bg-[var(--surface-muted)] border-t border-x border-[var(--border)] rounded-t-xl px-4 py-2 flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
              <div className="flex items-center space-x-2 truncate">
                <Reply className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span>Replying to <span className="font-semibold text-[var(--text-primary)]">{replyingTo.senderName}</span>:</span>
                <span className="italic truncate">{replyingTo.snippet}</span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 ml-2 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Media Error Notice */}
          {mediaError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-3 py-1.5 rounded-lg text-xs font-mono mb-2">
              {mediaError}
            </div>
          )}

          {/* Simple Messaging Composer */}
          <form
            onSubmit={handleSendMessage}
            className={`bg-[var(--surface)] border border-[var(--border)] p-2 sm:p-2.5 flex items-end gap-2 shadow-xs transition-all ${
              replyingTo ? 'rounded-b-2xl' : 'rounded-2xl'
            } focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/10`}
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Media Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach photo or video"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-muted)] rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none max-h-32 min-h-[36px] py-1.5 px-1 focus:outline-none leading-relaxed"
            />

            {/* Send Button */}
            <Button
              type="submit"
              disabled={isSending || !inputText.trim()}
              size="icon"
              className="w-9 h-9 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shrink-0 disabled:opacity-40"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </Button>
          </form>

          {sendFailed && (
            <div className="text-[11px] font-mono text-rose-500 mt-1 text-right">
              Failed to send message. Relay connection lost.
            </div>
          )}
        </div>
      </main>

      {/* 5. ROOM LIFECYCLE FOOTER */}
      <footer className="border-t border-[var(--border)] bg-[var(--background)] py-2.5 px-4 sm:px-6 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
          {/* Encryption Indicator & Drawer Trigger */}
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center space-x-1.5 text-[var(--accent)] hover:underline cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>End-to-end encrypted</span>
          </button>

          {/* Center Connection / Lifecycle State */}
          <div className="hidden sm:flex items-center space-x-2">
            <span>● Connected</span>
            <span>·</span>
            <span>Room {roomState.toLowerCase()}</span>
            <span>·</span>
            <span>Ephemeral memory session</span>
          </div>

          {/* Quick Leave Link */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            Leave room
          </button>
        </div>
      </footer>

      {/* Slide-Over Room Details Drawer */}
      {showDrawer && (
        <RoomDetailsDrawer
          roomId={roomId}
          roomMeta={roomMeta}
          participantCount={participants.length || 1}
          roomState={roomState}
          connectionState={connectionState}
          latestPacket={latestPacket}
          onOpenInspector={() => {
            setShowDrawer(false);
            setInspectPacket(latestPacket);
          }}
          onOpenLeaveModal={() => {
            setShowDrawer(false);
            setShowLeaveModal(true);
          }}
          onClose={() => setShowDrawer(false)}
        />
      )}

      {/* Modals & Lightbox */}
      {selectedMediaFile && (
        <MediaPreviewModal
          file={selectedMediaFile}
          onSend={handleSendMedia}
          onClose={() => setSelectedMediaFile(null)}
          isSending={isSending}
        />
      )}

      {lightboxItem && (
        <MediaLightboxModal
          mediaUrl={lightboxItem.url}
          mediaType={lightboxItem.mediaType}
          fileName={lightboxItem.fileName}
          senderName={lightboxItem.senderName}
          timestamp={lightboxItem.timestamp}
          onClose={() => setLightboxItem(null)}
        />
      )}

      {inspectPacket && (
        <CiphertextInspectorModal
          packet={inspectPacket}
          onClose={() => setInspectPacket(null)}
        />
      )}

      {showLeaveModal && (
        <LeaveConfirmationModal
          onStay={() => setShowLeaveModal(false)}
          onLeaveAndDestroy={handleLeaveAndDestroy}
          participantCount={participants.length || 1}
        />
      )}
    </div>
  );
}
