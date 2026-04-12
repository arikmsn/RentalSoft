import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, isSuperAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(isSuperAdmin);

router.post('/reset-demo-data', async (req: Request, res: Response) => {
  try {
    const results: Record<string, number> = {};

    const deletedWOE = await prisma.workOrderEquipment.deleteMany({});
    results.workOrderEquipment = deletedWOE.count;

    const deletedHistory = await prisma.workOrderStatusHistory.deleteMany({});
    results.workOrderStatusHistory = deletedHistory.count;

    const deletedChecklist = await prisma.checklistItem.deleteMany({});
    results.checklistItem = deletedChecklist.count;

    const deletedActivity = await prisma.activityLog.deleteMany({});
    results.activityLog = deletedActivity.count;

    const deletedWorkOrders = await prisma.workOrder.deleteMany({});
    results.workOrder = deletedWorkOrders.count;

    const deletedEquipment = await prisma.equipment.deleteMany({});
    results.equipment = deletedEquipment.count;

    const deletedSites = await prisma.site.deleteMany({});
    results.site = deletedSites.count;

    res.json({
      message: 'Demo data cleared successfully. Settings and users preserved.',
      deleted: results,
    });
  } catch (error) {
    console.error('Error resetting demo data:', error);
    res.status(500).json({ message: 'Server error while resetting data' });
  }
});

router.get('/tenants', async (req: AuthRequest, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(tenants.map(async (t) => {
      const count = await prisma.tenantMembership.count({ where: { tenantId: t.id } });
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.isActive,
        createdAt: t.createdAt,
        userCount: count,
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/tenants', async (req: AuthRequest, res) => {
  try {
    const { name, slug, isActive = true } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ message: 'Slug already exists' });
    }

    const tenant = await prisma.tenant.create({
      data: { name, slug, isActive },
    });

    res.json(tenant);
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/tenants/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, slug, isActive } = req.body;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.tenant.findUnique({ where: { slug } });
      if (slugExists) {
        return res.status(400).json({ message: 'Slug already exists' });
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    res.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(users.map(async (u) => {
      const memberships = await prisma.tenantMembership.findMany({
        where: { userId: u.id },
      });
      const tenantsMap = new Map();
      for (const m of memberships) {
        const t = await prisma.tenant.findUnique({ where: { id: m.tenantId } });
        if (t) {
          tenantsMap.set(m.tenantId, { id: t.id, name: t.name, slug: t.slug });
        }
      }
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        isSuperAdmin: u.isSuperAdmin,
        createdAt: u.createdAt,
        memberships: Array.from(tenantsMap.values()).map((t: any) => ({
          tenantId: t.id,
          tenantName: t.name,
          tenantSlug: t.slug,
        })),
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { name, username, email, password, role = 'technician', tenantId, isActive = true } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    // Check username within tenant context (tenant-scoped uniqueness)
    if (username && tenantId) {
      const membershipUserIds = await prisma.tenantMembership.findMany({
        where: { tenantId },
        select: { userId: true },
      });
      const userIds = membershipUserIds.map(m => m.userId);
      if (userIds.length > 0) {
        const existingUsers = await prisma.user.findMany({
          where: { id: { in: userIds }, username },
        });
        if (existingUsers.length > 0) {
          return res.status(400).json({ message: 'Username already exists in this tenant' });
        }
      }
    }

    // Legacy: check global only if no tenant specified (backward compat)
    if (username && !tenantId) {
      const existingUsername = await prisma.user.findFirst({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData: any = {
      name,
      username,
      password: hashedPassword,
      role,
      isActive,
      isSuperAdmin: false,
    };
    if (email) {
      userData.email = email;
    }

    const user = await prisma.user.create({ data: userData });

    if (tenantId) {
      await prisma.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId,
          role,
        },
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, role, isActive, password, tenantId } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (username && username !== existing.username) {
      if (tenantId) {
        const membershipUserIds = await prisma.tenantMembership.findMany({
          where: { tenantId },
          select: { userId: true },
        });
        const userIds = membershipUserIds.map(m => m.userId);
        if (userIds.length > 0) {
          const existingUsers = await prisma.user.findMany({
            where: { id: { in: userIds }, username },
          });
          if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username already exists in this tenant' });
          }
        }
      } else {
        const usernameExists = await prisma.user.findFirst({ where: { username } });
        if (usernameExists) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      updateData.username = username;
    }
    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email;
    }
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (tenantId) {
      await prisma.tenantMembership.upsert({
        where: { userId_tenantId: { userId: id, tenantId } },
        update: { role },
        create: { userId: id, tenantId, role: role || 'member' },
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.tenantMembership.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;