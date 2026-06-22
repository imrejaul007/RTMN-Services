import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const animals = new Map();

router.get('/', (req, res) => {
  const { farmId, type, status } = req.query;
  let list = Array.from(animals.values());
  if (farmId) list = list.filter(a => a.farmId === farmId);
  if (type) list = list.filter(a => a.type === type);
  if (status) list = list.filter(a => a.status === status);
  res.json({ success: true, animals: list });
});

router.get('/:id', (req, res) => {
  const animal = animals.get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });
  res.json({ success: true, animal });
});

router.post('/', (req, res) => {
  const { farmId, type, breed, age, gender, tagNumber } = req.body;
  if (!farmId || !type) return res.status(400).json({ error: 'Missing required fields' });

  const animal = {
    animalId: uuidv4(), farmId, type, breed, age, gender, tagNumber,
    status: 'healthy',
    vaccinations: [],
    weight: null,
    lastCheckup: null,
    createdAt: new Date().toISOString()
  };
  animals.set(animal.animalId, animal);
  res.status(201).json({ success: true, animal });
});

router.post('/:id/vaccination', (req, res) => {
  const animal = animals.get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const { vaccineName, date, nextDue } = req.body;
  animal.vaccinations.push({ vaccineName, date: date || new Date().toISOString(), nextDue });
  res.json({ success: true, animal });
});

export default router;
