import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import { getAccountAdminStoreAdapter } from '@/lib/serverAccountAdminAdapter';
import { getRoomStoreAdapter } from '@/lib/serverRoomAdapter';

export const runtime = 'nodejs';

/**
 * GET /api/admin/users
 * Returns authoritative user account analytics and directory.
 * Passwords and raw verification tokens are strictly excluded.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim().toLowerCase();
  const filter = url.searchParams.get('filter') || 'all'; // all, verified, unverified, loggedin

  const accountAdapter = getAccountAdminStoreAdapter();
  const roomAdapter = getRoomStoreAdapter();

  const [allUsers, allRooms] = await Promise.all([
    Promise.resolve(accountAdapter.listAllUsers()).catch(() => []),
    Promise.resolve(roomAdapter.listRooms()).catch(() => [])
  ]);

  const now = Date.now();

  // Calculate online presence from active rooms
  let activeRoomParticipants = 0;
  let totalConnectedSockets = 0;
  for (const [, record] of allRooms) {
    if (record.meta.state !== 'DESTROYED' && record.meta.state !== 'DESTROYING') {
      totalConnectedSockets += record.activeSockets?.size || 0;
      if (record.participantHeartbeats) {
        for (const [, heartbeat] of record.participantHeartbeats) {
          if (now - heartbeat < 45000) {
            activeRoomParticipants++;
          }
        }
      }
    }
  }

  const totalAccounts = allUsers.length;
  const verifiedAccounts = allUsers.filter(u => u.isVerified).length;
  const unverifiedAccounts = allUsers.filter(u => !u.isVerified).length;
  const loggedInCount = allUsers.filter(u => u.lastLoginAt && u.lastLoginAt > 0).length;

  const recentLoginActive = allUsers.filter(u => u.lastLoginAt && (now - u.lastLoginAt < 900000)).length;
  const currentlyOnline = Math.max(activeRoomParticipants, totalConnectedSockets, recentLoginActive);

  const googleAccounts = allUsers.filter(u => (u as any).provider === 'google.com').length;

  // Filter and sanitize user records
  let filtered = allUsers.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName || 'Anonymous User',
    avatarSeed: u.avatarSeed || u.displayName || u.id,
    avatarUrl: (u as any).avatarUrl,
    provider: (u as any).provider || 'password',
    isVerified: Boolean(u.isVerified),
    createdAt: u.createdAt,
    verifiedAt: u.verifiedAt,
    lastLoginAt: u.lastLoginAt
  }));

  if (search) {
    filtered = filtered.filter(u =>
      u.email.toLowerCase().includes(search) ||
      u.displayName.toLowerCase().includes(search) ||
      u.id.toLowerCase().includes(search)
    );
  }

  if (filter === 'verified') {
    filtered = filtered.filter(u => u.isVerified);
  } else if (filter === 'unverified') {
    filtered = filtered.filter(u => !u.isVerified);
  } else if (filter === 'loggedin') {
    filtered = filtered.filter(u => u.lastLoginAt && u.lastLoginAt > 0);
  } else if (filter === 'google') {
    filtered = filtered.filter(u => u.provider === 'google.com');
  } else if (filter === 'email') {
    filtered = filtered.filter(u => u.provider !== 'google.com');
  }

  // Sort by createdAt descending (newest first)
  filtered.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({
    metrics: {
      totalAccounts,
      verifiedAccounts,
      unverifiedAccounts,
      googleAccounts,
      loggedInCount,
      currentlyOnline
    },
    users: filtered,
    total: filtered.length
  });
}
