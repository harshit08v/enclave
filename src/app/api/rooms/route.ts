import { NextResponse } from 'next/server';
import {
  createServerRoomAsync,
  checkRateLimitAsync,
  recordFailedAttemptAsync,
  getTrustedClientIp
} from '@/lib/serverRoomStore';
import { authorizeRoomCreation } from '@/lib/serverAuth';

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rateCheck = await checkRateLimitAsync(`create_${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before creating new rooms.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      await recordFailedAttemptAsync(`create_${ip}`);
      return NextResponse.json(
        { error: 'Invalid room creation payload.' },
        { status: 400 }
      );
    }

    const { roomId, salt, authCommitment, wrappedSecretBundle, oneTimeAccess, requirePass, accessMode, creatorId, creatorEmail } = body;

    // Authoritative Server-Side Authorization Check
    const authResult = await authorizeRoomCreation(request, creatorId, creatorEmail);
    if (!authResult.allowed) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized.', code: authResult.code },
        { status: authResult.status || 403 }
      );
    }

    if (!roomId || !salt || !authCommitment || !wrappedSecretBundle || !wrappedSecretBundle.wrappedKey || !wrappedSecretBundle.iv) {
      await recordFailedAttemptAsync(`create_${ip}`);
      return NextResponse.json(
        { error: 'Invalid room creation parameters.' },
        { status: 400 }
      );
    }

    // Room ID validation: 8-16 alphanumeric/hyphen characters only
    if (!/^[a-zA-Z0-9_-]{4,32}$/.test(roomId)) {
      return NextResponse.json(
        { error: 'Malformed room identifier.' },
        { status: 400 }
      );
    }

    const roomMeta = await createServerRoomAsync(
      roomId,
      salt,
      authCommitment,
      wrappedSecretBundle,
      !!oneTimeAccess,
      requirePass !== undefined ? !!requirePass : true,
      accessMode || (requirePass === false ? 'without_pass' : 'with_pass'),
      authResult.creatorId ? String(authResult.creatorId).trim() : undefined
    );

    return NextResponse.json({
      success: true,
      room: {
        id: roomMeta.id,
        salt: roomMeta.salt,
        createdAt: roomMeta.createdAt,
        oneTimeAccess: roomMeta.oneTimeAccess,
        state: roomMeta.state,
        requirePass: roomMeta.requirePass,
        accessMode: roomMeta.accessMode,
        creatorId: roomMeta.creatorId
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initialize chamber.' }, { status: 500 });
  }
}
