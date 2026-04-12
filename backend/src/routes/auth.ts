import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Shared login logic
async function handleLogin(req: any, res: any, tenantSlugFromRoute?: string | null) {
  try {
    const { username: loginUsername, password } = req.body;

    if (!loginUsername || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Resolve tenantId from route param or default tenant
    let tenantId: string | null = null;
    let resolvedTenantSlug: string | null = tenantSlugFromRoute || null;

    if (tenantSlugFromRoute) {
      const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlugFromRoute } });
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      tenantId = tenant.id;
      resolvedTenantSlug = tenant.slug;
    } else {
      // Legacy: look up default tenant (backward compatible)
      const defaultTenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
      if (defaultTenant) {
        tenantId = defaultTenant.id;
        resolvedTenantSlug = defaultTenant.slug;
      }
    }

    // Build user query - PRIMARY USERNAME, fallback to email for backward compatibility
    let user: any = null;
    
    // Try username first
    user = await prisma.user.findFirst({
      where: { username: loginUsername, isActive: true },
    });
    
    // Fallback: try email (for old demo accounts)
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: loginUsername, isActive: true },
      });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If tenant-scoped, verify membership (except for super admin)
    if (tenantId && !user.isSuperAdmin) {
      const membership = await prisma.tenantMembership.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!membership) {
        return res.status(401).json({ message: 'Invalid credentials for this tenant' });
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Get tenant membership for tenant context
    const membership = await prisma.tenantMembership.findFirst({
      where: { userId: user.id },
    });

    // Use resolved tenant if not super admin
    let finalTenantId: string | null = null;
    let finalTenantSlug: string | null = null;
    
    if (!user.isSuperAdmin) {
      finalTenantId = tenantId || membership?.tenantId || null;
      if (finalTenantId) {
        const tenant = await prisma.tenant.findUnique({ where: { id: finalTenantId }, select: { slug: true } });
        finalTenantSlug = resolvedTenantSlug || tenant?.slug || null;
      }
    }

    // Generate JWT with tenant context (keep existing fields for backward compatibility)
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
      { expiresIn: '24h' as any }
    );

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

// Route definitions
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

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
      { expiresIn: '24h' as any }
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
