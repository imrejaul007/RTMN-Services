import { Router } from 'express';
import { dispatch, listDispatches } from '../services/dispatch.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listDispatches() }));
r.post('/', (req, res) => {
  try { res.status(201).json(dispatch(req.body.shipmentId, req.body.vehicleId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
