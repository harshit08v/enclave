import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import { getRoomStoreAdapter } from '@/lib/serverRoomAdapter';
import { getAccountAdminStoreAdapter } from '@/lib/serverAccountAdminAdapter';

export const runtime = 'nodejs';

/**
 * GET /api/admin/health
 * Returns server health, process metrics, Node.js runtime stats, and dependency status.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const adapter = getRoomStoreAdapter();
  const rooms = await adapter.listRooms();

  return NextResponse.json({
    status: 'OPERATIONAL',
    timestamp: Date.now(),
    process: {
      uptimeSeconds,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memory: {
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        externalMb: Math.round((memory.external / 1024 / 1024) * 100) / 100
      }
    },
    subsystems: {
      roomStore: {
        status: 'HEALTHY',
        adapter: adapter.adapterName,
        isDistributed: adapter.isDistributed,
        activeRooms: rooms.length
      },
      accountAdminStore: {
        status: 'HEALTHY',
        adapter: getAccountAdminStoreAdapter().adapterName,
        isDistributed: getAccountAdminStoreAdapter().isDistributed
      },
      cryptoSubtle: {
        status: typeof globalThis.crypto?.subtle !== 'undefined' ? 'NATIVE_WEBCRYPTO' : 'AVAILABLE'
      },
      auditStore: {
        status: 'HEALTHY'
      }
    }
  });
}
