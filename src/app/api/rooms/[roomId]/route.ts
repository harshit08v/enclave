import { NextResponse } from 'next/server';
import { getServerRoom, checkRateLimit, recordFailedAttempt } from '@/lib/serverRoomStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Rate limit check for room query brute-force prevention
    const rateCheck = checkRateLimit(`query_${ip}_${roomId}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Chamber temporarily locked.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const room = getServerRoom(roomId);

    if (!room) {
      recordFailedAttempt(`query_${ip}_${roomId}`);
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

    // Return public verification parameters (salt, authCommitment, wrappedSecretBundle, oneTimeAccess, state).
    // The server NEVER possesses or returns plaintext passes, KWK, or RMS.
    return NextResponse.json({
      id: room.id,
      salt: room.salt,
      authCommitment: room.authCommitment,
      wrappedSecretBundle: room.wrappedSecretBundle,
      oneTimeAccess: room.oneTimeAccess,
      participantCount: room.participantCount,
      state: room.state,
      createdAt: room.createdAt,
      requirePass: room.requirePass,
      accessMode: room.accessMode,
      lastActivity: room.lastActivity,
      inactivityLimitMs: room.inactivityLimitMs,
      warningThresholdMs: room.warningThresholdMs,
      serverTime: Date.now()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Chamber lookup failed.' }, { status: 500 });
  }
}
