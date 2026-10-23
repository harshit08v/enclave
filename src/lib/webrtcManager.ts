/**
 * ENCLAVE WebRTC Call Manager
 * Orchestrates end-to-end encrypted signaling, peer connection lifecycle,
 * media stream permissions, in-call track muting, and duration timers.
 */

import { CallSignalPayload, RoomParticipant } from '@/packages/protocol';
import { EnclaveRoomSession } from '@/lib/roomRelay';
import { getCallAudioManager } from '@/lib/callAudioManager';

export type CallState =
  | 'idle'
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended';

export type CallType = 'voice' | 'video';

export interface CallDetails {
  callId: string;
  callType: CallType;
  remoteParticipant: RoomParticipant;
  isCaller: boolean;
  state: CallState;
  durationSeconds: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isMinimized: boolean;
  errorMessage: string | null;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

export class EnclaveCallManager {
  private session: EnclaveRoomSession;
  private currentUser: RoomParticipant;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private state: CallState = 'idle';
  private callId: string | null = null;
  private callType: CallType = 'voice';
  private remoteParticipant: RoomParticipant | null = null;
  private isCaller = false;
  private isMuted = false;
  private isVideoEnabled = true;
  private isMinimized = false;
  private durationSeconds = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private callTimeoutTimer: NodeJS.Timeout | null = null;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];
  private iceServers: RTCIceServer[] = [...DEFAULT_ICE_SERVERS];
  private currentFacingMode: 'user' | 'environment' = 'user';
  private errorMessage: string | null = null;
  private unsubscribeSignal: (() => void) | null = null;
  private listeners: Set<(details: CallDetails) => void> = new Set();
  private localStreamListeners: Set<(stream: MediaStream | null) => void> = new Set();
  private remoteStreamListeners: Set<(stream: MediaStream | null) => void> = new Set();
  private pendingIceCandidates: any[] = [];
  private iceFlushTimer: NodeJS.Timeout | null = null;

  constructor(session: EnclaveRoomSession, currentUser: RoomParticipant) {
    this.session = session;
    this.currentUser = currentUser;

    this.unsubscribeSignal = this.session.onCallSignal((signal) => {
      this.handleIncomingSignal(signal);
    });

    this.fetchIceServers();
  }

  private async fetchIceServers() {
    try {
      const headers: Record<string, string> = {};
      const auth = this.session.getAuthCommitment();
      if (auth) headers['Authorization'] = `Bearer ${auth}`;

      const res = await fetch(`/api/rooms/${this.session.roomId}/turn`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers && Array.isArray(data.iceServers)) {
          this.iceServers = data.iceServers;
        }
      }
    } catch {
      // Fallback to default STUN
    }
  }

  public subscribe(fn: (details: CallDetails) => void): () => void {
    this.listeners.add(fn);
    fn(this.getDetails());
    return () => this.listeners.delete(fn);
  }

  public onLocalStream(fn: (stream: MediaStream | null) => void): () => void {
    this.localStreamListeners.add(fn);
    fn(this.localStream);
    return () => this.localStreamListeners.delete(fn);
  }

  public onRemoteStream(fn: (stream: MediaStream | null) => void): () => void {
    this.remoteStreamListeners.add(fn);
    fn(this.remoteStream);
    return () => this.remoteStreamListeners.delete(fn);
  }

  public getDetails(): CallDetails {
    return {
      callId: this.callId || '',
      callType: this.callType,
      remoteParticipant: this.remoteParticipant || { id: '', displayName: 'Participant', joinedAt: 0 },
      isCaller: this.isCaller,
      state: this.state,
      durationSeconds: this.durationSeconds,
      isMuted: this.isMuted,
      isVideoEnabled: this.isVideoEnabled,
      isMinimized: this.isMinimized,
      errorMessage: this.errorMessage
    };
  }

  private notify() {
    const details = this.getDetails();
    this.listeners.forEach((fn) => fn(details));
  }

  private notifyStreams() {
    this.localStreamListeners.forEach((fn) => fn(this.localStream));
    this.remoteStreamListeners.forEach((fn) => fn(this.remoteStream));
  }

  private async acquireLocalStream(videoRequired: boolean): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: videoRequired
          ? {
              facingMode: { ideal: this.currentFacingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : false
      });
    } catch (err: unknown) {
      if (
        videoRequired &&
        err instanceof Error &&
        (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError')
      ) {
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
      }
      throw err;
    }
  }

  /**
   * Starts an outgoing voice or video call.
   */
  public async startCall(type: CallType, targetUser: RoomParticipant): Promise<void> {
    if (this.state !== 'idle') {
      return;
    }

    this.errorMessage = null;
    this.callType = type;
    this.remoteParticipant = targetUser;
    this.isCaller = true;
    this.isMuted = false;
    this.isVideoEnabled = type === 'video';
    this.isMinimized = false;
    this.durationSeconds = 0;
    this.callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      // Request mic / camera upfront
      this.localStream = await this.acquireLocalStream(type === 'video');
    } catch (err: unknown) {
      console.error('[GETUSERMEDIA ERROR in startCall]', err);
      const errName = err instanceof Error ? err.name : '';
      const isDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError';
      this.errorMessage = isDenied
        ? 'Microphone and camera permissions were denied.'
        : 'Could not access audio or video hardware on this device.';
      this.state = 'idle';
      this.notify();
      throw err;
    }

    this.state = 'outgoing_ringing';
    this.notify();
    this.notifyStreams();

    // Start outgoing ringback audio
    getCallAudioManager().playOutgoingRingback();

    // Activate fast polling in room session
    this.session.setCallActive(true);

    // Send call invite signal
    await this.session.sendCallSignal({
      callId: this.callId,
      signalType: 'invite',
      callType: this.callType,
      callerId: this.currentUser.id,
      callerName: this.currentUser.displayName,
      targetUserId: targetUser.id,
      timestamp: Date.now()
    });

    // 35s call timeout
    this.callTimeoutTimer = setTimeout(() => {
      if (this.state === 'outgoing_ringing') {
        this.cancelCall('No answer');
      }
    }, 35000);
  }

  /**
   * Accepts an incoming call invitation.
   */
  public async acceptCall(): Promise<void> {
    if (this.state !== 'incoming_ringing' || !this.callId) return;

    this.clearCallTimeout();
    getCallAudioManager().stopAll();

    try {
      this.localStream = await this.acquireLocalStream(this.callType === 'video');
    } catch (err: unknown) {
      console.error('[GETUSERMEDIA ERROR in acceptCall]', err);
      const errName = err instanceof Error ? err.name : '';
      const isDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError';
      this.errorMessage = isDenied
        ? 'Microphone and camera permissions were denied.'
        : 'Could not access audio or video hardware on this device.';
      await this.declineCall('Permissions denied');
      return;
    }

    this.session.setCallActive(true);
    this.state = 'connecting';
    this.notify();
    this.notifyStreams();

    // Initialize peer connection
    await this.setupPeerConnection();

    // Send accept signal to caller
    await this.session.sendCallSignal({
      callId: this.callId,
      signalType: 'accept',
      callType: this.callType,
      callerId: this.currentUser.id,
      callerName: this.currentUser.displayName,
      targetUserId: this.remoteParticipant?.id,
      timestamp: Date.now()
    });
  }

  /**
   * Declines an incoming call invitation.
   */
  public async declineCall(reason = 'Declined'): Promise<void> {
    if (!this.callId) return;

    const callIdToDecline = this.callId;
    const targetUserId = this.remoteParticipant?.id;
    const callType = this.callType;

    this.clearCallTimeout();
    getCallAudioManager().stopAll();
    this.teardownCall('idle');

    void this.session.sendCallSignal({
      callId: callIdToDecline,
      signalType: 'decline',
      callType,
      callerId: this.currentUser.id,
      callerName: this.currentUser.displayName,
      targetUserId,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Cancels an outgoing call before it is answered.
   */
  public async cancelCall(reason = 'Cancelled'): Promise<void> {
    if (!this.callId) return;

    const callIdToCancel = this.callId;
    const targetUserId = this.remoteParticipant?.id;
    const callType = this.callType;

    this.clearCallTimeout();
    getCallAudioManager().stopAll();
    this.teardownCall('idle');

    void this.session.sendCallSignal({
      callId: callIdToCancel,
      signalType: 'cancel',
      callType,
      callerId: this.currentUser.id,
      callerName: this.currentUser.displayName,
      targetUserId,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Ends an active or connecting call.
   */
  public async endCall(): Promise<void> {
    console.log('[END CALL]', this.currentUser.displayName, 'endCall called! callId=', this.callId, 'remoteParticipant=', this.remoteParticipant);
    if (!this.callId) return;

    const callIdToEnd = this.callId;
    const targetUserId = this.remoteParticipant?.id;
    const callType = this.callType;

    this.clearCallTimeout();
    getCallAudioManager().playCallEnded();
    this.teardownCall('idle');

    void this.session.sendCallSignal({
      callId: callIdToEnd,
      signalType: 'end',
      callType,
      callerId: this.currentUser.id,
      callerName: this.currentUser.displayName,
      targetUserId,
      timestamp: Date.now()
    });
  }

  /**
   * Toggles microphone mute.
   */
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    this.notify();
    return this.isMuted;
  }

  /**
   * Toggles camera video on/off.
   */
  public toggleVideo(): boolean {
    if (!this.localStream || this.callType !== 'video') return this.isVideoEnabled;
    this.isVideoEnabled = !this.isVideoEnabled;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = this.isVideoEnabled;
    });
    this.notify();
    return this.isVideoEnabled;
  }

  /**
   * Flips camera front/back on mobile devices.
   */
  public async switchCamera(): Promise<void> {
    if (this.callType !== 'video' || !this.localStream) return;

    const newFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const newTrack = newStream.getVideoTracks()[0];

      if (newTrack && this.peerConnection) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (sender) {
          await sender.replaceTrack(newTrack);
        }

        const oldTrack = this.localStream.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          this.localStream.removeTrack(oldTrack);
        }

        this.localStream.addTrack(newTrack);
        this.currentFacingMode = newFacingMode;
        this.notifyStreams();
      }
    } catch {
      // Camera switch unsupported or failed
    }
  }

  /**
   * Minimizes or expands active call view.
   */
  public toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    this.notify();
  }

  public setMinimized(min: boolean): void {
    this.isMinimized = min;
    this.notify();
  }

  // ==========================================
  // SIGNALING & PEER CONNECTION HANDLERS
  // ==========================================

  private async handleIncomingSignal(signal: CallSignalPayload) {
    console.log('[CALL SIGNAL]', this.currentUser.displayName, 'received', signal.signalType, 'target:', signal.targetUserId, 'myId:', this.currentUser.id, 'match:', !signal.targetUserId || signal.targetUserId === this.currentUser.id);
    // If signal has a target and it is not for us, ignore
    if (signal.targetUserId && signal.targetUserId !== this.currentUser.id) {
      return;
    }

    switch (signal.signalType) {
      case 'invite':
        if (this.state !== 'idle') {
          // Already in a call: report busy
          await this.session.sendCallSignal({
            callId: signal.callId,
            signalType: 'busy',
            callType: signal.callType,
            callerId: this.currentUser.id,
            callerName: this.currentUser.displayName,
            targetUserId: signal.callerId,
            timestamp: Date.now()
          });
          return;
        }

        this.callId = signal.callId;
        this.callType = signal.callType;
        this.remoteParticipant = {
          id: signal.callerId,
          displayName: signal.callerName,
          joinedAt: signal.timestamp
        };
        this.isCaller = false;
        this.state = 'incoming_ringing';
        this.isMinimized = false;
        this.notify();

        // Play incoming ringtone loop
        getCallAudioManager().playIncomingRingtone();

        // Send ringing acknowledgment back
        await this.session.sendCallSignal({
          callId: signal.callId,
          signalType: 'ringing',
          callType: signal.callType,
          callerId: this.currentUser.id,
          callerName: this.currentUser.displayName,
          targetUserId: signal.callerId,
          timestamp: Date.now()
        });

        // Auto-decline if unanswered in 35s
        this.callTimeoutTimer = setTimeout(() => {
          if (this.state === 'incoming_ringing') {
            this.declineCall('Missed call');
          }
        }, 35000);
        break;

      case 'ringing':
        // Remote device confirmed ringing
        if (this.state === 'outgoing_ringing' && signal.callId === this.callId) {
          this.notify();
        }
        break;

      case 'busy':
        if (this.callId === signal.callId) {
          getCallAudioManager().playBusyTone();
          this.errorMessage = 'The participant is currently busy in another call.';
          this.state = 'ended';
          this.notify();
          setTimeout(() => this.teardownCall('idle'), 2500);
        }
        break;

      case 'decline':
        if (this.callId === signal.callId) {
          getCallAudioManager().playBusyTone();
          this.errorMessage = signal.reason || 'Call was declined.';
          this.state = 'ended';
          this.notify();
          setTimeout(() => this.teardownCall('idle'), 2500);
        }
        break;

      case 'cancel':
        if (this.callId === signal.callId) {
          getCallAudioManager().stopAll();
          this.teardownCall('idle');
        }
        break;

      case 'accept':
        // Recipient accepted our call: create SDP offer
        if (this.callId === signal.callId && this.isCaller) {
          this.clearCallTimeout();
          getCallAudioManager().stopAll();
          this.state = 'connecting';
          this.notify();

          await this.setupPeerConnection();

          const offer = await this.peerConnection!.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: this.callType === 'video'
          });
          await this.peerConnection!.setLocalDescription(offer);

          await this.session.sendCallSignal({
            callId: this.callId,
            signalType: 'offer',
            callType: this.callType,
            callerId: this.currentUser.id,
            callerName: this.currentUser.displayName,
            targetUserId: signal.callerId,
            sdp: offer.sdp,
            timestamp: Date.now()
          });
        }
        break;

      case 'offer':
        if (this.callId === signal.callId && !this.isCaller && signal.sdp) {
          if (!this.peerConnection) {
            await this.setupPeerConnection();
          }

          await this.peerConnection!.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp: signal.sdp })
          );

          this.flushQueuedIceCandidates();

          const answer = await this.peerConnection!.createAnswer();
          await this.peerConnection!.setLocalDescription(answer);

          await this.session.sendCallSignal({
            callId: this.callId,
            signalType: 'answer',
            callType: this.callType,
            callerId: this.currentUser.id,
            callerName: this.currentUser.displayName,
            targetUserId: signal.callerId,
            sdp: answer.sdp,
            timestamp: Date.now()
          });
        }
        break;

      case 'answer':
        if (this.callId === signal.callId && this.isCaller && signal.sdp && this.peerConnection) {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
          );
          this.flushQueuedIceCandidates();
        }
        break;

      case 'ice_candidate':
        if (this.callId === signal.callId && (signal.candidate || signal.candidates)) {
          const list = signal.candidates || (signal.candidate ? [signal.candidate] : []);
          for (const cand of list) {
            if (this.peerConnection && this.peerConnection.remoteDescription) {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
              } catch {}
            } else {
              this.queuedIceCandidates.push(cand);
            }
          }
        }
        break;

      case 'end':
        if (this.callId === signal.callId) {
          getCallAudioManager().playCallEnded();
          this.teardownCall('idle');
        }
        break;
    }
  }

  private async setupPeerConnection(): Promise<void> {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
    }

    this.remoteStream = new MediaStream();
    this.notifyStreams();

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 2
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Remote track arrived
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else if (event.track) {
        this.remoteStream!.addTrack(event.track);
      }
      this.notifyStreams();
    };

    // ICE Candidate discovered (batched to prevent upstream REST rate limiting)
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callId) {
        this.pendingIceCandidates.push(event.candidate.toJSON());
        if (this.iceFlushTimer) clearTimeout(this.iceFlushTimer);
        this.iceFlushTimer = setTimeout(async () => {
          if (this.pendingIceCandidates.length === 0 || !this.callId) return;
          const candidatesToSend = [...this.pendingIceCandidates];
          this.pendingIceCandidates = [];
          await this.session.sendCallSignal({
            callId: this.callId,
            signalType: 'ice_candidate',
            callType: this.callType,
            callerId: this.currentUser.id,
            callerName: this.currentUser.displayName,
            targetUserId: this.remoteParticipant?.id,
            candidate: candidatesToSend[0],
            candidates: candidatesToSend,
            timestamp: Date.now()
          });
        }, 100);
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const connState = this.peerConnection?.connectionState;
      if (connState === 'connected') {
        if (this.state !== 'connected') {
          this.state = 'connected';
          getCallAudioManager().playCallConnected();
          this.startDurationTimer();
          this.notify();
        }
      } else if (connState === 'disconnected') {
        this.state = 'reconnecting';
        this.notify();
      } else if (connState === 'failed') {
        this.errorMessage = 'Call connection failed. Please check network settings.';
        this.teardownCall('ended');
      } else if (connState === 'closed') {
        this.teardownCall('idle');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      if (iceState === 'disconnected') {
        this.state = 'reconnecting';
        this.notify();
      } else if (iceState === 'connected' && this.state !== 'connected') {
        this.state = 'connected';
        getCallAudioManager().playCallConnected();
        this.startDurationTimer();
        this.notify();
      }
    };
  }

  private flushQueuedIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.queuedIceCandidates.length > 0) {
      const cand = this.queuedIceCandidates.shift();
      if (cand) {
        try {
          this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch {}
      }
    }
  }

  private startDurationTimer() {
    if (this.durationInterval) clearInterval(this.durationInterval);
    this.durationSeconds = 0;
    this.durationInterval = setInterval(() => {
      this.durationSeconds++;
      this.notify();
    }, 1000);
  }

  private clearCallTimeout() {
    if (this.callTimeoutTimer) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
  }

  /**
   * Cleans up local streams, connections, audio, and timers.
   */
  private teardownCall(targetState: CallState = 'idle') {
    this.clearCallTimeout();

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }

    if (this.iceFlushTimer) {
      clearTimeout(this.iceFlushTimer);
      this.iceFlushTimer = null;
    }
    this.pendingIceCandidates = [];
    this.queuedIceCandidates = [];
    this.callId = null;
    this.state = targetState;
    this.isCaller = false;
    this.isMuted = false;
    this.isVideoEnabled = true;
    this.isMinimized = false;
    this.durationSeconds = 0;

    // Reset session fast polling
    this.session.setCallActive(false);

    getCallAudioManager().stopAll();

    this.notify();
    this.notifyStreams();
  }

  /**
   * Invoked on room destruction or component unmount.
   */
  public destroy(): void {
    if (this.unsubscribeSignal) {
      this.unsubscribeSignal();
      this.unsubscribeSignal = null;
    }
    this.teardownCall('idle');
    this.listeners.clear();
    this.localStreamListeners.clear();
    this.remoteStreamListeners.clear();
  }
}
