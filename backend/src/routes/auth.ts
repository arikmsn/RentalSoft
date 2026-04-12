import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkRateLimit, clearRateLimit } from '../lib/rateLimit';
import { logLoginSuccess, logLoginFailed, logAdminAction } from '../lib/securityLog';

const router = Router();

const MIN_PASSWORD_LENGTH = 10;
const BCRYPT_ROUNDS = 12;

function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

async function handleLogin(req: any, res: any, tenantSlugFromRoute?: string | null) {
  const clientIp = getClientIp(req);

  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.retryAfter || 0) / 1000);
    logLoginFailed(null, req, 'RATE_LIMITED', { tenantSlug: tenantSlugFromRoute || null });
    return res.status(429).json({
      status: 'rate_limited',
      message: 'Too many login attempts. Please try again later.',
      retryAfter,
    });
  }

  try {
    const { username: loginUsername, password } = req.body;

    if (!loginUsername || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    let tenantId: string | null = null;
    let resolvedTenantSlug: string | null = tenantSlugFromRoute || null;

    if (tenantSlugFromRoute) {
      const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlugFromRoute } });
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      if (tenant.status === 'suspended') {
        return res.status(403).json({ message: 'העסק מושהה. יש לפנות לתמיכה.' });
      }
      if (tenant.status === 'archived') {
        return res.status(403).json({ message: 'העסק אינו פעיל. יש לפנות לתמיכה.' });
      }
      if (!tenant.isActive) {
        return res.status(403).json({ message: 'העסק אינו פעיל. יש לפנות לתמיכה.' });
      }
      tenantId = tenant.id;
      resolvedTenantSlug = tenant.slug;
    } else {
      const defaultTenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
      if (defaultTenant) {
        tenantId = defaultTenant.id;
        resolvedTenantSlug = defaultTenant.slug;
      }
    }

    let user: any = null;

    if (tenantId) {
      const memberRecords = await prisma.tenantMembership.findMany({
        where: { tenantId },
        select: { userId: true }
      });
      const memberUserIds = memberRecords.map(m => m.userId);

      if (memberUserIds.length > 0) {
        user = await prisma.user.findFirst({
          where: {
            id: { in: memberUserIds },
            isActive: true,
            OR: [
              { username: loginUsername },
              { email: loginUsername }
            ]
          },
        });
      }
    } else {
      logLoginFailed(null, req, 'NO_TENANT_CONTEXT');
      return res.status(400).json({
        status: 'invalid_request',
        message: 'Tenant context is required for login',
      });
    }

    if (!user || !user.isActive) {
      logLoginFailed(null, req, 'USER_NOT_FOUND', { tenantSlug: resolvedTenantSlug });
      return res.status(401).json({
        status: 'invalid_credentials',
        message: 'Invalid credentials'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'המשתמש מושהה. יש לפנות לתמיכה.' });
    }
    if (user.status === 'archived') {
      return res.status(403).json({ message: 'המשתמש לא פעיל. יש לפנות לתמיכה.' });
    }

    if (tenantId && !user.isSuperAdmin) {
      const membership = await prisma.tenantMembership.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!membership) {
        logLoginFailed(user.id, req, 'TENANT_MEMBERSHIP_MISMATCH', { tenantSlug: resolvedTenantSlug });
        return res.status(401).json({
          status: 'invalid_credentials',
          message: 'Invalid credentials for this tenant'
        });
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logLoginFailed(user.id, req, 'INVALID_PASSWORD', { tenantSlug: resolvedTenantSlug });
      return res.status(401).json({
        status: 'invalid_credentials',
        message: 'Invalid credentials'
      });
    }

    clearRateLimit(req);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const membership = await prisma.tenantMembership.findFirst({
      where: { userId: user.id },
    });

    let finalTenantId: string | null = null;
    let finalTenantSlug: string | null = null;

    if (!user.isSuperAdmin) {
      finalTenantId = tenantId || membership?.tenantId || null;
      if (finalTenantId) {
        const tenant = await prisma.tenant.findUnique({ where: { id: finalTenantId }, select: { slug: true } });
        finalTenantSlug = resolvedTenantSlug || tenant?.slug || null;
      }
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: finalTenantId,
      tenantSlug: finalTenantSlug,
      isSuperAdmin: user.isSuperAdmin || false,
    };

    const token = jwt.sign(
      tokenPayload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    logLoginSuccess(user.id, req, {
      tenantId: finalTenantId,
      tenantSlug: finalTenantSlug,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        tenantId: finalTenantId,
        tenantSlug: finalTenantSlug,
        isSuperAdmin: user.isSuperAdmin || false,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

router.post('/login', async (req, res) => handleLogin(req, res, null));
router.post('/:tenantSlug/login', async (req, res) => handleLogin(req, res, req.params.tenantSlug));

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'technician',
        phone,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;