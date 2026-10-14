import { NextResponse } from 'next/server';
import {
  registerServerUserAsync,
  getServerUserStatusAsync
} from '@/lib/serverUserStore';
import {
  sendBrevoEmail,
  renderVerificationEmail,
  getAppBaseUrl
} from '@/lib/serverEmail';
import { getTrustedClientIp, checkRateLimitAsync, recordFailedAttemptAsync } from '@/lib/serverRoomStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/register
 * Checks verification status for an email or user ID.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('id') || searchParams.get('email');

  if (!identifier) {
    return NextResponse.json({ error: 'Identifier is required.' }, { status: 400 });
  }

  const status = await getServerUserStatusAsync(identifier);
  return NextResponse.json(
    {
      exists: status.exists,
      isVerified: status.isVerified,
      user: status.user
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    }
  );
}

/**
 * POST /api/auth/register
 * Validates signup inputs on the server, creates unverified user, and dispatches Brevo verification email.
 */
export async function POST(request: Request) {
  const clientIp = getTrustedClientIp(request);
  const rateKey = `signup_${clientIp}`;

  const rateCheck = await checkRateLimitAsync(rateKey);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Too many registration attempts. Please wait ${rateCheck.retryAfter} seconds.` },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter || 300) }
      }
    );
  }

  try {
    const body = await request.json();
    const { id, email, displayName, password } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      await recordFailedAttemptAsync(rateKey);
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      await recordFailedAttemptAsync(rateKey);
      return NextResponse.json({ error: 'Display name must be at least 2 characters.' }, { status: 400 });
    }

    if (password && (typeof password !== 'string' || password.length < 8)) {
      await recordFailedAttemptAsync(rateKey);
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const userId = id && typeof id === 'string' ? id.trim() : `usr_${Math.random().toString(36).substring(2, 9)}`;

    // Create server account in unverified status
    const registerResult = await registerServerUserAsync({
      id: userId,
      email: email.trim(),
      displayName: displayName.trim(),
      password: password ? String(password) : undefined,
      ip: clientIp
    });

    if (!registerResult.success || !registerResult.rawToken) {
      return NextResponse.json(
        { error: registerResult.error || 'Registration failed.' },
        { status: 400 }
      );
    }

    // Build absolute verification link
    const baseUrl = getAppBaseUrl(request);
    const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(registerResult.rawToken)}`;

    // Render Brevo HTML email
    const { html, text } = renderVerificationEmail({
      recipientName: displayName.trim(),
      verificationUrl,
      expiresInMinutes: 30
    });

    // Send via Brevo
    const emailResult = await sendBrevoEmail({
      to: [{ email: email.trim(), name: displayName.trim() }],
      subject: 'Verify your ENCLAVE email address',
      htmlContent: html,
      textContent: text
    });

    if (!emailResult.success) {
      console.error('[ENCLAVE SIGNUP] Brevo email delivery failed:', emailResult.error);
      return NextResponse.json(
        {
          error: 'Account created, but verification email failed to dispatch. Please use "Resend verification" or contact support.',
          deliveryFailed: true,
          userId: registerResult.user?.id
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: 'Check your email to verify your account.',
      email: email.trim(),
      userId: registerResult.user?.id,
      mocked: emailResult.mocked
    });
  } catch {
    return NextResponse.json({ error: 'Malformed registration payload.' }, { status: 400 });
  }
}
