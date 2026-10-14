import { NextResponse } from 'next/server';
import {
  verifyServerUserTokenAsync,
  resendVerificationEmailTokenAsync,
  getServerUserStatusAsync
} from '@/lib/serverUserStore';
import {
  sendBrevoEmail,
  renderVerificationEmail,
  getAppBaseUrl
} from '@/lib/serverEmail';
import { getTrustedClientIp, checkRateLimitAsync } from '@/lib/serverRoomStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/verify-email
 * Checks real-time verification status for an email or user ID.
 * Used by web clients to auto-detect when a user completes verification on mobile.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('email') || searchParams.get('id');

  if (!identifier) {
    return NextResponse.json({ error: 'Email or ID parameter required.' }, { status: 400 });
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
 * POST /api/auth/verify-email
 * Action: 'verify' (submits token explicitly) OR 'resend' (requests fresh email).
 * Protects against security scanners by requiring explicit POST rather than GET trigger.
 */
export async function POST(request: Request) {
  const clientIp = getTrustedClientIp(request);

  try {
    const body = await request.json();
    const { action, token, email } = body || {};

    // 1. Submit Verification Token
    if (action === 'verify') {
      if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
      }

      const result = await verifyServerUserTokenAsync(token, clientIp);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        alreadyVerified: result.alreadyVerified || false,
        user: {
          id: result.user?.id,
          email: result.user?.email,
          displayName: result.user?.displayName,
          isVerified: true
        }
      });
    }

    // 2. Resend Verification Email
    if (action === 'resend') {
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
      }

      // Rate limit resend per client IP
      const rateKey = `resend_${clientIp}`;
      const rateCheck = await checkRateLimitAsync(rateKey);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: `Too many resend attempts. Please wait ${rateCheck.retryAfter} seconds.` },
          { status: 429 }
        );
      }

      const resendResult = await resendVerificationEmailTokenAsync(email, clientIp);
      if (!resendResult.success) {
        return NextResponse.json(
          { error: resendResult.error, cooldownSeconds: resendResult.cooldownSeconds },
          { status: 429 }
        );
      }

      // If user exists and new rawToken was issued, send Brevo email
      if (resendResult.rawToken && resendResult.user) {
        const baseUrl = getAppBaseUrl(request);
        const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(resendResult.rawToken)}`;

        const { html, text } = renderVerificationEmail({
          recipientName: resendResult.user.displayName,
          verificationUrl,
          expiresInMinutes: 30
        });

        const emailResult = await sendBrevoEmail({
          to: [{ email: resendResult.user.email, name: resendResult.user.displayName }],
          subject: 'Verify your ENCLAVE email address',
          htmlContent: html,
          textContent: text
        });

        if (!emailResult.success) {
          return NextResponse.json(
            { error: 'Failed to deliver verification email. Please try again later.' },
            { status: 502 }
          );
        }
      }

      // Return clean feedback (enumeration-safe)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a new verification link has been dispatched.',
        cooldownSeconds: 60
      });
    }

    return NextResponse.json({ error: 'Unsupported verification action.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 });
  }
}
