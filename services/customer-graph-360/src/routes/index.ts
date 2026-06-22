import { Router } from 'express';
import customerRoutes from './customer.routes.js';

const router = Router();

// Mount routes
router.use('/customer', customerRoutes);

export default router;