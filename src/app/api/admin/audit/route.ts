import { NextResponse } from 'next/server';
import { authenticateAdminRequestAsync } from '@/lib/serverAdminStore';
import { getAuditLogsAsync } from '@/lib/serverAuditStore';

export const runtime = 'nodejs';

/**
 * GET /api/admin/audit
 * Returns append-only audit logs with pagination and search.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdminRequestAsync(request, false);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
  const action = searchParams.get('action') || undefined;
  const adminUser = searchParams.get('adminUser') || undefined;
  const statusParam = searchParams.get('status');

  const status =
    statusParam === 'SUCCESS' || statusParam === 'FAILED' || statusParam === 'REJECTED'
      ? statusParam
      : undefined;

  const result = await getAuditLogsAsync({
    limit,
    offset,
    action,
    adminUser,
    status
  });

  return NextResponse.json({
    logs: result.logs,
    total: result.total,
    limit,
    offset
  });
}
