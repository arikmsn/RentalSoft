import { Router } from 'express';
import authRoutes from './auth';
import equipmentRoutes from './equipment';
import sitesRoutes from './sites';
import workOrdersRoutes from './workorders';
import dashboardRoutes from './dashboard';
import demoRoutes from './demo';
import usersRoutes from './users';
import settingsRoutes from './settings';
import adminRoutes from './admin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/sites', sitesRoutes);
router.use('/workorders', workOrdersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/demo', demoRoutes);
router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

export default router;
