import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const tickets = new Map();

router.get('/', (req, res) => {
  const { matchId, category, status } = req.query;
  let list = Array.from(tickets.values());
  if (matchId) list = list.filter(t => t.matchId === matchId);
  if (category) list = list.filter(t => t.category === category);
  if (status) list = list.filter(t => t.status === status);
  res.json({ success: true, tickets: list });
});

router.get('/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ success: true, ticket });
});

router.post('/', (req, res) => {
  const { matchId, category, price, quantity } = req.body;
  if (!matchId || !category || !price) return res.status(400).json({ error: 'Missing required fields' });

  const ticket = {
    ticketId: uuidv4(), matchId, category, price,
    quantity: quantity || 1, available: quantity || 1, sold: 0,
    status: 'active', createdAt: new Date().toISOString()
  };
  tickets.set(ticket.ticketId, ticket);
  res.status(201).json({ success: true, ticket });
});

router.post('/:id/price-dynamic', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const { demand, availablePercentage } = req.body;
  const demandMultiplier = demand || 1;
  const availabilityMultiplier = (availablePercentage || 50) < 30 ? 1.3 : 1;

  ticket.dynamicPrice = Math.round(ticket.price * demandMultiplier * availabilityMultiplier);
  res.json({ success: true, ticket });
});

export default router;
