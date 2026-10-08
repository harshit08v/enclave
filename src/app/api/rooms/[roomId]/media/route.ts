import { NextResponse } from 'next/server';
import { getServerRoom, storeEncryptedMedia, getEncryptedMedia, checkRateLimit, recordFailedAttempt } from '@/lib/serverRoomStore';
import { MAX_IMAGE_SIZE, MAX_VIDEO_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/lib/mediaConfig';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    const rateCheck = checkRateLimit(`media_upload_${ip}_${roomId}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Media upload rate limit exceeded.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const room = getServerRoom(roomId);
    if (!room || room.state === 'DESTROYING' || room.state === 'DESTROYED') {
      return NextResponse.json({ error: 'Room is inactive or destroyed.' }, { status: 410 });
    }

    const body = await request.json();
    const { mediaId, ciphertext, iv, mimeType, size } = body;

    if (!mediaId || !ciphertext || !iv || !mimeType || typeof size !== 'number') {
      recordFailedAttempt(`media_upload_${ip}_${roomId}`);
      return NextResponse.json({ error: 'Malformed encrypted media payload.' }, { status: 400 });
    }

    const cleanMime = mimeType.toLowerCase();
    const isImage = ALLOWED_IMAGE_TYPES.includes(cleanMime);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(cleanMime);

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Unsupported media type.' }, { status: 400 });
    }

    if (isImage && size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image exceeds maximum size.' }, { status: 413 });
    }

    if (isVideo && size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: 'Video exceeds maximum size.' }, { status: 413 });
    }

    const stored = storeEncryptedMedia(roomId, {
      mediaId,
      ciphertext,
      iv,
      mimeType: cleanMime,
      size
    });

    if (!stored) {
      return NextResponse.json({ error: 'Failed to store encrypted media.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, mediaId });
  } catch {
    return NextResponse.json({ error: 'Encrypted media relay error.' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json({ error: 'Missing media identifier.' }, { status: 400 });
    }

    const room = getServerRoom(roomId);
    if (!room || room.state === 'DESTROYING' || room.state === 'DESTROYED') {
      return NextResponse.json({ error: 'Room is inactive or destroyed.' }, { status: 410 });
    }

    const media = getEncryptedMedia(roomId, mediaId);
    if (!media) {
      return NextResponse.json({ error: 'Media not found or already dissolved.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      media: {
        mediaId: media.mediaId,
        ciphertext: media.ciphertext,
        iv: media.iv,
        mimeType: media.mimeType,
        size: media.size,
        timestamp: media.timestamp
      }
    });
  } catch {
    return NextResponse.json({ error: 'Media retrieval error.' }, { status: 500 });
  }
}
