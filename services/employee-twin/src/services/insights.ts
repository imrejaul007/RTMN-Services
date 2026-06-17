import { IEmployee } from '../models/Employee';
import { ISkill } from '../models/Skill';
import { IPerformance } from '../models/Performance';
import { ITraining } from '../models/Training';
import { ISchedule } from '../models/Schedule';
import { Performance } from '../models/Performance';
import { Training } from '../models/Training';
import { Schedule } from '../models/Schedule';
import { Skill } from '../models/Skill';

export interface EmployeeInsights {
  overview: {
    tenure: string;
    experienceLevel: string;
    currentRole: string;
    department: string;
  };
  strengths: string[];
  improvementAreas: string[];
  skillProficiency: {
    overall: number;
    breakdown: {
      languages: number;
      products: number;
      channels: number;
      softSkills: number;
    };
    topSkills: string[];
    skillGaps: string[];
  };
  performance: {
    overallScore: number;
    csatAverage: number;
    resolutionRate: number;
    averageResolutionTime: string;
    trend: 'improving' | 'stable' | 'declining';
  };
  training: {
    completedCount: number;
    pendingCount: number;
    overdueCount: number;
    certificationsObtained: number;
    complianceStatus: 'compliant' | 'needs_attention' | 'non_compliant';
  };
  schedule: {
    shiftType: string;
    isWFH: boolean;
    weeklyHours: number;
    workingDays: string[];
  };
  workload: {
    currentLoad: number;
    capacity: number;
    utilizationPercentage: number;
    status: 'underutilized' | 'optimal' | 'overloaded';
  };
  recommendations: string[];
}

// Calculate proficiency score for languages
const calculateLanguageProficiency = (languages: any[]): number => {
  if (!languages || languages.length === 0) return 0;
  const proficiencyMap = { basic: 25, intermediate: 50, advanced: 75, native: 100 };
  const total = languages.reduce((sum, lang) => sum + (proficiencyMap[lang.proficiency] || 0), 0);
  return Math.round(total / languages.length);
};

// Calculate proficiency score for products
const calculateProductProficiency = (products: any[]): number => {
  if (!products || products.length === 0) return 0;
  const proficiencyMap = { beginner: 33, intermediate: 66, expert: 100 };
  const total = products.reduce((sum, prod) => sum + (proficiencyMap[prod.proficiency] || 0), 0);
  return Math.round(total / products.length);
};

// Calculate proficiency score for channels
const calculateChannelProficiency = (channels: any[]): number => {
  if (!channels || channels.length === 0) return 0;
  const proficiencyMap = { basic: 25, intermediate: 50, advanced: 75 };
  const total = channels.reduce((sum, ch) => sum + (proficiencyMap[ch.proficiency] || 0), 0);
  return Math.round(total / channels.length);
};

// Calculate proficiency score for soft skills
const calculateSoftSkillProficiency = (softSkills: any[]): number => {
  if (!softSkills || softSkills.length === 0) return 0;
  const proficiencyMap = { developing: 33, proficient: 66, expert: 100 };
  const total = softSkills.reduce((sum, skill) => sum + (proficiencyMap[skill.level] || 0), 0);
  return Math.round(total / softSkills.length);
};

// Determine performance trend
const determineTrend = (performances: any[]): 'improving' | 'stable' | 'declining' => {
  if (performances.length < 3) return 'stable';

  const sorted = performances.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  const recent = sorted.slice(-3);

  const scores = recent.map(p => p.overallScore || p.csat || 0);
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const difference = avgSecond - avgFirst;
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
};

// Format seconds to human readable
const formatDuration = (seconds: number): string => {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Calculate tenure
const calculateTenure = (hireDate: Date): string => {
  const now = new Date();
  const years = now.getFullYear() - hireDate.getFullYear();
  const months = now.getMonth() - hireDate.getMonth();

  const totalMonths = years * 12 + months;
  if (totalMonths < 1) return 'Less than a month';
  if (totalMonths < 12) return `${totalMonths} month${totalMonths > 1 ? 's' : ''}`;

  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (m === 0) return `${y} year${y > 1 ? 's' : ''}`;
  return `${y} year${y > 1 ? 's' : ''} ${m} month${m > 1 ? 's' : ''}`;
};

export const generateEmployeeInsights = async (
  employee: IEmployee,
  tenantId: string
): Promise<EmployeeInsights> => {
  // Fetch related data
  const [skills, performances, trainings, schedules] = await Promise.all([
    Skill.findOne({ tenantId, employeeId: employee.employeeId }),
    Performance.find({ tenantId, employeeId: employee.employeeId }).sort({ periodStart: -1 }),
    Training.find({ tenantId, employeeId: employee.employeeId }),
    Schedule.find({ tenantId, employeeId: employee.employeeId, isActive: true })
  ]);

  // Calculate skill proficiencies
  const skillBreakdown = {
    languages: calculateLanguageProficiency(skills?.languages || []),
    products: calculateProductProficiency(skills?.products || []),
    channels: calculateChannelProficiency(skills?.channels || []),
    softSkills: calculateSoftSkillProficiency(skills?.softSkills || [])
  };

  const overallProficiency = Math.round(
    (skillBreakdown.languages + skillBreakdown.products + skillBreakdown.channels + skillBreakdown.softSkills) / 4
  );

  // Identify top skills
  const topSkills: string[] = [];
  if (skills) {
    // Native/advanced languages
    const topLanguages = (skills.languages || [])
      .filter(l => l.proficiency === 'native' || l.proficiency === 'advanced')
      .map(l => `${l.language} (language)`);
    topSkills.push(...topLanguages);

    // Expert products
    const topProducts = (skills.products || [])
      .filter(p => p.proficiency === 'expert')
      .map(p => `${p.productName} (product)`);
    topSkills.push(...topProducts);

    // Advanced channels
    const topChannels = (skills.channels || [])
      .filter(c => c.proficiency === 'advanced')
      .map(c => `${c.channel} (channel)`);
    topSkills.push(...topChannels);
  }

  // Performance metrics
  let overallScore = 0;
  let csatAverage = 0;
  let totalTicketsHandled = 0;
  let totalTicketsResolved = 0;
  let avgResolutionTime = 0;

  if (performances.length > 0) {
    const scores = performances.map(p => p.overallScore).filter(s => s !== undefined);
    overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const csats = performances.map(p => p.csat).filter(c => c !== undefined);
    csatAverage = csats.length > 0 ? Math.round((csats.reduce((a, b) => a + b, 0) / csats.length) * 100) / 100 : 0;

    totalTicketsHandled = performances.reduce((sum, p) => sum + p.ticketsHandled, 0);
    totalTicketsResolved = performances.reduce((sum, p) => sum + p.ticketsResolved, 0);

    const resolutionTimes = performances.map(p => p.averageResolutionTime).filter(t => t !== undefined);
    avgResolutionTime = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : 0;
  }

  const resolutionRate = totalTicketsHandled > 0
    ? Math.round((totalTicketsResolved / totalTicketsHandled) * 100)
    : 0;

  // Training metrics
  const completedTrainings = trainings.filter(t => t.status === 'completed');
  const pendingTrainings = trainings.filter(t => ['enrolled', 'in_progress', 'pending'].includes(t.status));
  const now = new Date();
  const overdueTrainings = trainings.filter(t =>
    t.dueDate && t.dueDate < now && !['completed', 'cancelled'].includes(t.status)
  );
  const certificationsObtained = trainings.filter(t => t.certificateObtained).length;

  let complianceStatus: 'compliant' | 'needs_attention' | 'non_compliant' = 'compliant';
  if (overdueTrainings.some(t => t.isMandatory)) {
    complianceStatus = 'non_compliant';
  } else if (overdueTrainings.length > 0) {
    complianceStatus = 'needs_attention';
  }

  // Schedule info
  const activeSchedule = schedules.length > 0 ? schedules[0] : null;
  const scheduleInfo = {
    shiftType: activeSchedule?.shiftType || 'flexible',
    isWFH: activeSchedule?.isWorkFromHome || false,
    weeklyHours: activeSchedule?.weeklyHours || 40,
    workingDays: activeSchedule?.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  };

  // Workload calculation (simple version)
  const standardWeeklyHours = 40;
  const currentLoad = scheduleInfo.weeklyHours;
  const utilizationPercentage = Math.round((currentLoad / standardWeeklyHours) * 100);

  let workloadStatus: 'underutilized' | 'optimal' | 'overloaded' = 'optimal';
  if (utilizationPercentage < 70) workloadStatus = 'underutilized';
  else if (utilizationPercentage > 100) workloadStatus = 'overloaded';

  // Identify strengths and improvement areas
  const strengths: string[] = [];
  const improvementAreas: string[] = [];

  // Based on performance
  if (overallScore >= 80) strengths.push('Consistently high overall performance');
  else if (overallScore < 50) improvementAreas.push('Overall performance needs improvement');

  if (csatAverage >= 4.5) strengths.push('Excellent customer satisfaction ratings');
  else if (csatAverage > 0 && csatAverage < 3.5) improvementAreas.push('Customer satisfaction can be improved');

  if (resolutionRate >= 90) strengths.push('High ticket resolution rate');
  else if (resolutionRate > 0 && resolutionRate < 70) improvementAreas.push('Ticket resolution rate needs attention');

  // Based on training
  if (certificationsObtained >= 5) strengths.push('Well-certified professional');
  if (completedTrainings.length >= 10) strengths.push('Active learner with many completed trainings');

  if (overdueTrainings.length > 0) improvementAreas.push(`${overdueTrainings.length} overdue training(s)`);
  if (pendingTrainings.length > 5) improvementAreas.push('Multiple pending trainings to complete');

  // Based on skills
  if (skillBreakdown.products >= 70 && (skills?.products?.length || 0) >= 3) {
    strengths.push('Strong product knowledge');
  }
  if (skillBreakdown.languages >= 70 && (skills?.languages?.length || 0) >= 2) {
    strengths.push('Multilingual capability');
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (improvementAreas.length > 0) {
    recommendations.push(`Focus on: ${improvementAreas.slice(0, 2).join(', ')}`);
  }

  if (pendingTrainings.some(t => t.isMandatory)) {
    const mandatoryPending = pendingTrainings.filter(t => t.isMandatory);
    recommendations.push(`Complete ${mandatoryPending.length} mandatory training(s)`);
  }

  if (utilizationPercentage < 80) {
    recommendations.push('Consider assigning additional responsibilities');
  } else if (utilizationPercentage > 95) {
    recommendations.push('Current workload is high - consider redistributing tasks');
  }

  if (performances.length > 0 && determineTrend(performances) === 'declining') {
    recommendations.push('Performance trend shows decline - schedule review meeting');
  }

  if (topSkills.length > 0) {
    recommendations.push(`Leverage ${topSkills.length} top skills in upcoming projects`);
  }

  return {
    overview: {
      tenure: calculateTenure(employee.hireDate),
      experienceLevel: employee.level,
      currentRole: employee.role,
      department: employee.department
    },
    strengths: [...new Set(strengths)],
    improvementAreas: [...new Set(improvementAreas)],
    skillProficiency: {
      overall: overallProficiency,
      breakdown: skillBreakdown,
      topSkills: topSkills.slice(0, 5),
      skillGaps: [] // Could be expanded with role-based skill requirements
    },
    performance: {
      overallScore,
      csatAverage,
      resolutionRate,
      averageResolutionTime: formatDuration(avgResolutionTime),
      trend: determineTrend(performances)
    },
    training: {
      completedCount: completedTrainings.length,
      pendingCount: pendingTrainings.length,
      overdueCount: overdueTrainings.length,
      certificationsObtained,
      complianceStatus
    },
    schedule: scheduleInfo,
    workload: {
      currentLoad,
      capacity: standardWeeklyHours,
      utilizationPercentage,
      status: workloadStatus
    },
    recommendations
  };
};
