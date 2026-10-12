import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import {
  getAllBlockedIpsAsync,
  blockIpAsync,
  unblockIpAsync,
  getRecentIncidentsAsync
} from '@/lib/serverSecurityStore';
import { getTrustedClientIp, isValidIp, rateLimitStore } from '@/lib/serverRoomStore';
import { recordAuditEventAsync } from '@/lib/serverAuditStore';

export const runtime = 'nodejs';

/**
 * GET /api/admin/security
 * Returns active IP blocks, security incidents, and active rate limits.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const blockedIps = await getAllBlockedIpsAsync();
  const incidents = await getRecentIncidentsAsync(100);

  // Collect active rate limit lockouts
  const now = Date.now();
  const activeLockouts = [];
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.lockedUntil > now) {
      activeLockouts.push({
        key,
        attempts: record.attempts,
        lastAttempt: record.lastAttempt,
        remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000)
      });
    }
  }

  return NextResponse.json({
    blockedIps,
    incidents,
    activeLockouts
  });
}

/**
 * POST /api/admin/security
 * Manages IP blocking and unblocking.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, true);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const clientIp = getTrustedClientIp(request);

  try {
    const body = await request.json();
    const { action, ip, reason, durationMs } = body || {};

    if (!ip || !isValidIp(ip.trim())) {
      return NextResponse.json({ error: 'Valid IPv4 or IPv6 address is required.' }, { status: 400 });
    }

    const targetIp = ip.trim();

    if (action === 'block') {
      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        return NextResponse.json({ error: 'A specific reason is required to block an IP address.' }, { status: 400 });
      }

      const duration = typeof durationMs === 'number' && durationMs >= 0 ? durationMs : 3600000;
      const record = await blockIpAsync(targetIp, reason.trim(), duration, auth.session.username);

      await recordAuditEventAsync({
        adminUser: auth.session.username,
        action: 'SECURITY_IP_BLOCK',
        target: targetIp,
        reason: reason.trim(),
        status: 'SUCCESS',
        ip: clientIp,
        metadata: { durationMs: duration }
      });

      return NextResponse.json({ success: true, record });
    }

    if (action === 'unblock') {
      const removed = await unblockIpAsync(targetIp);

      await recordAuditEventAsync({
        adminUser: auth.session.username,
        action: 'SECURITY_IP_UNBLOCK',
        target: targetIp,
        status: removed ? 'SUCCESS' : 'FAILED',
        ip: clientIp
      });

      return NextResponse.json({ success: removed });
    }

    return NextResponse.json({ error: 'Unsupported security action.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 });
  }
}
