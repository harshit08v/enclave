import { NextResponse } from 'next/server';
import { updateRoomPresence, getServerRoom, extractAuthProof, verifyRoomAuth } from '@/lib/serverRoomStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const room = getServerRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }
    if (room.state === 'DESTROYING' || room.state === 'DESTROYED') {
      return NextResponse.json({ error: 'Room is inactive or destroyed.' }, { status: 410 });
    }

    const authProof = extractAuthProof(request);
    if (!verifyRoomAuth(roomId, authProof)) {
      return NextResponse.json({ error: 'Unauthorized room participant.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, participantId, displayName } = body;

    if (!participantId || !action) {
      return NextResponse.json({ error: 'Invalid presence payload.' }, { status: 400 });
    }

    if (!['join', 'heartbeat', 'leave', 'destroy', 'im_here'].includes(action)) {
      return NextResponse.json({ error: 'Invalid presence action.' }, { status: 400 });
    }

    const result = updateRoomPresence(roomId, participantId, action, displayName);
    if (!result) {
      return NextResponse.json({ error: 'Room not found, restricted, or destroyed.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: 'Presence synchronization error.' }, { status: 500 });
  }
}
