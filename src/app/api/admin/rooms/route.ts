import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import { destroyServerRoomAsync, getTrustedClientIp } from '@/lib/serverRoomStore';
import { getRoomStoreAdapter } from '@/lib/serverRoomAdapter';
import { recordAuditEventAsync } from '@/lib/serverAuditStore';

export const runtime = 'nodejs';

/**
 * Helper to mask room IDs for privacy preservation (e.g., ****-4a2c)
 */
function maskRoomId(roomId: string): string {
  if (!roomId || roomId.length < 8) return '****-room';
  return `****-${roomId.slice(-4)}`;
}

/**
 * GET /api/admin/rooms
 * Returns operational metadata for active rooms with masked room identifiers.
 * Zero plaintext messages or secret keys are stored or returned.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const stateFilter = searchParams.get('state');

  const roomsList = [];
  const adapter = getRoomStoreAdapter();
  const allRooms = await adapter.listRooms();

  for (const [roomId, record] of allRooms) {
    if (stateFilter && record.meta.state !== stateFilter) {
      continue;
    }

    roomsList.push({
      id: roomId, // Used by admin action handler to terminate
      maskedId: maskRoomId(roomId),
      state: record.meta.state,
      participantCount: record.activeSockets.size,
      accessMode: record.meta.accessMode || (record.meta.requirePass ? 'with_pass' : 'without_pass'),
      oneTimeAccess: record.meta.oneTimeAccess,
      createdAt: record.meta.createdAt,
      lastActivity: record.lastActivity,
      encryptedPacketsCount: record.recentPackets.length,
      encryptedMediaCount: record.encryptedMedia.size
    });
  }

  // Sort by newest activity first
  roomsList.sort((a, b) => b.lastActivity - a.lastActivity);

  return NextResponse.json({
    rooms: roomsList,
    total: roomsList.length
  });
}

/**
 * POST /api/admin/rooms
 * Authoritatively terminates a room with mandatory reason requirement.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, true);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const clientIp = getTrustedClientIp(request);

  try {
    const body = await request.json();
    const { action, roomId, reason } = body || {};

    if (action !== 'terminate') {
      return NextResponse.json({ error: 'Unsupported room action.' }, { status: 400 });
    }

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ error: 'Room ID is required.' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A specific operational reason (minimum 5 characters) is required for room termination.' },
        { status: 400 }
      );
    }

    const adapter = getRoomStoreAdapter();
    const roomRecord = await adapter.getRoom(roomId);
    if (!roomRecord) {
      return NextResponse.json({ error: 'Room not found or already destroyed.' }, { status: 404 });
    }

    const maskedId = maskRoomId(roomId);
    const trimmedReason = reason.trim();

    // Destroy room authoritatively
    await destroyServerRoomAsync(roomId, `Admin termination: ${trimmedReason}`);

    // Record audit event
    await recordAuditEventAsync({
      adminUser: auth.session.username,
      action: 'ROOM_TERMINATE',
      target: maskedId,
      reason: trimmedReason,
      status: 'SUCCESS',
      ip: clientIp,
      metadata: {
        participantCountAtTermination: roomRecord.activeSockets.size,
        previousState: roomRecord.meta.state
      }
    });

    return NextResponse.json({
      success: true,
      message: `Room ${maskedId} terminated successfully.`,
      maskedId
    });
  } catch {
    return NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 });
  }
}
