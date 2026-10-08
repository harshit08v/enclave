import { NextResponse } from 'next/server';
import { updateRoomPresence } from '@/lib/serverRoomStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { action, participantId } = body;

    if (!participantId || !action) {
      return NextResponse.json({ error: 'Invalid presence payload.' }, { status: 400 });
    }

    if (!['join', 'heartbeat', 'leave', 'destroy', 'im_here'].includes(action)) {
      return NextResponse.json({ error: 'Invalid presence action.' }, { status: 400 });
    }

    const result = updateRoomPresence(roomId, participantId, action);
    if (!result) {
      return NextResponse.json({ error: 'Room not found, restricted, or destroyed.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: 'Presence synchronization error.' }, { status: 500 });
  }
}
