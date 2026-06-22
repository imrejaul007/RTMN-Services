import { Router } from 'express';
import identityRoutes from './identity.routes';
import linkRoutes from './link.routes';
import resolveRoutes from './resolve.routes';
import trustRoutes from './trust.routes';

const router = Router();

router.use('/identities', identityRoutes);
router.use('/link', linkRoutes);
router.use('/resolve', resolveRoutes);
router.use('/trust', trustRoutes);
router.use('/fraud', trustRoutes); // Fraud routes also in trust.routes.ts

export default router;
