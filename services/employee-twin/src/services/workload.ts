import { Performance } from '../models/Performance';
import { Schedule } from '../models/Schedule';
import { Training } from '../models/Training';

export interface WorkloadData {
  employeeId: string;
  period: {
    start: string;
    end: string;
  };
  capacity: {
    weeklyHours: number;
    maxTicketsPerWeek: number;
    availableDays: number;
  };
  currentLoad: {
    ticketsHandled: number;
    ticketsInProgress: number;
    avgHandlingTime: number; // in seconds
    trainingHours: number;
    totalLoadHours: number;
  };
  metrics: {
    utilizationPercentage: number;
    ticketsPerHour: number;
    efficiencyScore: number;
    overloadRisk: 'low' | 'medium' | 'high';
  };
  status: 'underutilized' | 'optimal' | 'high' | 'critical';
  distribution: {
    ticketHandling: number;
    training: number;
    meetings: number;
    breaks: number;
  };
  recommendations: string[];
}

// Standard values
const STANDARD_TICKETS_PER_HOUR = 2;
const HOURS_PER_TICKET = 0.5; // average time per ticket in hours
const TRAINING_BUFFER_HOURS = 4; // hours per week for training
const MEETING_HOURS = 5; // hours per week for meetings
const BREAK_HOURS = 2; // hours per week for breaks

export const calculateWorkload = async (
  tenantId: string,
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<WorkloadData> => {
  // Default to current week if no dates provided
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();

  // Adjust to week boundaries
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // Fetch data
  const [schedules, performances, trainings] = await Promise.all([
    Schedule.findOne({ tenantId, employeeId, isActive: true }),
    Performance.find({
      tenantId,
      employeeId,
      periodStart: { $gte: start, $lte: end }
    }),
    Training.find({
      tenantId,
      employeeId,
      startDate: { $lte: end },
      $or: [
        { endDate: { $gte: start } },
        { endDate: undefined }
      ]
    })
  ]);

  // Calculate capacity
  const schedule = schedules || {
    weeklyHours: 40,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  };

  const weeklyHours = schedule.weeklyHours || 40;
  const availableDays = schedule.workingDays?.length || 5;
  const maxTicketsPerWeek = Math.floor((weeklyHours - TRAINING_BUFFER_HOURS - MEETING_HOURS - BREAK_HOURS) / HOURS_PER_TICKET);

  // Calculate current load from performance
  let ticketsHandled = 0;
  let ticketsInProgress = 0;
  let totalResolutionTime = 0;
  let ticketCount = 0;

  for (const perf of performances) {
    ticketsHandled += perf.ticketsHandled;
    ticketsInProgress += perf.ticketsEscalated; // Using escalated as proxy for in-progress
    if (perf.averageResolutionTime) {
      totalResolutionTime += perf.averageResolutionTime;
      ticketCount++;
    }
  }

  // Calculate training hours for the period
  let trainingHours = 0;
  for (const training of trainings) {
    if (['in_progress', 'enrolled'].includes(training.status)) {
      trainingHours += (training.duration || 0) / 4; // Assuming monthly duration, convert to weekly
    }
  }

  const avgHandlingTime = ticketCount > 0 ? Math.round(totalResolutionTime / ticketCount) : 0;

  // Calculate ticket handling hours
  const ticketHandlingHours = ticketsHandled * HOURS_PER_TICKET;

  // Total load hours
  const totalLoadHours = ticketHandlingHours + trainingHours + MEETING_HOURS + BREAK_HOURS;

  // Calculate metrics
  const utilizationPercentage = Math.round((totalLoadHours / weeklyHours) * 100);
  const ticketsPerHour = weeklyHours > 0 ? Math.round((ticketsHandled / weeklyHours) * 10) / 10 : 0;
  const efficiencyScore = maxTicketsPerWeek > 0
    ? Math.round((ticketsHandled / maxTicketsPerWeek) * 100)
    : 0;

  // Determine overload risk
  let overloadRisk: 'low' | 'medium' | 'high' = 'low';
  if (utilizationPercentage > 120) overloadRisk = 'high';
  else if (utilizationPercentage > 100) overloadRisk = 'medium';

  // Determine status
  let status: 'underutilized' | 'optimal' | 'high' | 'critical' = 'optimal';
  if (utilizationPercentage < 50) status = 'underutilized';
  else if (utilizationPercentage > 130) status = 'critical';
  else if (utilizationPercentage > 100) status = 'high';

  // Calculate distribution percentages
  const totalBaseHours = ticketHandlingHours + trainingHours + MEETING_HOURS + BREAK_HOURS;
  const distribution = {
    ticketHandling: totalBaseHours > 0 ? Math.round((ticketHandlingHours / totalBaseHours) * 100) : 0,
    training: totalBaseHours > 0 ? Math.round((trainingHours / totalBaseHours) * 100) : 0,
    meetings: totalBaseHours > 0 ? Math.round((MEETING_HOURS / totalBaseHours) * 100) : 0,
    breaks: totalBaseHours > 0 ? Math.round((BREAK_HOURS / totalBaseHours) * 100) : 0
  };

  // Generate recommendations
  const recommendations: string[] = [];

  if (utilizationPercentage < 50) {
    recommendations.push('Employee is underutilized - consider assigning more tickets or projects');
  }

  if (utilizationPercentage > 100) {
    recommendations.push('Employee is overloaded - consider redistributing work or extending deadline');
    if (overloadRisk === 'high') {
      recommendations.push('High risk of burnout - urgent intervention recommended');
    }
  }

  if (trainingHours > TRAINING_BUFFER_HOURS * 1.5) {
    recommendations.push('Training load is above average - may impact ticket handling capacity');
  }

  if (avgHandlingTime > 1800) { // More than 30 minutes average
    recommendations.push('Average handling time is high - consider additional training or process review');
  }

  if (ticketsPerHour < STANDARD_TICKETS_PER_HOUR * 0.7) {
    recommendations.push('Ticket throughput is below standard - coaching may help improve efficiency');
  }

  if (recommendations.length === 0) {
    recommendations.push('Workload is well-balanced - maintain current allocation');
  }

  return {
    employeeId,
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    },
    capacity: {
      weeklyHours,
      maxTicketsPerWeek,
      availableDays
    },
    currentLoad: {
      ticketsHandled,
      ticketsInProgress,
      avgHandlingTime,
      trainingHours: Math.round(trainingHours * 10) / 10,
      totalLoadHours: Math.round(totalLoadHours * 10) / 10
    },
    metrics: {
      utilizationPercentage: Math.min(utilizationPercentage, 150), // Cap at 150% for display
      ticketsPerHour,
      efficiencyScore: Math.min(efficiencyScore, 100),
      overloadRisk
    },
    status,
    distribution,
    recommendations
  };
};

// Calculate team workload summary
export const calculateTeamWorkload = async (
  tenantId: string,
  employeeIds: string[],
  startDate?: string,
  endDate?: string
): Promise<{
  teamSize: number;
  averageUtilization: number;
  overloadedCount: number;
  underutilizedCount: number;
  totalTicketsHandled: number;
  totalCapacity: number;
  workloadDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}> => {
  const workloads = await Promise.all(
    employeeIds.map(id => calculateWorkload(tenantId, id, startDate, endDate))
  );

  const averageUtilization = Math.round(
    workloads.reduce((sum, w) => sum + w.metrics.utilizationPercentage, 0) / workloads.length
  );

  const overloadedCount = workloads.filter(w =>
    w.status === 'high' || w.status === 'critical'
  ).length;

  const underutilizedCount = workloads.filter(w =>
    w.status === 'underutilized'
  ).length;

  const totalTicketsHandled = workloads.reduce((sum, w) => sum + w.currentLoad.ticketsHandled, 0);
  const totalCapacity = workloads.reduce((sum, w) => sum + w.capacity.maxTicketsPerWeek, 0);

  const workloadDistribution = {
    low: workloads.filter(w => w.metrics.overloadRisk === 'low').length,
    medium: workloads.filter(w => w.metrics.overloadRisk === 'medium').length,
    high: workloads.filter(w => w.metrics.overloadRisk === 'high').length,
    critical: workloads.filter(w => w.status === 'critical').length
  };

  return {
    teamSize: workloads.length,
    averageUtilization,
    overloadedCount,
    underutilizedCount,
    totalTicketsHandled,
    totalCapacity,
    workloadDistribution
  };
};

// Get workload forecast
export const forecastWorkload = async (
  tenantId: string,
  employeeId: string,
  weeksAhead: number = 4
): Promise<{
  employeeId: string;
  forecast: Array<{
    week: string;
    expectedLoad: number;
    recommendedTickets: number;
    risk: 'low' | 'medium' | 'high';
  }>;
  trend: 'increasing' | 'stable' | 'decreasing';
}> => {
  // Get historical data for trend analysis
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const performances = await Performance.find({
    tenantId,
    employeeId,
    periodStart: { $gte: fourWeeksAgo }
  }).sort({ periodStart: 1 });

  // Calculate average ticket handling rate
  const avgTicketsPerWeek = performances.length > 0
    ? performances.reduce((sum, p) => sum + p.ticketsHandled, 0) / performances.length
    : STANDARD_TICKETS_PER_HOUR * 40;

  // Generate forecast
  const forecast = [];
  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';

  if (performances.length >= 2) {
    const firstHalf = performances.slice(0, Math.floor(performances.length / 2));
    const secondHalf = performances.slice(Math.floor(performances.length / 2));

    const avgFirst = firstHalf.reduce((sum, p) => sum + p.ticketsHandled, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, p) => sum + p.ticketsHandled, 0) / secondHalf.length;

    if (avgSecond > avgFirst * 1.1) trend = 'increasing';
    else if (avgSecond < avgFirst * 0.9) trend = 'decreasing';
  }

  for (let i = 1; i <= weeksAhead; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + (i * 7) - weekStart.getDay());

    let expectedLoad = avgTicketsPerWeek;
    if (trend === 'increasing') expectedLoad *= (1 + 0.05 * i);
    if (trend === 'decreasing') expectedLoad *= (1 - 0.05 * i);

    let risk: 'low' | 'medium' | 'high' = 'low';
    if (expectedLoad > avgTicketsPerWeek * 1.3) risk = 'high';
    else if (expectedLoad > avgTicketsPerWeek * 1.15) risk = 'medium';

    forecast.push({
      week: weekStart.toISOString().split('T')[0],
      expectedLoad: Math.round(expectedLoad * 10) / 10,
      recommendedTickets: Math.round(expectedLoad * 0.9 * 10) / 10, // 90% of capacity
      risk
    });
  }

  return {
    employeeId,
    forecast,
    trend
  };
};
