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
  const name = process.env.BREVO_SENDER_NAME || 'ENCLAVE Security';
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
    replyTo: payload.replyTo || { email: 'enclave.support.legal@gmail.com', name: 'ENCLAVE Support' }
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
 * Generates responsive, forest-green branded HTML and plain-text email template for verification.
 */
export function renderVerificationEmail(options: {
  recipientName: string;
  verificationUrl: string;
  expiresInMinutes?: number;
}): { html: string; text: string } {
  const { recipientName, verificationUrl, expiresInMinutes = 30 } = options;
  const nameSafe = recipientName.replace(/[<>&"']/g, '');

  const text = `Welcome to ENCLAVE.

Verify your email address to finish setting up your account.

Your private conversations are designed to stay private. ENCLAVE will never ask you to share your password or encryption keys by email.

Click this link to verify your email address:
${verificationUrl}

This link expires in ${expiresInMinutes} minutes. If you did not create this account, you can ignore this email.

— ENCLAVE Team
Support: enclave.support.legal@gmail.com
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your ENCLAVE email address</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FAFAF8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111111;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #FAFAF8;
      padding: 40px 16px;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E4E4DF;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      padding: 32px 36px 20px 36px;
      border-bottom: 1px solid #E4E4DF;
      background-color: #FFFFFF;
    }
    .brand-title {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #174A3A;
      margin: 0;
    }
    .brand-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      color: #8A8A8A;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .body {
      padding: 36px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111111;
      margin: 0 0 16px 0;
    }
    .lead {
      font-size: 15px;
      color: #333333;
      margin: 0 0 18px 0;
    }
    .security-notice {
      background-color: #F4F4F0;
      border-left: 3px solid #174A3A;
      padding: 14px 16px;
      font-size: 13px;
      color: #555555;
      margin: 24px 0;
      border-radius: 0 4px 4px 0;
    }
    .btn-container {
      margin: 32px 0 28px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #174A3A;
      color: #FFFFFF !important;
      text-decoration: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 13px 28px;
      border-radius: 6px;
    }
    .fallback-link {
      font-size: 12px;
      color: #777777;
      word-break: break-all;
      margin-top: 24px;
      line-height: 1.5;
    }
    .fallback-link a {
      color: #174A3A;
      text-decoration: underline;
    }
    .footer {
      padding: 24px 36px;
      background-color: #FAFAF8;
      border-top: 1px solid #E4E4DF;
      font-size: 11px;
      color: #8A8A8A;
      line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">ENCLAVE</h1>
        <div class="brand-tag">EPHEMERAL END-TO-END ENCRYPTED COMMS</div>
      </div>
      <div class="body">
        <p class="greeting">Welcome to ENCLAVE, ${nameSafe || 'User'}.</p>
        <p class="lead">Verify your email address to finish setting up your account.</p>
        
        <div class="security-notice">
          <strong>Security invariant:</strong> Your private conversations are designed to stay private. ENCLAVE will never ask you to share your password or encryption keys by email.
        </div>

        <div class="btn-container">
          <a href="${verificationUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
        </div>

        <div class="fallback-link">
          This link expires in <strong>${expiresInMinutes} minutes</strong>. If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </div>
      </div>
      <div class="footer">
        If you did not create this account, you can safely ignore this email.<br>
        Questions? Contact <a href="mailto:enclave.support.legal@gmail.com" style="color: #174A3A; text-decoration: none;">enclave.support.legal@gmail.com</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { html, text };
}
