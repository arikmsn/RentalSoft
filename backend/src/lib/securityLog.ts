type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ADMIN_ACTION'
  | 'PASSWORD_CHANGE';

interface SecurityEventMeta {
  tenantId?: string | null;
  tenantSlug?: string | null;
  targetUserId?: string;
  targetTenantId?: string;
  action?: string;
  ip?: string;
}

function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function logSecurityEvent(
  event: SecurityEventType,
  userId: string | null,
  req: any,
  meta: SecurityEventMeta = {}
): void {
  const ip = meta.ip || getClientIp(req);
  const timestamp = new Date().toISOString();

  console.log(
    JSON.stringify({
      type: 'SECURITY',
      event,
      timestamp,
      userId: userId || null,
      ip,
      tenantId: meta.tenantId || null,
      tenantSlug: meta.tenantSlug || null,
      targetUserId: meta.targetUserId || null,
      targetTenantId: meta.targetTenantId || null,
      action: meta.action || null,
    })
  );
}

export function logLoginSuccess(
  userId: string,
  req: any,
  meta: SecurityEventMeta = {}
): void {
  logSecurityEvent('LOGIN_SUCCESS', userId, req, meta);
}

export function logLoginFailed(
  userId: string | null,
  req: any,
  reason: string,
  meta: SecurityEventMeta = {}
): void {
  logSecurityEvent(
    'LOGIN_FAILED',
    userId,
    req,
    { ...meta, action: reason }
  );
}

export function logAdminAction(
  adminUserId: string,
  req: any,
  action: string,
  meta: SecurityEventMeta = {}
): void {
  logSecurityEvent('ADMIN_ACTION', adminUserId, req, { ...meta, action });
}
