import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const bills = new Map();

const tariffs = [
  { slab: '0-100', rate: 3, unit: 'kWh' },
  { slab: '101-200', rate: 5, unit: 'kWh' },
  { slab: '201-400', rate: 7, unit: 'kWh' },
  { slab: '400+', rate: 10, unit: 'kWh' }
];

router.get('/tariffs', (req, res) => res.json({ success: true, tariffs }));

router.get('/', (req, res) => {
  const { consumerId, status } = req.query;
  let list = Array.from(bills.values());
  if (consumerId) list = list.filter(b => b.consumerId === consumerId);
  if (status) list = list.filter(b => b.status === status);
  res.json({ success: true, bills: list });
});

router.get('/:id', (req, res) => {
  const bill = bills.get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  res.json({ success: true, bill });
});

router.post('/calculate', (req, res) => {
  const { consumerId, consumption } = req.body;
  if (!consumption) return res.status(400).json({ error: 'Missing consumption' });

  let total = 0, remaining = consumption;

  for (const tariff of tariffs) {
    const [min, max] = tariff.slab.split('-').map(Number);
    if (remaining <= 0) break;
    const slabUnits = Math.min(remaining, (max || remaining) - min + 1);
    total += slabUnits * tariff.rate;
    remaining -= slabUnits;
  }

  const fixedCharges = 50, taxes = total * 0.18;

  res.json({
    success: true,
    calculation: {
      consumerId,
      consumption,
      energyCharges: total,
      fixedCharges,
      taxes: Math.round(taxes * 100) / 100,
      total: Math.round((total + fixedCharges + taxes) * 100) / 100,
      unit: 'INR'
    }
  });
});

export default router;
