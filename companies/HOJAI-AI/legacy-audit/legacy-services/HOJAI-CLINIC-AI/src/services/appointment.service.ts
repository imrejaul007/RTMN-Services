import { Types } from 'mongoose';
import { Appointment } from '../models';
import { IAppointment, IAppointmentCreate, IAppointmentUpdate, IApiResponse, IQueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AppointmentService {
  /**
   * Create a new appointment
   */
  async create(clinicId: string, data: IAppointmentCreate): Promise<IApiResponse<IAppointment>> {
    // Check if patient exists
    const patient = await Appointment.findById(data.patientId);

    // Check for existing appointment at the same time
    const existingAppointment = await Appointment.findOne({
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(data.doctorId),
      date: new Date(data.date),
      startTime: data.startTime,
      status: { $nin: ['cancelled', 'no_show'] },
    });

    if (existingAppointment) {
      throw new AppError('An appointment already exists at this time slot', 400);
    }

    // Calculate end time (default 30 min slot)
    const [hour, min] = data.startTime.split(':').map(Number);
    const totalMinutes = hour * 60 + min + 30;
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    const appointment = new Appointment({
      clinicId: new Types.ObjectId(clinicId),
      patientId: new Types.ObjectId(data.patientId),
      doctorId: new Types.ObjectId(data.doctorId),
      date: new Date(data.date),
      startTime: data.startTime,
      endTime,
      type: data.type,
      reason: data.reason,
      notes: data.notes,
      status: 'scheduled',
    });

    await appointment.save();

    // Populate related data
    await appointment.populate('patientId', 'firstName lastName phone');
    await appointment.populate('doctorId', 'name specialization');

    return {
      success: true,
      data: appointment.toJSON() as IAppointment,
      message: 'Appointment booked successfully',
    };
  }

  /**
   * Get appointment by ID
   */
  async getById(clinicId: string, appointmentId: string): Promise<IApiResponse<IAppointment>> {
    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(appointmentId),
      clinicId: new Types.ObjectId(clinicId),
    })
      .populate('patientId', 'firstName lastName phone email dateOfBirth gender bloodType allergies')
      .populate('doctorId', 'name specialization consultationFee');

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    return {
      success: true,
      data: appointment.toJSON() as IAppointment,
    };
  }

  /**
   * List appointments with filters
   */
  async list(
    clinicId: string,
    params: IQueryParams
  ): Promise<IApiResponse<IAppointment[]>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      clinicId: new Types.ObjectId(clinicId),
    };

    // Filter by status
    if (params.status) {
      query.status = params.status;
    }

    // Filter by doctor
    if (params.doctorId) {
      query.doctorId = new Types.ObjectId(params.doctorId);
    }

    // Filter by date range
    if (params.startDate || params.endDate) {
      query.date = {};
      if (params.startDate) {
        (query.date as Record<string, Date>).$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        (query.date as Record<string, Date>).$lte = new Date(params.endDate);
      }
    }

    // Search by patient name (requires population)
    let patientsQuery: Types.ObjectId[] | undefined;
    if (params.search) {
      const { Patient } = await import('../models');
      const patients = await Patient.find({
        clinicId: new Types.ObjectId(clinicId),
        $or: [
          { firstName: { $regex: params.search, $options: 'i' } },
          { lastName: { $regex: params.search, $options: 'i' } },
          { phone: { $regex: params.search, $options: 'i' } },
        ],
      }).select('_id');
      patientsQuery = patients.map((p) => p._id as Types.ObjectId);
      query.patientId = { $in: patientsQuery };
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patientId', 'firstName lastName phone')
        .populate('doctorId', 'name specialization')
        .sort({ date: -1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    return {
      success: true,
      data: appointments as IAppointment[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update appointment
   */
  async update(
    clinicId: string,
    appointmentId: string,
    data: IAppointmentUpdate
  ): Promise<IApiResponse<IAppointment>> {
    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(appointmentId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Update fields
    if (data.date) appointment.date = new Date(data.date);
    if (data.startTime) appointment.startTime = data.startTime;
    if (data.endTime) appointment.endTime = data.endTime;
    if (data.type) appointment.type = data.type;
    if (data.status) appointment.status = data.status;
    if (data.reason) appointment.reason = data.reason;
    if (data.notes !== undefined) appointment.notes = data.notes;
    if (data.vitals) appointment.vitals = data.vitals;
    if (data.chiefComplaint !== undefined) appointment.chiefComplaint = data.chiefComplaint;
    if (data.followUpDate) appointment.followUpDate = new Date(data.followUpDate);
    if (data.teleconsultLink !== undefined) appointment.teleconsultLink = data.teleconsultLink;

    await appointment.save();

    await appointment.populate('patientId', 'firstName lastName phone');
    await appointment.populate('doctorId', 'name specialization');

    return {
      success: true,
      data: appointment.toJSON() as IAppointment,
      message: 'Appointment updated successfully',
    };
  }

  /**
   * Cancel appointment
   */
  async cancel(
    clinicId: string,
    appointmentId: string,
    reason: string,
    cancelledBy: 'patient' | 'clinic' | 'doctor'
  ): Promise<IApiResponse<IAppointment>> {
    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(appointmentId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.status === 'cancelled') {
      throw new AppError('Appointment is already cancelled', 400);
    }

    if (appointment.status === 'completed') {
      throw new AppError('Cannot cancel a completed appointment', 400);
    }

    appointment.status = 'cancelled';
    appointment.cancellation = {
      reason,
      cancelledBy,
      cancelledAt: new Date(),
    };

    await appointment.save();

    return {
      success: true,
      data: appointment.toJSON() as IAppointment,
      message: 'Appointment cancelled successfully',
    };
  }

  /**
   * Get available slots for a doctor on a specific date
   */
  async getAvailableSlots(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<IApiResponse<string[]>> {
    const slots = await Appointment.findAvailableSlots(
      new Types.ObjectId(clinicId),
      new Types.ObjectId(doctorId),
      new Date(date)
    );

    return {
      success: true,
      data: slots,
    };
  }

  /**
   * Get today's appointments
   */
  async getTodaysAppointments(clinicId: string): Promise<IApiResponse<IAppointment[]>> {
    const appointments = await Appointment.getTodaysAppointments(
      new Types.ObjectId(clinicId)
    );

    return {
      success: true,
      data: appointments as IAppointment[],
    };
  }

  /**
   * Mark appointment as no-show
   */
  async markNoShow(clinicId: string, appointmentId: string): Promise<IApiResponse<IAppointment>> {
    return this.update(clinicId, appointmentId, { status: 'no_show' });
  }

  /**
   * Start appointment (mark as in_progress)
   */
  async startAppointment(
    clinicId: string,
    appointmentId: string
  ): Promise<IApiResponse<IAppointment>> {
    return this.update(clinicId, appointmentId, { status: 'in_progress' });
  }

  /**
   * Complete appointment
   */
  async completeAppointment(
    clinicId: string,
    appointmentId: string,
    notes?: string
  ): Promise<IApiResponse<IAppointment>> {
    return this.update(clinicId, appointmentId, { status: 'completed', notes });
  }

  /**
   * Get appointment statistics
   */
  async getStatistics(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byDoctor: { doctorId: string; name: string; count: number }[];
    hourlyDistribution: { hour: number; count: number }[];
    dailyTrend: { date: string; count: number }[];
  }> {
    const appointments = await Appointment.find({
      clinicId: new Types.ObjectId(clinicId),
      date: { $gte: startDate, $lte: endDate },
    }).populate('doctorId', 'name');

    const stats = {
      total: appointments.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byDoctor: {} as Record<string, { name: string; count: number }>,
      hourlyDistribution: {} as Record<number, number>,
      dailyTrend: {} as Record<string, number>,
    };

    for (const apt of appointments) {
      // By status
      stats.byStatus[apt.status] = (stats.byStatus[apt.status] || 0) + 1;

      // By type
      stats.byType[apt.type] = (stats.byType[apt.type] || 0) + 1;

      // By doctor
      const doctorId = apt.doctorId._id.toString();
      if (!stats.byDoctor[doctorId]) {
        stats.byDoctor[doctorId] = { name: (apt.doctorId as unknown as { name: string }).name, count: 0 };
      }
      stats.byDoctor[doctorId].count++;

      // By hour
      const hour = parseInt(apt.startTime.split(':')[0], 10);
      stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;

      // By day
      const dateKey = apt.date.toISOString().split('T')[0];
      stats.dailyTrend[dateKey] = (stats.dailyTrend[dateKey] || 0) + 1;
    }

    return {
      total: stats.total,
      byStatus: stats.byStatus,
      byType: stats.byType,
      byDoctor: Object.entries(stats.byDoctor).map(([doctorId, data]) => ({
        doctorId,
        name: data.name,
        count: data.count,
      })),
      hourlyDistribution: Object.entries(stats.hourlyDistribution).map(([hour, count]) => ({
        hour: parseInt(hour, 10),
        count,
      })),
      dailyTrend: Object.entries(stats.dailyTrend)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;
