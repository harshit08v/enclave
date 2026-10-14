import { NextResponse } from 'next/server';
import {
  requestPasswordResetTokenAsync,
  validatePasswordResetTokenAsync,
  completePasswordResetAsync
} from '@/lib/serverUserStore';
import {
  sendBrevoEmail,
  renderPasswordResetEmail,
  getAppBaseUrl
} from '@/lib/serverEmail';
import { getTrustedClientIp, checkRateLimitAsync, recordFailedAttemptAsync } from '@/lib/serverRoomStore';

export const runtime = 'nodejs';

/**
 * POST /api/auth/reset-password
 * Handles:
 * - action: 'request' -> Initiates password reset & dispatches Brevo transactional email
 * - action: 'verify'  -> Validates token without consuming it
 * - action: 'reset'   -> Atomically updates password and invalidates single-use token
 */
export async function POST(request: Request) {
  const clientIp = getTrustedClientIp(request);
  const ipRateKey = `reset_ip_${clientIp}`;

  const rateCheck = await checkRateLimitAsync(ipRateKey);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: `Too many password reset requests. Please wait ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter || 300) }
      }
    );
  }

  try {
    const body = await request.json();
    const { action, email, token, newPassword } = body || {};

    // 1. ACTION: REQUEST RESET
    if (action === 'request') {
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        await recordFailedAttemptAsync(ipRateKey);
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email address, a password reset link has been dispatched to your inbox.',
          cooldownSeconds: 60
        });
      }

      const resetReq = await requestPasswordResetTokenAsync(email, clientIp);

      if (!resetReq.success) {
        // Cooldown or limits exceeded on a known account
        return NextResponse.json(
          {
            success: false,
            error: resetReq.error || resetReq.message,
            cooldownSeconds: resetReq.cooldownSeconds
          },
          { status: 429 }
        );
      }

      // If account exists and token was issued, dispatch Brevo transactional email
      if (resetReq.rawToken && resetReq.user) {
        const baseUrl = getAppBaseUrl(request);
        const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetReq.rawToken)}`;

        const { html, text } = renderPasswordResetEmail({
          recipientName: resetReq.user.displayName,
          resetUrl,
          expiresInMinutes: 20
        });

        const emailResult = await sendBrevoEmail({
          to: [{ email: resetReq.user.email, name: resetReq.user.displayName }],
          subject: 'Reset your ENCLAVE password',
          htmlContent: html,
          textContent: text
        });

        if (!emailResult.success) {
          console.error('[ENCLAVE RESET PASSWORD] Brevo delivery failed:', emailResult.error);
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to deliver password reset email. Please try again later.'
            },
            { status: 502 }
          );
        }
      }

      // Return enumeration-safe generic response
      return NextResponse.json({
        success: true,
        message: resetReq.message,
        cooldownSeconds: 60
      });
    }

    // 2. ACTION: VERIFY TOKEN
    if (action === 'verify') {
      if (!token || typeof token !== 'string') {
        return NextResponse.json({ valid: false, error: 'Verification token is required.' }, { status: 400 });
      }

      const valResult = await validatePasswordResetTokenAsync(token, clientIp);
      if (!valResult.valid) {
        return NextResponse.json({ valid: false, error: valResult.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        valid: true,
        email: valResult.email
      });
    }

    // 3. ACTION: RESET PASSWORD
    if (action === 'reset') {
      if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      const compResult = await completePasswordResetAsync({
        rawToken: token,
        newPassword,
        ip: clientIp
      });

      if (!compResult.success) {
        await recordFailedAttemptAsync(ipRateKey);
        return NextResponse.json({ error: compResult.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Password has been successfully updated. You may now sign in.'
      });
    }

    return NextResponse.json({ error: 'Unsupported password reset action.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 });
  }
}
