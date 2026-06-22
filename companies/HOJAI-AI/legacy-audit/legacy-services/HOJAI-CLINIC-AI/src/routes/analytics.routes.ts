import { Router, Response } from 'express';
import { Appointment, Patient, Prescription, VoiceCall } from '../models';
import { authenticate, asyncHandler } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/analytics/dashboard
 * Get dashboard metrics
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res: Response) => {
    const clinicId = req.clinicId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get today's appointments
    const todayAppointments = await Appointment.countDocuments({
      clinicId,
      date: { $gte: today, $lt: tomorrow },
    });

    // Get this week's appointments
    const weekAppointments = await Appointment.countDocuments({
      clinicId,
      date: { $gte: weekStart, $lte: today },
    });

    // Get this month's appointments
    const monthAppointments = await Appointment.countDocuments({
      clinicId,
      date: { $gte: monthStart, $lte: monthEnd },
    });

    // Get today's patients (unique patients with appointments today)
    const todayApptIds = await Appointment.find({
      clinicId,
      date: { $gte: today, $lt: tomorrow },
      status: { $nin: ['cancelled', 'no_show'] },
    }).distinct('patientId');
    const todayPatients = todayApptIds.length;

    // Get total active patients
    const totalPatients = await Patient.countDocuments({ clinicId, isActive: true });

    // Get new patients this month
    const newPatientsThisMonth = await Patient.countDocuments({
      clinicId,
      isActive: true,
      createdAt: { $gte: monthStart },
    });

    // Get upcoming appointments (next 5)
    const upcomingAppointments = await Appointment.find({
      clinicId,
      date: { $gte: today },
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .populate('patientId', 'firstName lastName phone')
      .populate('doctorId', 'name')
      .sort({ date: 1, startTime: 1 })
      .limit(5);

    // Get specialty distribution
    const specialtyStats = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $lookup: { from: 'doctors', localField: 'doctorId', foreignField: '_id', as: 'doctor' } },
      { $unwind: '$doctor' },
      { $group: { _id: '$doctor.specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get appointment status distribution
    const statusStats = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        todayAppointments,
        weekAppointments,
        monthAppointments,
        todayPatients,
        totalPatients,
        newPatientsThisMonth,
        upcomingAppointments,
        topSpecialties: specialtyStats.map((s) => ({
          specialty: s._id,
          count: s.count,
        })),
        appointmentStatus: statusStats.reduce(
          (acc, s) => {
            acc[s._id] = s.count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  })
);

/**
 * GET /api/v1/analytics/appointments
 * Get detailed appointment statistics
 */
router.get(
  '/appointments',
  asyncHandler(async (req, res: Response) => {
    const clinicId = req.clinicId!;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    // Status distribution
    const byStatus = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Type distribution
    const byType = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Doctor distribution
    const byDoctor = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: startDate, $lte: endDate } } },
      { $lookup: { from: 'doctors', localField: 'doctorId', foreignField: '_id', as: 'doctor' } },
      { $unwind: '$doctor' },
      { $group: { _id: '$doctorId', name: { $first: '$doctor.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Hourly distribution
    const hourlyDistribution = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: startDate, $lte: endDate } } },
      {
        $project: {
          hour: { $toInt: { $substr: ['$startTime', 0, 2] } },
        },
      },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Daily trend
    const dailyTrend = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        total: byStatus.reduce((sum, s) => sum + s.count, 0),
        byStatus: byStatus.reduce(
          (acc, s) => {
            acc[s._id] = s.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byType: byType.reduce(
          (acc, t) => {
            acc[t._id] = t.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byDoctor: byDoctor.map((d) => ({
          doctorId: d._id.toString(),
          name: d.name,
          count: d.count,
        })),
        hourlyDistribution: hourlyDistribution.map((h) => ({
          hour: h._id,
          count: h.count,
        })),
        dailyTrend: dailyTrend.map((d) => ({
          date: d._id,
          count: d.count,
        })),
      },
    });
  })
);

/**
 * GET /api/v1/analytics/patients
 * Get patient statistics
 */
router.get(
  '/patients',
  asyncHandler(async (req, res: Response) => {
    const clinicId = req.clinicId!;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    // Total and active
    const [total, active] = await Promise.all([
      Patient.countDocuments({ clinicId }),
      Patient.countDocuments({ clinicId, isActive: true }),
    ]);

    // Gender distribution
    const byGender = await Patient.aggregate([
      { $match: { clinicId } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]);

    // Registration trend (monthly)
    const registrationTrend = await Patient.aggregate([
      { $match: { clinicId, createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Age group distribution
    const patients = await Patient.find({ clinicId, isActive: true }).select('dateOfBirth');
    const ageGroups = { '0-10': 0, '11-20': 0, '21-40': 0, '41-60': 0, '60+': 0 };

    patients.forEach((p) => {
      const age = Math.floor(
        (Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age <= 10) ageGroups['0-10']++;
      else if (age <= 20) ageGroups['11-20']++;
      else if (age <= 40) ageGroups['21-40']++;
      else if (age <= 60) ageGroups['41-60']++;
      else ageGroups['60+']++;
    });

    // Returning patient rate
    const totalAppointments = await Appointment.countDocuments({
      clinicId,
      date: { $gte: startDate, $lte: endDate },
    });
    const uniquePatients = await Appointment.distinct('patientId', {
      clinicId,
      date: { $gte: startDate, $lte: endDate },
    });
    const returningRate = totalAppointments > 0 ? (uniquePatients.length / totalAppointments) * 100 : 0;

    // Average visits per patient
    const patientVisits = await Appointment.aggregate([
      { $match: { clinicId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$patientId', visits: { $sum: 1 } } },
      { $group: { _id: null, avgVisits: { $avg: '$visits' } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive: total - active,
        byGender: byGender.reduce(
          (acc, g) => {
            acc[g._id] = g.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byAgeGroup: ageGroups,
        registrationTrend: registrationTrend.map((r) => ({
          month: r._id,
          count: r.count,
        })),
        returningRate: Math.round(returningRate * 10) / 10,
        averageVisitsPerPatient: patientVisits[0]?.avgVisits
          ? Math.round(patientVisits[0].avgVisits * 10) / 10
          : 0,
      },
    });
  })
);

/**
 * GET /api/v1/analytics/overview
 * Get high-level overview for dashboard
 */
router.get(
  '/overview',
  asyncHandler(async (req, res: Response) => {
    const clinicId = req.clinicId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayAppointments,
      pendingAppointments,
      totalPatients,
      todayCalls,
    ] = await Promise.all([
      Appointment.countDocuments({
        clinicId,
        date: today,
        status: { $in: ['scheduled', 'confirmed'] },
      }),
      Appointment.countDocuments({
        clinicId,
        date: { $gte: today },
        status: 'scheduled',
      }),
      Patient.countDocuments({ clinicId, isActive: true }),
      VoiceCall.countDocuments({
        clinicId,
        createdAt: { $gte: today },
      }),
    ]);

    res.json({
      success: true,
      data: {
        todayAppointments,
        pendingAppointments,
        totalPatients,
        todayCalls,
      },
    });
  })
);

export default router;
