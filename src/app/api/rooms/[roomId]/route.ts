import { NextResponse } from 'next/server';
import {
  getServerRoomAsync,
  checkRateLimitAsync,
  recordFailedAttemptAsync,
  getTrustedClientIp,
  extractAuthProof,
  verifyAdminDestructionAsync,
  destroyServerRoomAsync
} from '@/lib/serverRoomStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const ip = getTrustedClientIp(request);

    // Rate limit check for room query brute-force prevention
    const rateCheck = await checkRateLimitAsync(`query_${ip}_${roomId}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Chamber temporarily locked.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const room = await getServerRoomAsync(roomId);

    if (!room) {
      await recordFailedAttemptAsync(`query_${ip}_${roomId}`);
      return NextResponse.json(
        { error: 'Enclave does not exist or has already been permanently destroyed.' },
        { status: 404 }
      );
    }

    if (room.state === 'DESTROYING' || room.state === 'DESTROYED') {
      return NextResponse.json(
        {
          error: 'This Enclave has completed its lifecycle and has been permanently destroyed.',
          destroyed: true,
          destroyedAt: room.destroyedAt
        },
        { status: 410 }
      );
    }

    // Return strictly public verification parameters (salt, wrappedSecretBundle, oneTimeAccess, state).
    // The server NEVER exposes authCommitment, relayAuthKey, plaintext passes, KWK, or RMS.
    return NextResponse.json({
      id: room.id,
      salt: room.salt,
      wrappedSecretBundle: room.wrappedSecretBundle,
      oneTimeAccess: room.oneTimeAccess,
      participantCount: room.participantCount,
      state: room.state,
      createdAt: room.createdAt,
      requirePass: room.requirePass,
      accessMode: room.accessMode,
      adminPublicKey: room.adminPublicKey,
      creatorId: room.creatorId,
      lastActivity: room.lastActivity,
      inactivityLimitMs: room.inactivityLimitMs,
      warningThresholdMs: room.warningThresholdMs,
      serverTime: Date.now()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Chamber lookup failed.' }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json(
        { success: true, state: 'DESTROYED', message: 'Room already destroyed.' },
        { status: 200 }
      );
    }

    const adminProof = request.headers.get('x-enclave-admin-proof') || extractAuthProof(request);
    const isAuthorized = await verifyAdminDestructionAsync(roomId, adminProof);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: valid administrator cryptographic proof required for room obliteration.' }, { status: 403 });
    }

    // Atomically destroy room and purge ephemeral memory buffers
    await destroyServerRoomAsync(roomId, 'Authorized manual room obliteration');

    return NextResponse.json({
      success: true,
      state: 'DESTROYED',
      message: 'Room permanently destroyed. All memory buffers obliterated.'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to destroy room.' }, { status: 500 });
  }
}
