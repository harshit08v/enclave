import { NextResponse } from 'next/server';
import {
  checkAdminLoginRateLimitAsync,
  recordFailedAdminLoginAsync,
  resetAdminLoginRateLimitAsync,
  verifyAdminCredentials,
  createAdminSessionAsync,
  revokeAdminSessionAsync,
  authenticateAdminRequestAsync
} from '@/lib/serverAdminStore';
import { getTrustedClientIp } from '@/lib/serverRoomStore';

export const runtime = 'nodejs';

/**
 * GET /api/admin/auth
 * Checks active session status and returns CSRF token + user details.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: auth.session.username,
      lastActive: auth.session.lastActive,
      expiresAt: auth.session.expiresAt
    },
    csrfToken: auth.session.csrfToken
  });
}

/**
 * POST /api/admin/auth
 * Authenticates admin credentials with brute force rate limiting.
 */
export async function POST(request: Request) {
  const clientIp = getTrustedClientIp(request);

  // Rate limit check
  const rateLimit = await checkAdminLoginRateLimitAsync(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many failed login attempts. Account locked for ${rateLimit.retryAfter} seconds.` },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter || 900) }
      }
    );
  }

  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      await recordFailedAdminLoginAsync(clientIp);
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const isValid = verifyAdminCredentials(username.trim(), password);
    if (!isValid) {
      await recordFailedAdminLoginAsync(clientIp);
      return NextResponse.json({ error: 'Invalid admin username or password.' }, { status: 401 });
    }

    // Success: reset rate limit and create session concurrently
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const [session] = await Promise.all([
      createAdminSessionAsync(username.trim(), clientIp, userAgent),
      resetAdminLoginRateLimitAsync(clientIp)
    ]);

    const response = NextResponse.json({
      success: true,
      user: {
        username: session.username,
        expiresAt: session.expiresAt
      },
      csrfToken: session.csrfToken
    });

    // Set secure HttpOnly cookie
    response.cookies.set('enclave_admin_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600 // 1 hour
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/auth
 * Logs out and revokes admin session.
 */
export async function DELETE(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  const clientIp = getTrustedClientIp(request);

  if (auth.session) {
    await revokeAdminSessionAsync(auth.session.token, clientIp);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('enclave_admin_session');
  return response;
}
