import { NextResponse } from 'next/server';
import {
  pushEncryptedPacketAsync,
  getEncryptedPacketsAsync,
  getServerRoomAsync,
  extractAuthProof,
  verifyRoomAuthAsync
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

    const packet = await request.json();

    const isTyping = packet?.type === 'typing_indicator';

    if (
      !packet ||
      !packet.packetId ||
      !packet.payload ||
      (!isTyping && !packet.payload.ciphertext) ||
      (!isTyping && !packet.payload.iv) ||
      typeof packet.sequence !== 'number' ||
      packet.roomId !== roomId
    ) {
      return NextResponse.json({ error: 'Malformed wire packet structure.' }, { status: 400 });
    }

    // Validate disappearing message timer updates
    if (packet.type === 'disappearing_timer_update') {
      const allowed = [0, 30, 300, 3600, 86400];
      if (typeof packet.disappearingTimerSec !== 'number' || !allowed.includes(packet.disappearingTimerSec)) {
        return NextResponse.json({ error: 'Invalid disappearing message duration.' }, { status: 400 });
      }
    }

    // Validate packet expiration timestamp bounds
    if (packet.expiresAt !== undefined) {
      if (typeof packet.expiresAt !== 'number' || isNaN(packet.expiresAt)) {
        return NextResponse.json({ error: 'Invalid packet expiration format.' }, { status: 400 });
      }
      const now = Date.now();
      if (packet.expiresAt <= now) {
        return NextResponse.json({ error: 'Packet has already expired.' }, { status: 400 });
      }
      if (packet.expiresAt > now + 86400 * 1000 + 60000) {
        return NextResponse.json(
          { error: 'Packet expiration exceeds maximum allowed duration (24 hours).' },
          { status: 400 }
        );
      }
    }

    const success = await pushEncryptedPacketAsync(roomId, packet);
    if (!success) {
      return NextResponse.json({ error: 'Room expired, locked, or destroyed.' }, { status: 410 });
    }

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    return NextResponse.json({ error: 'Relay transmission failed.' }, { status: 500 });
  }
}

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get('since') || '0', 10);
    const cursorParam = searchParams.get('cursor');
    const afterCursor = cursorParam !== null && !isNaN(parseInt(cursorParam, 10))
      ? parseInt(cursorParam, 10)
      : undefined;

    const packets = await getEncryptedPacketsAsync(roomId, since, afterCursor);
    const nextCursor = packets.length > 0 && typeof packets[packets.length - 1].relaySeq === 'number'
      ? packets[packets.length - 1].relaySeq
      : afterCursor;

    return NextResponse.json({ packets, nextCursor });
  } catch (error) {
    return NextResponse.json({ error: 'Relay query failed.' }, { status: 500 });
  }
}
