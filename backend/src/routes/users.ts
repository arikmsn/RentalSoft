import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/technicians', authenticate, async (req: AuthRequest, res) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: 'technician', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(technicians);
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
