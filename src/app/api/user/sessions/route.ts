import { NextResponse } from 'next/server';
import { authenticateServerRequest } from '@/lib/serverAuth';
import { getAccountAdminStoreAdapter } from '@/lib/serverAccountAdminAdapter';

/**
 * GET /api/user/sessions
 * Returns authoritative list of active sessions for authenticated user.
 * Strictly sanitizes sensitive token hashes and secrets before response.
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateServerRequest(request);
    if (!auth.authenticated || !auth.uid) {
      return NextResponse.json({ error: auth.error || 'Authentication required.' }, { status: 401 });
    }

    const adapter = getAccountAdminStoreAdapter();
    const sessions = adapter.listUserSessions ? await adapter.listUserSessions(auth.uid) : [];

    const sanitized = sessions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ip: s.ip,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.id === auth.sessionId || (auth.tokenHash ? s.tokenHash === auth.tokenHash : false)
    }));

    return NextResponse.json({ sessions: sanitized });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve active sessions.' }, { status: 500 });
  }
}

/**
 * POST /api/user/sessions/revoke
 * Revokes a specific session or all other sessions.
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateServerRequest(request);
    if (!auth.authenticated || !auth.uid) {
      return NextResponse.json({ error: auth.error || 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { sessionId, allOther } = body || {};

    const adapter = getAccountAdminStoreAdapter();

    if (allOther) {
      const revokedCount = adapter.revokeAllOtherUserSessions
        ? await adapter.revokeAllOtherUserSessions(auth.uid, auth.sessionId || '')
        : 0;
      return NextResponse.json({ success: true, revokedCount });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId parameter.' }, { status: 400 });
    }

    const revoked = adapter.revokeUserSession
      ? await adapter.revokeUserSession(auth.uid, sessionId.trim())
      : false;

    if (!revoked) {
      return NextResponse.json({ error: 'Session not found or already revoked.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to revoke session.' }, { status: 500 });
  }
}
