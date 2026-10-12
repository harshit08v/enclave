import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import { getRateLimitStats } from '@/lib/serverRoomStore';
import { getRoomStoreAdapter } from '@/lib/serverRoomAdapter';
import { getRecentIncidentsAsync, getAllBlockedIpsAsync } from '@/lib/serverSecurityStore';
import { getPlatformSettingsAsync } from '@/lib/serverSettingsStore';

export const runtime = 'nodejs';

/**
 * GET /api/admin/overview
 * Real operational telemetry: rooms, sockets, memory, security stats.
 * Zero mock metrics.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  // Count active rooms and connected sockets
  let activeRooms = 0;
  let totalConnectedSockets = 0;
  let waitingRooms = 0;
  let activeMediaCount = 0;
  let transientPacketCount = 0;

  const adapter = getRoomStoreAdapter();
  const allRooms = await adapter.listRooms();

  for (const [, record] of allRooms) {
    if (record.meta.state !== 'DESTROYED' && record.meta.state !== 'DESTROYING') {
      activeRooms++;
      totalConnectedSockets += record.activeSockets.size;
      if (record.meta.state === 'WAITING') waitingRooms++;
      activeMediaCount += record.encryptedMedia.size;
      transientPacketCount += record.recentPackets.length;
    }
  }

  const rateLimitStats = getRateLimitStats();
  const recentIncidents = await getRecentIncidentsAsync(5);
  const blockedIps = await getAllBlockedIpsAsync();
  const settings = await getPlatformSettingsAsync();

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  return NextResponse.json({
    operational: {
      activeRooms,
      waitingRooms,
      totalConnectedSockets,
      activeMediaCount,
      transientPacketCount,
      rateLimitsTracked: rateLimitStats.totalTracked,
      activeRateLimitLockouts: rateLimitStats.activeLockouts,
      blockedIpsCount: blockedIps.length
    },
    system: {
      uptimeSeconds,
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    settings: {
      maintenanceMode: settings.maintenanceMode,
      maxRoomLifetimeMs: settings.maxRoomLifetimeMs,
      waitingInactivityLimitMs: settings.waitingInactivityLimitMs
    },
    recentIncidents
  });
}
