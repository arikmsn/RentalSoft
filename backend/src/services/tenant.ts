import { prisma } from '../config/database';

export interface TenantContext {
  tenantId: string | null;
  tenantSlug: string | null;
  isSuperAdmin: boolean;
}

/**
 * Resolve a tenantSlug to tenantId
 * Used for path-based tenant routing (Phase 4+)
 */
export async function resolveTenantBySlug(slug: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return tenant?.id || null;
}

/**
 * Validate that a user has membership for a given tenantId
 * Returns true if user belongs to the tenant
 */
export async function validateUserTenantMembership(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const membership = await prisma.tenantMembership.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
  });
  return !!membership;
}

/**
 * Get tenant context for a user
 * Returns the user's primary tenant membership
 */
export async function getTenantContextForUser(
  userId: string
): Promise<TenantContext | null> {
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId },
  });

  if (!membership) {
    return null;
  }

  let tenantSlug: string | null = null;
  if (membership.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: { slug: true },
    });
    tenantSlug = tenant?.slug || null;
  }

  return {
    tenantId: membership.tenantId || null,
    tenantSlug: tenantSlug || null,
    isSuperAdmin: false, // Will be enriched from User.isSuperAdmin in auth
  };
}

/**
 * Check if a user is a super admin
 */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin || false;
}