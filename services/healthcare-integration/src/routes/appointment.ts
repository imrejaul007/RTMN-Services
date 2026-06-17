import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { logger } from '../services/logger';
import {
  Appointment,
  ApiResponse,
  PaginatedResponse
} from '../models/PatientProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();

// In-memory store (replace with database in production)
const appointments: Map<string, Appointment> = new Map();

// Get all appointments
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const patientId = req.query.patientId as string;
    const providerId = req.query.providerId as string;
    const date = req.query.date as string;

    let appointmentList = Array.from(appointments.values());

    if (status) {
      appointmentList = appointmentList.filter(a => a.status === status);
    }
    if (patientId) {
      appointmentList = appointmentList.filter(a => a.patientId === patientId);
    }
    if (providerId) {
      appointmentList = appointmentList.filter(a => a.providerId === providerId);
    }
    if (date) {
      appointmentList = appointmentList.filter(a => a.scheduledAt.startsWith(date));
    }

    // Sort by scheduled time
    appointmentList.sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    const total = appointmentList.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedAppointments = appointmentList.slice(startIndex, startIndex + limit);

    const response: PaginatedResponse<Appointment> = {
      success: true,
      data: paginatedAppointments,
      pagination: { page, limit, total, totalPages },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get appointment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = appointments.get(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const response: ApiResponse<Appointment> = {
      success: true,
      data: appointment,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Create appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'journeyTwinId'> = req.body;

    const appointment: Appointment = {
      ...appointmentData,
      id: `APT-${uuidv4().substring(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Appointment;

    appointments.set(appointment.id, appointment);

    // Sync to Journey Twin
    try {
      const journeyResult = await customerOpsBridge.syncToJourneyTwin(appointment);
      if (journeyResult.success && journeyResult.data) {
        appointment.journeyTwinId = journeyResult.data.id;
        appointments.set(appointment.id, appointment);
      }
    } catch (syncError) {
      logger.warn('Journey Twin sync failed:', syncError);
    }

    // Publish appointment created event
    try {
      await customerOpsBridge.publishEvent('appointment.created', {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        scheduledAt: appointment.scheduledAt,
        type: appointment.appointmentType
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<Appointment> = {
      success: true,
      data: appointment,
      message: 'Appointment created and synced to Journey Twin',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Update appointment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingAppointment = appointments.get(id);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const updatedAppointment: Appointment = {
      ...existingAppointment,
      ...req.body,
      id: existingAppointment.id,
      createdAt: existingAppointment.createdAt,
      updatedAt: new Date().toISOString()
    };

    appointments.set(id, updatedAppointment);

    // Update Journey Twin if linked
    if (updatedAppointment.journeyTwinId) {
      try {
        await customerOpsBridge.updateJourneyTwin(updatedAppointment.journeyTwinId, {
          status: updatedAppointment.status,
          scheduledAt: updatedAppointment.scheduledAt,
          notes: updatedAppointment.notes
        });
      } catch (syncError) {
        logger.warn('Journey Twin update failed:', syncError);
      }
    }

    // Publish appointment updated event
    try {
      await customerOpsBridge.publishEvent('appointment.updated', {
        appointmentId: updatedAppointment.id,
        patientId: updatedAppointment.patientId,
        status: updatedAppointment.status,
        previousStatus: existingAppointment.status
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<Appointment> = {
      success: true,
      data: updatedAppointment,
      message: 'Appointment updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Check-in for appointment
router.post('/:id/checkin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = appointments.get(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    appointment.status = 'checked-in';
    appointment.checkedIn = true;
    appointment.checkedInAt = new Date().toISOString();
    appointment.updatedAt = new Date().toISOString();

    appointments.set(id, appointment);

    // Publish check-in event
    try {
      await customerOpsBridge.publishEvent('appointment.checked-in', {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        checkedInAt: appointment.checkedInAt
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<Appointment> = {
      success: true,
      data: appointment,
      message: 'Patient checked in successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error checking in:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check in',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Cancel appointment
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const appointment = appointments.get(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const previousStatus = appointment.status;
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date().toISOString();
    appointment.cancellationReason = reason;
    appointment.updatedAt = new Date().toISOString();

    appointments.set(id, appointment);

    // Update Journey Twin
    if (appointment.journeyTwinId) {
      try {
        await customerOpsBridge.updateJourneyTwin(appointment.journeyTwinId, {
          status: 'cancelled',
          cancellationReason: reason
        });
      } catch (syncError) {
        logger.warn('Journey Twin update failed:', syncError);
      }
    }

    // Publish cancellation event
    try {
      await customerOpsBridge.publishEvent('appointment.cancelled', {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        previousStatus,
        reason
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<Appointment> = {
      success: true,
      data: appointment,
      message: 'Appointment cancelled successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get today's appointments
router.get('/today/summary', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = Array.from(appointments.values())
      .filter(a => a.scheduledAt.startsWith(today))
      .sort((a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );

    const summary = {
      date: today,
      total: todayAppointments.length,
      byStatus: {
        scheduled: todayAppointments.filter(a => a.status === 'scheduled').length,
        confirmed: todayAppointments.filter(a => a.status === 'confirmed').length,
        'checked-in': todayAppointments.filter(a => a.status === 'checked-in').length,
        completed: todayAppointments.filter(a => a.status === 'completed').length,
        cancelled: todayAppointments.filter(a => a.status === 'cancelled').length,
        'no-show': todayAppointments.filter(a => a.status === 'no-show').length
      },
      byType: {
        consultation: todayAppointments.filter(a => a.appointmentType === 'consultation').length,
        'telehealth': todayAppointments.filter(a => a.appointmentType === 'telehealth').length,
        'routine-checkup': todayAppointments.filter(a => a.appointmentType === 'routine-checkup').length,
        'follow-up': todayAppointments.filter(a => a.appointmentType === 'follow-up').length
      },
      appointments: todayAppointments
    };

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching today appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today appointments',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

export default router;
