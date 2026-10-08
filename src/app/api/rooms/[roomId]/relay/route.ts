import { NextResponse } from 'next/server';
import { pushEncryptedPacket, getEncryptedPackets } from '@/lib/serverRoomStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const packet = await request.json();

    if (
      !packet ||
      !packet.packetId ||
      !packet.payload ||
      !packet.payload.ciphertext ||
      !packet.payload.iv ||
      typeof packet.sequence !== 'number'
    ) {
      return NextResponse.json({ error: 'Malformed wire packet structure.' }, { status: 400 });
    }

    const success = pushEncryptedPacket(roomId, packet);
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
    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get('since') || '0', 10);

    const packets = getEncryptedPackets(roomId, since);
    return NextResponse.json({ packets });
  } catch (error) {
    return NextResponse.json({ error: 'Relay query failed.' }, { status: 500 });
  }
}
