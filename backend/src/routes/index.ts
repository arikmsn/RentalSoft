import { Router } from 'express';
import authRoutes from './auth';
import equipmentRoutes from './equipment';
import sitesRoutes from './sites';
import workOrdersRoutes from './workorders';
import dashboardRoutes from './dashboard';
import demoRoutes from './demo';
import usersRoutes from './users';

const router = Router();

router.use('/auth', authRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/sites', sitesRoutes);
router.use('/workorders', workOrdersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/demo', demoRoutes);
router.use('/users', usersRoutes);

export default router;
