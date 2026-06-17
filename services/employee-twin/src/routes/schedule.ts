import { Router, Request, Response } from 'express';
import { Schedule } from '../models/Schedule';
import { ScheduleValidationSchema } from '../models/Schedule';

const router = Router();

// Middleware to extract tenant ID
const extractTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// Create schedule for employee
router.post('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { employeeId } = req.params;

    // Validate input
    const validatedData = ScheduleValidationSchema.parse({
      tenantId,
      employeeId,
      ...req.body
    });

    // Deactivate existing active schedules
    await Schedule.updateMany(
      { tenantId, employeeId, isActive: true },
      { $set: { isActive: false, effectiveTo: new Date() } }
    );

    const schedule = new Schedule(validatedData);
    await schedule.save();

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Schedule created successfully'
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

// Get current schedule for employee
router.get('/:employeeId/current', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const schedule = await Schedule.findOne({
      tenantId,
      employeeId: req.params.employeeId,
      isActive: true
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'No active schedule found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all schedules for employee
router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const schedules = await Schedule.find({
      tenantId,
      employeeId: req.params.employeeId
    }).sort({ effectiveFrom: -1 });

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update schedule
router.put('/:scheduleId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const schedule = await Schedule.findOneAndUpdate(
      { tenantId, _id: req.params.scheduleId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule,
      message: 'Schedule updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Switch WFH status
router.patch('/:employeeId/wfh', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { isWorkFromHome, wfhDays } = req.body;

    const schedule = await Schedule.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId, isActive: true },
      { $set: { isWorkFromHome, wfhDays } },
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'No active schedule found'
      });
    }

    res.json({
      success: true,
      data: schedule,
      message: 'WFH status updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get schedules by shift type
router.get('/by-shift/:shiftType', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { shiftType } = req.params;

    const schedules = await Schedule.find({
      tenantId,
      shiftType,
      isActive: true
    }).populate('employeeId', 'firstName lastName email department');

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get WFH employees
router.get('/wfh/employees', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);

    const schedules = await Schedule.find({
      tenantId,
      isWorkFromHome: true,
      isActive: true
    }).populate('employeeId', 'firstName lastName email department');

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get employees working today
router.get('/today/working', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const today = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today];

    const schedules = await Schedule.find({
      tenantId,
      isActive: true,
      workingDays: todayName
    }).populate('employeeId', 'firstName lastName email department role');

    res.json({
      success: true,
      data: schedules,
      count: schedules.length,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete schedule
router.delete('/:scheduleId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const schedule = await Schedule.findOneAndUpdate(
      { tenantId, _id: req.params.scheduleId },
      { $set: { isActive: false, effectiveTo: new Date() } },
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule deactivated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
