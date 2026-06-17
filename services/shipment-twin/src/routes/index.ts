import { Router } from 'express';
import shipmentsRouter from './shipments';
import carriersRouter from './carriers';
import trackingRouter from './tracking';

const router = Router();

router.use('/shipments', shipmentsRouter);
router.use('/carriers', carriersRouter);
router.use('/tracking', trackingRouter);

export default router;
