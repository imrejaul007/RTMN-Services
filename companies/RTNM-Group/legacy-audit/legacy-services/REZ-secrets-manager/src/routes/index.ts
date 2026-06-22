import { Router } from 'express';
import secretsRoutes from './secrets';
import policiesRoutes from './policies';
import accessRoutes from './access';

const router = Router();

// Mount routes
router.use('/secrets', secretsRoutes);
router.use('/policies', policiesRoutes);
router.use('/access', accessRoutes);

export default router;
