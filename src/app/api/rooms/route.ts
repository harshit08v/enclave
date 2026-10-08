import { NextResponse } from 'next/server';
import { createServerRoom, checkRateLimit, recordFailedAttempt } from '@/lib/serverRoomStore';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`create_${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before creating new rooms.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { roomId, salt, authCommitment, wrappedSecretBundle, oneTimeAccess, requirePass, accessMode } = body;

    if (!roomId || !salt || !authCommitment || !wrappedSecretBundle || !wrappedSecretBundle.wrappedKey || !wrappedSecretBundle.iv) {
      recordFailedAttempt(`create_${ip}`);
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

    const roomMeta = createServerRoom(
      roomId,
      salt,
      authCommitment,
      wrappedSecretBundle,
      !!oneTimeAccess,
      requirePass !== undefined ? !!requirePass : true,
      accessMode || (requirePass === false ? 'without_pass' : 'with_pass')
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
        accessMode: roomMeta.accessMode
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initialize chamber.' }, { status: 500 });
  }
}
