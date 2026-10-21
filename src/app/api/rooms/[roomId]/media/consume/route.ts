import { NextResponse } from 'next/server';
import {
  getServerRoomAsync,
  extractAuthProof,
  verifyRoomAuthAsync,
  consumeEncryptedMediaAsync
} from '@/lib/serverRoomStore';

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
      return NextResponse.json({ error: 'Room expired, locked, or destroyed.' }, { status: 410 });
    }

    // Verify room participant authorization
    const authProof = extractAuthProof(request);
    const isAuthorized = await verifyRoomAuthAsync(roomId, authProof);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized room participant.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const mediaId = body?.mediaId;

    if (!mediaId || typeof mediaId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid mediaId parameter.' }, { status: 400 });
    }

    const consumed = await consumeEncryptedMediaAsync(roomId, mediaId);
    if (!consumed) {
      // 410 Gone: Already consumed or purged
      return NextResponse.json(
        { error: 'Media has already been viewed and permanently erased.' },
        { status: 410 }
      );
    }

    return NextResponse.json({ success: true, mediaId, consumedAt: Date.now() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process media consumption.' }, { status: 500 });
  }
}
