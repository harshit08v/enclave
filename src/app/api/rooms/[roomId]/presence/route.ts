import { NextResponse } from 'next/server';
import {
  updateRoomPresenceAsync,
  getServerRoomAsync,
  extractAuthProof,
  verifyRoomAuthAsync,
  getTrustedClientIp
} from '@/lib/serverRoomStore';
import { recordAuditEventAsync } from '@/lib/serverAuditStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const room = await getServerRoomAsync(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }
    if (room.state === 'DESTROYING' || room.state === 'DESTROYED') {
      return NextResponse.json({ error: 'Room is inactive or destroyed.' }, { status: 410 });
    }

    const authProof = extractAuthProof(request);
    const pathname = new URL(request.url).pathname;
    const isAuthorized = await verifyRoomAuthAsync(roomId, authProof, request.method, pathname);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized room participant.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, participantId, displayName, identityKey, prekey, prekeySignature, prekeyId, prekeyCreatedAt, prekeyExpiresAt, isGuest } = body;

    if (!participantId || !action) {
      return NextResponse.json({ error: 'Invalid presence payload.' }, { status: 400 });
    }

    if (!['join', 'heartbeat', 'leave', 'destroy', 'im_here'].includes(action)) {
      return NextResponse.json({ error: 'Invalid presence action.' }, { status: 400 });
    }

    const result = await updateRoomPresenceAsync(roomId, participantId, action, displayName, identityKey, prekey, prekeySignature, prekeyId, prekeyCreatedAt, prekeyExpiresAt);
    if (!result) {
      return NextResponse.json({ error: 'Room not found, restricted, or destroyed.' }, { status: 404 });
    }

    if (result.status === 'ROOM_FULL') {
      return NextResponse.json(
        { error: 'Room is full. Enclave rooms support a maximum of two participants.', code: 'ROOM_FULL' },
        { status: 409 }
      );
    }

    // Record audit event for Guest/User room entry
    if (action === 'join') {
      const clientIp = getTrustedClientIp(request);
      const isGuestUser = Boolean(isGuest) || (displayName && displayName !== 'Creator' && !body.isCreator);
      try {
        await recordAuditEventAsync({
          adminUser: displayName || participantId,
          action: isGuestUser ? 'GUEST_JOIN' : 'USER_JOIN',
          target: roomId,
          reason: isGuestUser
            ? `Guest "${displayName || 'Guest'}" logged in and joined chamber ${roomId} from IP ${clientIp}`
            : `User "${displayName || participantId}" joined chamber ${roomId} from IP ${clientIp}`,
          status: 'SUCCESS',
          ip: clientIp,
          metadata: {
            roomId,
            participantId,
            displayName: displayName || 'Guest',
            isGuest: isGuestUser,
            identityKey: identityKey ? `${String(identityKey).slice(0, 12)}…` : undefined,
            userAgent: request.headers.get('user-agent') || 'Unknown',
            clientIp,
            timestamp: Date.now()
          }
        });
      } catch (auditErr) {
        console.warn('[ENCLAVE AUDIT] Failed to record join audit event:', auditErr);
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: 'Presence synchronization error.' }, { status: 500 });
  }
}
