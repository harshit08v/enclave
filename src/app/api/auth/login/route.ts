import { NextResponse } from 'next/server';
import { authenticateServerUserAsync } from '@/lib/serverUserStore';
import { getTrustedClientIp, checkRateLimitAsync, recordFailedAttemptAsync } from '@/lib/serverRoomStore';

export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Authoritative server-side password authentication.
 * Rejects unverified accounts with HTTP 403 and requiresVerification: true.
 */
export async function POST(request: Request) {
  const clientIp = getTrustedClientIp(request);
  const rateKey = `login_${clientIp}`;

  const rateCheck = await checkRateLimitAsync(rateKey);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Please wait ${rateCheck.retryAfter} seconds.` },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter || 300) }
      }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      await recordFailedAttemptAsync(rateKey);
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      await recordFailedAttemptAsync(rateKey);
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    const authResult = await authenticateServerUserAsync({
      email: email.trim(),
      password,
      ip: clientIp
    });

    if (!authResult.success) {
      // If blocked specifically due to unverified email
      if (authResult.requiresVerification) {
        return NextResponse.json(
          {
            error: authResult.error || 'This email address has not been verified yet.',
            requiresVerification: true,
            email: authResult.user?.email || email.trim(),
            userId: authResult.user?.id
          },
          { status: 403 }
        );
      }

      // Invalid credentials
      await recordFailedAttemptAsync(rateKey);
      return NextResponse.json(
        { error: authResult.error || 'Invalid email address or password.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: authResult.user
    });
  } catch {
    return NextResponse.json({ error: 'Malformed login request.' }, { status: 400 });
  }
}
