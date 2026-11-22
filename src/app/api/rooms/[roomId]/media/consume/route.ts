import { NextResponse } from 'next/server';
import {
  getServerRoomAsync,
  extractAuthProof,
  verifyRoomAuthAsync,
  consumeAndRetrieveMediaAsync
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

    // Verify room participant authorization with method and pathname binding
    const authProof = extractAuthProof(request);
    const pathname = new URL(request.url).pathname;
    const isAuthorized = await verifyRoomAuthAsync(roomId, authProof, request.method, pathname);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized room participant.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const mediaId = body?.mediaId || body?.attachmentId;

    if (!mediaId || typeof mediaId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid mediaId parameter.' }, { status: 400 });
    }

    const media = await consumeAndRetrieveMediaAsync(roomId, mediaId);
    if (!media) {
      // 410 Gone: Already consumed or purged
      return NextResponse.json(
        { error: 'Media has already been viewed and permanently erased.' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        mediaId: media.mediaId,
        media: {
          mediaId: media.mediaId,
          ciphertext: media.ciphertext,
          iv: media.iv,
          mimeType: media.mimeType,
          size: media.size,
          timestamp: media.timestamp
        },
        consumedAt: Date.now()
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process media consumption.' }, { status: 500 });
  }
}
