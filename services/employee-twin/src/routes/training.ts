import { Router, Request, Response } from 'express';
import { Training } from '../models/Training';
import { TrainingValidationSchema } from '../models/Training';

const router = Router();

// Middleware to extract tenant ID
const extractTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// Create training record
router.post('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { employeeId } = req.params;

    // Validate input
    const validatedData = TrainingValidationSchema.parse({
      tenantId,
      employeeId,
      ...req.body
    });

    const training = new Training(validatedData);
    await training.save();

    res.status(201).json({
      success: true,
      data: training,
      message: 'Training record created successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all training records for employee
router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { status, type, includeHistory } = req.query;

    const filter: any = { tenantId, employeeId: req.params.employeeId };

    if (status) filter.status = status;
    if (type) filter.trainingType = type;

    const trainings = await Training.find(filter).sort({ startDate: -1 });

    let completedTrainings = trainings;
    let pendingTrainings: any[] = [];

    if (includeHistory === 'true') {
      completedTrainings = trainings.filter(t => t.status === 'completed');
      pendingTrainings = trainings.filter(t => t.status !== 'completed');
    }

    res.json({
      success: true,
      data: {
        history: completedTrainings,
        pending: pendingTrainings,
        total: trainings.length
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get pending training for employee
router.get('/:employeeId/pending', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const trainings = await Training.find({
      tenantId,
      employeeId: req.params.employeeId,
      status: { $in: ['enrolled', 'in_progress', 'pending'] }
    }).sort({ dueDate: 1 });

    res.json({
      success: true,
      data: trainings,
      count: trainings.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get overdue training
router.get('/:employeeId/overdue', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const now = new Date();

    const trainings = await Training.find({
      tenantId,
      employeeId: req.params.employeeId,
      dueDate: { $lt: now },
      status: { $nin: ['completed', 'cancelled'] }
    }).sort({ dueDate: 1 });

    res.json({
      success: true,
      data: trainings,
      count: trainings.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get training by ID
router.get('/record/:trainingId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const training = await Training.findOne({
      tenantId,
      _id: req.params.trainingId
    });

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Training record not found'
      });
    }

    res.json({
      success: true,
      data: training
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update training record
router.put('/record/:trainingId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const training = await Training.findOneAndUpdate(
      { tenantId, _id: req.params.trainingId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Training record not found'
      });
    }

    res.json({
      success: true,
      data: training,
      message: 'Training updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Mark training as completed
router.patch('/record/:trainingId/complete', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { score, certificateObtained, certificateUrl, feedback } = req.body;

    const training = await Training.findOneAndUpdate(
      { tenantId, _id: req.params.trainingId },
      {
        $set: {
          status: 'completed',
          completionDate: new Date(),
          score,
          certificateObtained,
          certificateUrl,
          feedback,
          completedOnTime: true
        }
      },
      { new: true }
    );

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Training record not found'
      });
    }

    // Check if completed on time
    if (training.dueDate && training.completionDate && training.completionDate > training.dueDate) {
      training.completedOnTime = false;
      await training.save();
    }

    res.json({
      success: true,
      data: training,
      message: 'Training marked as completed'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get training statistics for employee
router.get('/:employeeId/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { startDate, endDate } = req.query;

    const filter: any = { tenantId, employeeId: req.params.employeeId };

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate as string);
      if (endDate) filter.startDate.$lte = new Date(endDate as string);
    }

    const trainings = await Training.find(filter);

    const stats = {
      total: trainings.length,
      completed: trainings.filter(t => t.status === 'completed').length,
      inProgress: trainings.filter(t => t.status === 'in_progress').length,
      pending: trainings.filter(t => t.status === 'pending' || t.status === 'enrolled').length,
      overdue: trainings.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        return new Date() > t.dueDate;
      }).length,
      totalHours: trainings.reduce((sum, t) => sum + (t.duration || 0), 0),
      averageScore: 0,
      certificatesObtained: trainings.filter(t => t.certificateObtained).length,
      mandatoryCompleted: trainings.filter(t => t.isMandatory && t.status === 'completed').length,
      mandatoryTotal: trainings.filter(t => t.isMandatory).length
    };

    const completedTrainings = trainings.filter(t => t.status === 'completed' && t.score !== undefined);
    if (completedTrainings.length > 0) {
      stats.averageScore = completedTrainings.reduce((sum, t) => sum + (t.score || 0), 0) / completedTrainings.length;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all employees with training due
router.get('/due/all', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { days = 30 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));

    const trainings = await Training.find({
      tenantId,
      dueDate: { $lte: futureDate, $gte: new Date() },
      status: { $nin: ['completed', 'cancelled'] }
    }).sort({ dueDate: 1 });

    res.json({
      success: true,
      data: trainings,
      count: trainings.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete training record
router.delete('/record/:trainingId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const result = await Training.deleteOne({
      tenantId,
      _id: req.params.trainingId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Training record not found'
      });
    }

    res.json({
      success: true,
      message: 'Training record deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
