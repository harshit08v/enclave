import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import { getRateLimitStats } from '@/lib/serverRoomStore';
import { getRoomStoreAdapter } from '@/lib/serverRoomAdapter';
import { getAccountAdminStoreAdapter } from '@/lib/serverAccountAdminAdapter';
import { getRecentIncidentsAsync, getAllBlockedIpsAsync } from '@/lib/serverSecurityStore';
import { getPlatformSettingsAsync } from '@/lib/serverSettingsStore';

export const runtime = 'nodejs';

/**
 * GET /api/admin/overview
 * Real operational telemetry: rooms, sockets, accounts, online presence, memory, security stats.
 * Zero mock metrics.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const roomAdapter = getRoomStoreAdapter();
  const accountAdapter = getAccountAdminStoreAdapter();

  // Execute all telemetry gathers concurrently
  const [allRooms, allUsers, recentIncidents, blockedIps, settings] = await Promise.all([
    Promise.resolve(roomAdapter.listRooms()).catch(() => []),
    Promise.resolve(accountAdapter.listAllUsers()).catch(() => []),
    getRecentIncidentsAsync(5),
    getAllBlockedIpsAsync(),
    getPlatformSettingsAsync()
  ]);

  // Count active rooms, connected sockets, and room participants
  let activeRooms = 0;
  let totalConnectedSockets = 0;
  let waitingRooms = 0;
  let activeMediaCount = 0;
  let transientPacketCount = 0;
  let activeRoomParticipants = 0;

  const now = Date.now();

  for (const [, record] of allRooms) {
    if (record.meta.state !== 'DESTROYED' && record.meta.state !== 'DESTROYING') {
      activeRooms++;
      totalConnectedSockets += record.activeSockets?.size || 0;
      if (record.meta.state === 'WAITING') waitingRooms++;
      activeMediaCount += record.encryptedMedia?.size || 0;
      transientPacketCount += record.recentPackets?.length || 0;

      // Count actively beating participants within 45 seconds
      if (record.participantHeartbeats) {
        for (const [, heartbeat] of record.participantHeartbeats) {
          if (now - heartbeat < 45000) {
            activeRoomParticipants++;
          }
        }
      }
    }
  }

  // User Accounts & Login Analytics
  const totalAccounts = allUsers.length;
  const verifiedAccounts = allUsers.filter(u => u.isVerified).length;
  const unverifiedAccounts = allUsers.filter(u => !u.isVerified).length;
  const loggedInCount = allUsers.filter(u => u.lastLoginAt && u.lastLoginAt > 0).length;

  // Active users online (active room participants + recent active logins within 15 minutes)
  const recentLoginActive = allUsers.filter(u => u.lastLoginAt && (now - u.lastLoginAt < 900000)).length;
  const currentlyOnline = Math.max(activeRoomParticipants, totalConnectedSockets, recentLoginActive);

  const rateLimitStats = getRateLimitStats();
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
    userMetrics: {
      totalAccounts,
      verifiedAccounts,
      unverifiedAccounts,
      loggedInCount,
      currentlyOnline
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
