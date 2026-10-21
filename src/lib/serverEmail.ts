/**
 * ENCLAVE Server Email Client — Brevo (Sendinblue) Transactional API V3
 * Uses native fetch with HTTPS to Brevo REST API endpoints.
 * Never exposes BREVO_API_KEY to the client bundle.
 */

export interface BrevoEmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: { email: string; name?: string };
}

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mocked?: boolean;
}

/**
 * Checks if Brevo is configured with valid environment variables.
 */
export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim().length > 10);
}

/**
 * Retrieves the application base URL for generating verification links.
 * Priority: APP_BASE_URL -> NEXT_PUBLIC_APP_URL -> VERCEL_URL -> localhost fallback.
 */
export function getAppBaseUrl(req?: Request): string {
  const configured = process.env.APP_URL || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim().replace(/\/+$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }

  if (req) {
    try {
      const url = new URL(req.url);
      return `${url.protocol}//${url.host}`;
    } catch {
      // ignore
    }
  }

  return 'http://localhost:3000';
}

/**
 * Gets verified sender details from environment or default configuration.
 */
export function getBrevoSender(): { email: string; name: string } {
  const email = process.env.BREVO_SENDER_EMAIL || 'enclave.support.legal@gmail.com';
  const name = process.env.BREVO_SENDER_NAME || 'enclave.verify';
  return { email: email.trim(), name: name.trim() };
}

/**
 * Sends a transactional email using Brevo's REST API (v3/smtp/email).
 * Never silently fakes successful delivery when Brevo is unconfigured or fails.
 */
export async function sendBrevoEmail(payload: BrevoEmailPayload): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: false,
      error: 'Brevo email service is not configured. Set BREVO_API_KEY in .env.local.'
    };
  }

  const sender = getBrevoSender();

  const body = {
    sender,
    to: payload.to,
    subject: payload.subject,
    htmlContent: payload.htmlContent,
    textContent: payload.textContent || undefined,
    replyTo: payload.replyTo || { email: 'enclave.support.legal@gmail.com', name: 'enclave.verify' }
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey.trim()
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMsg = data?.message || data?.error || `Brevo API HTTP ${response.status}`;
      if (response.status === 401 && (String(errorMsg).includes('unrecognised IP') || String(errorMsg).includes('unauthorized') || String(errorMsg).includes('unauthorised'))) {
        errorMsg = 'Brevo IP restriction active: Current IP address is not authorized in Brevo Dashboard (https://app.brevo.com/security/authorised_ips).';
      }
      console.error(`[ENCLAVE BREVO ERROR] API HTTP ${response.status}:`, errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }

    return {
      success: true,
      messageId: data?.messageId || `brevo_${Date.now()}`,
      mocked: false
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error reaching Brevo API';
    console.error('[ENCLAVE BREVO NETWORK ERROR]:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Generates an ultra-modern, responsive HTML & plain-text email template with embedded brand logo.
 */
export function renderVerificationEmail(options: {
  recipientName: string;
  verificationUrl: string;
  expiresInMinutes?: number;
  baseUrl?: string;
}): { html: string; text: string } {
  const { recipientName, verificationUrl, expiresInMinutes = 30 } = options;
  const nameSafe = recipientName.replace(/[<>&"']/g, '');
  const appBaseUrl = options.baseUrl || getAppBaseUrl();
  const logoUrl = `${appBaseUrl}/brand-logo.jpg`;

  const text = `ENCLAVE // VERIFIED DISPATCH (enclave.verify)
==================================================

Welcome to ENCLAVE, ${nameSafe || 'User'}.

Verify your email address to complete your account setup and activate your zero-knowledge encryption credentials.

VERIFICATION LINK:
${verificationUrl}

SECURITY INVARIANT:
• This link will automatically expire in ${expiresInMinutes} minutes.
• ENCLAVE operates on zero persistent plaintext storage.
• We will NEVER ask you for your password or encryption keys.

If you did not register for this account, you can safely ignore this email.

— ENCLAVE Security Dispatch
Support: enclave.support.legal@gmail.com
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your ENCLAVE account</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0e12;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0c0e12;
      padding: 48px 16px;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #12151c;
      border: 1px solid #1e2430;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 36px 36px 24px 36px;
      border-bottom: 1px solid #1e2430;
      background: linear-gradient(180deg, #161a23 0%, #12151c 100%);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 3px;
      color: #ffffff;
      margin: 0;
    }
    .brand-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .body {
      padding: 36px;
      line-height: 1.6;
    }
    .headline {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px 0;
      letter-spacing: -0.3px;
    }
    .greeting {
      font-size: 15px;
      color: #cbd5e1;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }
    .security-notice {
      background-color: #171c26;
      border: 1px solid #232b3a;
      border-left: 3px solid #10b981;
      padding: 16px 18px;
      font-size: 13px;
      color: #94a3b8;
      margin: 24px 0;
      border-radius: 8px;
      line-height: 1.5;
    }
    .security-notice strong {
      color: #e2e8f0;
    }
    .btn-container {
      margin: 32px 0 28px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.8px;
      padding: 15px 36px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }
    .fallback-box {
      background-color: #0d1017;
      border: 1px solid #1a202c;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 28px;
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
      line-height: 1.6;
    }
    .fallback-box a {
      color: #34d399;
      text-decoration: underline;
    }
    .footer {
      padding: 24px 36px;
      background-color: #0e1117;
      border-top: 1px solid #1e2430;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .footer a {
      color: #94a3b8;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="middle" width="56">
              <img src="${logoUrl}" alt="ENCLAVE Logo" width="48" height="48" style="border-radius: 12px; display: block; border: 1px solid #232b3a;" />
            </td>
            <td valign="middle" style="padding-left: 14px;">
              <h1 class="brand-title">ENCLAVE</h1>
              <div class="brand-tag">EPHEMERAL END-TO-END ENCRYPTED COMMS</div>
            </td>
          </tr>
        </table>
      </div>
      <div class="body">
        <div class="badge">
          <span>●</span>
          <span>DISPATCH FROM ENCLAVE.VERIFY</span>
        </div>

        <h2 class="headline">Verify your private credentials</h2>
        <p class="greeting">
          Hello <strong>${nameSafe || 'User'}</strong>,<br><br>
          A private ENCLAVE account was registered with your email address. Verify your account to finalize end-to-end encryption keys and join secure rooms.
        </p>
        
        <div class="btn-container">
          <a href="${verificationUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
        </div>

        <div class="security-notice">
          <strong>🔒 Zero-Knowledge Guarantee:</strong> ENCLAVE operates on zero persistent plaintext storage. ENCLAVE will never ask you to share your password or encryption keys by email. This verification link expires in <strong>${expiresInMinutes} minutes</strong>.
        </div>

        <div class="fallback-box">
          If the button above does not open, paste this link into your browser:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </div>
      </div>
      <div class="footer">
        Dispatched by <strong>enclave.verify</strong> · ENCLAVE Security Architecture<br>
        If you did not initiate this request, you can safely ignore this message.<br>
        Support: <a href="mailto:enclave.support.legal@gmail.com">enclave.support.legal@gmail.com</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { html, text };
}

/**
 * Generates an ultra-modern, responsive HTML & plain-text password reset email template.
 */
export function renderPasswordResetEmail(options: {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes?: number;
  baseUrl?: string;
}): { html: string; text: string } {
  const { recipientName, resetUrl, expiresInMinutes = 20 } = options;
  const nameSafe = recipientName.replace(/[<>&"']/g, '');
  const appBaseUrl = options.baseUrl || getAppBaseUrl();
  const logoUrl = `${appBaseUrl}/brand-logo.jpg`;

  const text = `ENCLAVE // SECURITY DISPATCH (enclave.verify)
==================================================

Password Reset Request for ${nameSafe || 'User'}.

We received a request to reset the password for your ENCLAVE account. Choose a new password by clicking the link below:

PASSWORD RESET LINK:
${resetUrl}

SECURITY INVARIANTS:
• This single-use reset link expires in ${expiresInMinutes} minutes.
• If you did not request a password reset, please ignore this message. Your existing credentials remain secure.
• ENCLAVE will NEVER ask you for your password, recovery secrets, or encryption keys.

— ENCLAVE Security Dispatch
Support: enclave.support.legal@gmail.com
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your ENCLAVE password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0e12;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0c0e12;
      padding: 48px 16px;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #12151c;
      border: 1px solid #1e2430;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 36px 36px 24px 36px;
      border-bottom: 1px solid #1e2430;
      background: linear-gradient(180deg, #161a23 0%, #12151c 100%);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.3);
      color: #facc15;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 3px;
      color: #ffffff;
      margin: 0;
    }
    .brand-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .body {
      padding: 36px;
      line-height: 1.6;
    }
    .headline {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px 0;
      letter-spacing: -0.3px;
    }
    .greeting {
      font-size: 15px;
      color: #cbd5e1;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }
    .security-notice {
      background-color: #171c26;
      border: 1px solid #232b3a;
      border-left: 3px solid #facc15;
      padding: 16px 18px;
      font-size: 13px;
      color: #94a3b8;
      margin: 24px 0;
      border-radius: 8px;
      line-height: 1.5;
    }
    .security-notice strong {
      color: #e2e8f0;
    }
    .btn-container {
      margin: 32px 0 28px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.8px;
      padding: 15px 36px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }
    .fallback-box {
      background-color: #0d1017;
      border: 1px solid #1a202c;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 28px;
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
      line-height: 1.6;
    }
    .fallback-box a {
      color: #34d399;
      text-decoration: underline;
    }
    .footer {
      padding: 24px 36px;
      background-color: #0e1117;
      border-top: 1px solid #1e2430;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .footer a {
      color: #94a3b8;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="middle" width="56">
              <img src="${logoUrl}" alt="ENCLAVE Logo" width="48" height="48" style="border-radius: 12px; display: block; border: 1px solid #232b3a;" />
            </td>
            <td valign="middle" style="padding-left: 14px;">
              <h1 class="brand-title">ENCLAVE</h1>
              <div class="brand-tag">EPHEMERAL END-TO-END ENCRYPTED COMMS</div>
            </td>
          </tr>
        </table>
      </div>
      <div class="body">
        <div class="badge">
          <span>●</span>
          <span>PASSWORD RESET DISPATCH</span>
        </div>

        <h2 class="headline">Reset your ENCLAVE password</h2>
        <p class="greeting">
          Hello <strong>${nameSafe || 'User'}</strong>,<br><br>
          We received a request to reset the password for your ENCLAVE account. Click the button below to choose a new password:
        </p>
        
        <div class="btn-container">
          <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
        </div>

        <div class="security-notice">
          <strong>🔒 Security Invariant:</strong> This single-use password reset link will automatically expire in <strong>${expiresInMinutes} minutes</strong>. If you did not initiate this request, you can safely ignore this email; your existing credentials remain active and unchanged.
        </div>

        <div class="fallback-box">
          If the button above does not open, paste this link into your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </div>
      </div>
      <div class="footer">
        Dispatched by <strong>enclave.verify</strong> · ENCLAVE Security Architecture<br>
        Support: <a href="mailto:enclave.support.legal@gmail.com">enclave.support.legal@gmail.com</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { html, text };
}

