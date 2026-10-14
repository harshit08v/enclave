import { NextResponse } from 'next/server';
import {
  getServerRoomAsync,
  extractAuthProof,
  verifyRoomAuthAsync
} from '@/lib/serverRoomStore';

const DEFAULT_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

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
      return NextResponse.json({ error: 'Room is expired or destroyed.' }, { status: 410 });
    }

    // Verify room participant authorization
    const authProof = extractAuthProof(request);
    const isAuthorized = await verifyRoomAuthAsync(roomId, authProof);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized participant.' }, { status: 401 });
    }

    const iceServers: RTCIceServer[] = [...DEFAULT_STUN_SERVERS];

    // Optional environment-configured TURN server (never exposed to public client bundle)
    const turnUrl = process.env.TURN_URL;
    const turnUsername = process.env.TURN_USERNAME;
    const turnCredential = process.env.TURN_CREDENTIAL;

    if (turnUrl) {
      const turnServer: RTCIceServer = {
        urls: turnUrl,
        ...(turnUsername ? { username: turnUsername } : {}),
        ...(turnCredential ? { credential: turnCredential } : {})
      };
      iceServers.push(turnServer);
    }

    return NextResponse.json(
      { success: true, iceServers },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve ICE server configuration.' }, { status: 500 });
  }
}
