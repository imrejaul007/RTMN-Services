import { Router, Request, Response } from 'express';
import { experimentModel, CreateExperimentDTO, UpdateExperimentDTO } from '../models/Experiment';

const router = Router();

// Create experiment
router.post('/', async (req: Request, res: Response) => {
  try {
    const dto: CreateExperimentDTO = req.body;

    if (!dto.name || !dto.variants || dto.variants.length < 2) {
      res.status(400).json({ error: 'Name and at least 2 variants are required' });
      return;
    }

    const totalWeight = dto.variants.reduce((sum, v) => sum + (v.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      res.status(400).json({ error: 'Variant weights must sum to 100' });
      return;
    }

    const experiment = experimentModel.create(dto);
    res.status(201).json(experiment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// List experiments
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as any,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      ownerId: req.query.ownerId as string,
    };

    const experiments = experimentModel.findAll(filters);
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list experiments' });
  }
});

// Get experiment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const experiment = experimentModel.findById(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    res.json(experiment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get experiment' });
  }
});

// Update experiment
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const dto: UpdateExperimentDTO = req.body;
    const experiment = experimentModel.update(req.params.id, dto);

    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    res.json(experiment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

// Start experiment
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const experiment = experimentModel.findById(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    if (experiment.status !== 'draft' && experiment.status !== 'paused') {
      res.status(400).json({ error: 'Can only start draft or paused experiments' });
      return;
    }

    const updated = experimentModel.update(req.params.id, { status: 'running' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start experiment' });
  }
});

// Pause experiment
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const experiment = experimentModel.findById(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    if (experiment.status !== 'running') {
      res.status(400).json({ error: 'Can only pause running experiments' });
      return;
    }

    const updated = experimentModel.update(req.params.id, { status: 'paused' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause experiment' });
  }
});

// Complete experiment
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const experiment = experimentModel.findById(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    const updated = experimentModel.update(req.params.id, { status: 'completed' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete experiment' });
  }
});

// Archive experiment
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const experiment = experimentModel.findById(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    const updated = experimentModel.update(req.params.id, { status: 'archived' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive experiment' });
  }
});

// Delete experiment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = experimentModel.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete experiment' });
  }
});

export default router;
