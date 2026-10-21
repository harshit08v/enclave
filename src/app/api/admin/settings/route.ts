import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import { getPlatformSettingsAsync, updatePlatformSettingsAsync } from '@/lib/serverSettingsStore';
import { recordAuditEventAsync } from '@/lib/serverAuditStore';
import { getTrustedClientIp } from '@/lib/serverRoomStore';

export const runtime = 'nodejs';

/**
 * GET /api/admin/settings
 * Returns current runtime platform configuration.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const settings = await getPlatformSettingsAsync();
  return NextResponse.json({ settings });
}

/**
 * POST /api/admin/settings
 * Updates platform configuration with bounds validation and audit tracking.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, true);
  if (!auth.authenticated || !auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const clientIp = getTrustedClientIp(request);

  try {
    const body = await request.json();
    const result = await updatePlatformSettingsAsync(body, auth.session.username);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await recordAuditEventAsync({
      adminUser: auth.session.username,
      action: 'SETTINGS_UPDATE',
      status: 'SUCCESS',
      ip: clientIp,
      metadata: { updatedFields: Object.keys(body || {}) }
    });

    return NextResponse.json({ success: true, settings: result.settings });
  } catch {
    return NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 });
  }
}
