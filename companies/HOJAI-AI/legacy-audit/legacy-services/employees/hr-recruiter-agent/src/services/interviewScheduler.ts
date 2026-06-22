/**
 * HR Recruiter Agent - Interview Scheduler Service
 * AI-powered interview scheduling with conflict resolution and feedback tracking
 */

import { v4 as uuidv4 } from 'uuid';
import {
  InterviewSchedule,
  InterviewAssignment,
  InterviewFeedback,
  InterviewType,
  InterviewStatus,
  Candidate,
  Job,
  InterviewRound,
} from '../types';

interface InterviewSchedulerConfig {
  defaultDuration: number;
  bufferBetweenInterviews: number;
  reminder24hBefore: boolean;
  reminder1hBefore: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface CalendarEvent {
  id: string;
  interviewerId: string;
  start: Date;
  end: Date;
  title: string;
}

export class InterviewScheduler {
  private config: InterviewSchedulerConfig;
  private calendarEvents: Map<string, CalendarEvent[]> = new Map();

  constructor(config?: Partial<InterviewSchedulerConfig>) {
    this.config = {
      defaultDuration: 60,
      bufferBetweenInterviews: 15,
      reminder24hBefore: true,
      reminder1hBefore: true,
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      ...config,
    };
  }

  /**
   * Schedule an interview
   */
  scheduleInterview(
    candidate: Candidate,
    job: Job,
    input: {
      interviewType: InterviewType;
      roundNumber: number;
      scheduledAt: string;
      duration?: number;
      timezone?: string;
      location?: string;
      meetingLink?: string;
      interviewerIds: string[];
    },
    createdBy: string = 'system'
  ): InterviewSchedule {
    const scheduledAt = new Date(input.scheduledAt);
    const duration = input.duration || this.config.defaultDuration;
    const timezone = input.timezone || 'Asia/Kolkata';

    // Validate scheduled time
    this.validateScheduledTime(scheduledAt);

    // Check interviewer availability
    const interviewerAssignments = this.assignInterviewers(
      input.interviewerIds,
      scheduledAt,
      duration
    );

    // Check for conflicts
    const conflicts = this.checkConflicts(interviewerAssignments);
    if (conflicts.length > 0) {
      throw new Error(`Interviewer conflicts detected: ${conflicts.join(', ')}`);
    }

    // Create interview schedule
    const interview: InterviewSchedule = {
      id: uuidv4(),
      candidateId: candidate.id,
      jobId: job.id,

      interviewType: input.interviewType,
      roundNumber: input.roundNumber,

      scheduledAt: scheduledAt.toISOString(),
      duration,
      timezone,

      location: input.location,
      meetingLink: input.meetingLink,

      interviewers: interviewerAssignments,
      status: InterviewStatus.SCHEDULED,

      reminders: {
        sent24h: false,
        sent1h: false,
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
    };

    // Add calendar events for all interviewers
    this.addCalendarEvents(interview);

    return interview;
  }

  /**
   * Validate scheduled time
   */
  private validateScheduledTime(scheduledAt: Date): void {
    const day = scheduledAt.getDay();

    // Check working days
    if (!this.config.workingDays.includes(day)) {
      throw new Error(`Cannot schedule on day ${day}. Available days: ${this.config.workingDays.join(', ')}`);
    }

    // Check working hours
    const hours = scheduledAt.getHours();
    const minutes = scheduledAt.getMinutes();
    const scheduledMinutes = hours * 60 + minutes;

    const [startHour, startMin] = this.config.workingHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.config.workingHoursEnd.split(':').map(Number);

    const workStart = startHour * 60 + startMin;
    const workEnd = endHour * 60 + endMin;

    if (scheduledMinutes < workStart || scheduledMinutes > workEnd - 30) {
      throw new Error(`Time must be between ${this.config.workingHoursStart} and ${this.config.workingHoursEnd}`);
    }

    // Check not in past
    if (scheduledAt < new Date()) {
      throw new Error('Cannot schedule interview in the past');
    }
  }

  /**
   * Assign interviewers to an interview
   */
  private assignInterviewers(
    interviewerIds: string[],
    scheduledAt: Date,
    duration: number
  ): InterviewAssignment[] {
    return interviewerIds.map((id, index) => ({
      interviewerId: id,
      interviewerName: `Interviewer ${id.slice(0, 8)}`, // Placeholder
      interviewerEmail: `${id}@company.com`, // Placeholder
      interviewerRole: index === 0 ? 'Lead' : 'Panelist',
      confirmed: false,
      feedbackSubmitted: false,
    }));
  }

  /**
   * Check for scheduling conflicts
   */
  private checkConflicts(assignments: InterviewAssignment[]): string[] {
    const conflicts: string[] = [];

    for (const assignment of assignments) {
      const events = this.calendarEvents.get(assignment.interviewerId) || [];
      // Check if interviewer has any events during the scheduled time
      // This is simplified - in production, check against actual calendar
      if (events.length > 100) { // Simulate conflict check
        conflicts.push(assignment.interviewerName);
      }
    }

    return conflicts;
  }

  /**
   * Add calendar events for interview
   */
  private addCalendarEvents(interview: InterviewSchedule): void {
    const start = new Date(interview.scheduledAt);
    const end = new Date(start.getTime() + interview.duration * 60000);

    for (const assignment of interview.interviewers) {
      const events = this.calendarEvents.get(assignment.interviewerId) || [];

      events.push({
        id: interview.id,
        interviewerId: assignment.interviewerId,
        start,
        end,
        title: `Interview: ${interview.interviewType} (Round ${interview.roundNumber})`,
      });

      this.calendarEvents.set(assignment.interviewerId, events);
    }
  }

  /**
   * Reschedule an interview
   */
  rescheduleInterview(
    interview: InterviewSchedule,
    newScheduledAt: string,
    newInterviewerIds?: string[]
  ): InterviewSchedule {
    // Remove old calendar events
    this.removeCalendarEvents(interview);

    // Update schedule
    const scheduledAt = new Date(newScheduledAt);
    this.validateScheduledTime(scheduledAt);

    interview.scheduledAt = scheduledAt.toISOString();
    interview.status = InterviewStatus.RESCHEDULED;

    if (newInterviewerIds) {
      interview.interviewers = this.assignInterviewers(
        newInterviewerIds,
        scheduledAt,
        interview.duration
      );
    }

    // Add new calendar events
    this.addCalendarEvents(interview);

    interview.updatedAt = new Date().toISOString();

    return interview;
  }

  /**
   * Cancel an interview
   */
  cancelInterview(
    interview: InterviewSchedule,
    reason: string
  ): InterviewSchedule {
    this.removeCalendarEvents(interview);

    interview.status = InterviewStatus.CANCELLED;
    interview.cancellationReason = reason;
    interview.updatedAt = new Date().toISOString();

    return interview;
  }

  /**
   * Remove calendar events
   */
  private removeCalendarEvents(interview: InterviewSchedule): void {
    for (const assignment of interview.interviewers) {
      const events = this.calendarEvents.get(assignment.interviewerId) || [];
      const filtered = events.filter(e => e.id !== interview.id);
      this.calendarEvents.set(assignment.interviewerId, filtered);
    }
  }

  /**
   * Confirm an interview
   */
  confirmInterview(interview: InterviewSchedule): InterviewSchedule {
    interview.status = InterviewStatus.CONFIRMED;
    interview.updatedAt = new Date().toISOString();

    // Update interviewer confirmations
    interview.interviewers = interview.interviewers.map(a => ({
      ...a,
      confirmed: true,
    }));

    return interview;
  }

  /**
   * Mark interview as completed
   */
  completeInterview(interview: InterviewSchedule): InterviewSchedule {
    if (interview.status !== InterviewStatus.CONFIRMED && interview.status !== InterviewStatus.SCHEDULED) {
      throw new Error(`Cannot complete interview with status: ${interview.status}`);
    }

    interview.status = InterviewStatus.COMPLETED;
    interview.updatedAt = new Date().toISOString();

    return interview;
  }

  /**
   * Mark candidate as no-show
   */
  markNoShow(interview: InterviewSchedule): InterviewSchedule {
    interview.status = InterviewStatus.NO_SHOW;
    interview.updatedAt = new Date().toISOString();

    return interview;
  }

  /**
   * Submit interview feedback
   */
  submitFeedback(
    interview: InterviewSchedule,
    feedback: Omit<InterviewFeedback, 'submittedAt'>
  ): InterviewFeedback {
    // Validate interviewer
    const assignment = interview.interviewers.find(
      a => a.interviewerId === feedback.interviewerId
    );

    if (!assignment) {
      throw new Error('Interviewer not assigned to this interview');
    }

    // Check if already submitted
    if (assignment.feedbackSubmitted) {
      throw new Error('Feedback already submitted by this interviewer');
    }

    // Create feedback
    const interviewFeedback: InterviewFeedback = {
      ...feedback,
      submittedAt: new Date().toISOString(),
    };

    // Add to interview
    if (!interview.feedback) {
      interview.feedback = [];
    }
    interview.feedback.push(interviewFeedback);

    // Mark interviewer as submitted
    assignment.feedbackSubmitted = true;

    interview.updatedAt = new Date().toISOString();

    return interviewFeedback;
  }

  /**
   * Get interview summary
   */
  getInterviewSummary(interview: InterviewSchedule): {
    overallScore: number;
    recommendation: InterviewFeedback['recommendation'];
    completedBy: string;
    pendingBy: string[];
    strengths: string[];
    concerns: string[];
  } {
    if (!interview.feedback || interview.feedback.length === 0) {
      return {
        overallScore: 0,
        recommendation: 'no_hire',
        completedBy: '',
        pendingBy: interview.interviewers.filter(a => !a.feedbackSubmitted).map(a => a.interviewerName),
        strengths: [],
        concerns: [],
      };
    }

    // Calculate average scores
    const scores = interview.feedback.map(f => f.overallScore);
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length * 20; // Convert to 100

    // Aggregate recommendations
    const recommendations = interview.feedback.map(f => f.recommendation);
    const recommendation = this.aggregateRecommendations(recommendations);

    // Aggregate strengths
    const allStrengths = interview.feedback.flatMap(f => f.strengths);
    const strengths = this.getTopItems(allStrengths, 5);

    // Aggregate concerns
    const allConcerns = interview.feedback.flatMap(f => f.concerns);
    const concerns = this.getTopItems(allConcerns, 5);

    return {
      overallScore: Math.round(overallScore),
      recommendation,
      completedBy: interview.feedback.map(f => f.interviewerName).join(', '),
      pendingBy: interview.interviewers.filter(a => !a.feedbackSubmitted).map(a => a.interviewerName),
      strengths,
      concerns,
    };
  }

  /**
   * Aggregate recommendations from multiple interviewers
   */
  private aggregateRecommendations(
    recommendations: InterviewFeedback['recommendation'][]
  ): InterviewFeedback['recommendation'] {
    const counts = {
      strong_hire: 0,
      hire: 0,
      no_hire: 0,
      strong_no_hire: 0,
    };

    for (const rec of recommendations) {
      counts[rec]++;
    }

    if (counts.strong_hire >= recommendations.length * 0.7) return 'strong_hire';
    if (counts.hire + counts.strong_hire >= recommendations.length * 0.6) return 'hire';
    if (counts.strong_no_hire >= recommendations.length * 0.5) return 'strong_no_hire';
    return 'no_hire';
  }

  /**
   * Get top items from array
   */
  private getTopItems(items: string[], top: number): string[] {
    const frequency = new Map<string, number>();

    for (const item of items) {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    }

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([item]) => item);
  }

  /**
   * Find available time slots
   */
  findAvailableSlots(
    interviewerIds: string[],
    date: Date,
    duration: number,
    count: number = 5
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const [startHour, startMin] = this.config.workingHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.config.workingHoursEnd.split(':').map(Number);

    let currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMin, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(endHour, endMin, 0, 0);

    while (currentSlot < endOfDay && slots.length < count) {
      const slotEnd = new Date(currentSlot.getTime() + duration * 60000);

      if (slotEnd <= endOfDay) {
        const available = this.checkSlotAvailability(interviewerIds, currentSlot, slotEnd);
        slots.push({
          start: new Date(currentSlot),
          end: slotEnd,
          available,
        });
      }

      // Move to next slot (30 min intervals)
      currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
    }

    return slots;
  }

  /**
   * Check if a time slot is available for all interviewers
   */
  private checkSlotAvailability(
    interviewerIds: string[],
    start: Date,
    end: Date
  ): boolean {
    for (const id of interviewerIds) {
      const events = this.calendarEvents.get(id) || [];

      for (const event of events) {
        // Check for overlap
        if (start < event.end && end > event.start) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create interview series for a job
   */
  createInterviewSeries(
    candidate: Candidate,
    job: Job,
    createdBy: string = 'system'
  ): InterviewSchedule[] {
    if (!job.interviewRounds || job.interviewRounds.length === 0) {
      // Create default interview series
      const defaultRounds: InterviewRound[] = [
        { name: 'Phone Screen', type: InterviewType.PHONE_SCREEN, duration: 30, interviewers: [], description: 'Initial screening call', order: 1 },
        { name: 'Technical Interview', type: InterviewType.TECHNICAL, duration: 60, interviewers: [], description: 'Technical skills assessment', order: 2 },
        { name: 'Culture Fit', type: InterviewType.CULTURE_FIT, duration: 45, interviewers: [], description: 'Team and culture fit', order: 3 },
      ];

      return this.createInterviewSeriesFromRounds(defaultRounds, candidate.id, job.id, createdBy);
    }

    return this.createInterviewSeriesFromRounds(job.interviewRounds, candidate.id, job.id, createdBy);
  }

  /**
   * Create interview series from rounds
   */
  private createInterviewSeriesFromRounds(
    rounds: InterviewRound[],
    candidateId: string,
    jobId: string,
    createdBy: string
  ): InterviewSchedule[] {
    const interviews: InterviewSchedule[] = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    for (const round of rounds) {
      // Find next available slot
      const slots = this.findAvailableSlots(
        round.interviewers.length > 0 ? round.interviewers : ['default'],
        currentDate,
        round.duration
      );

      const availableSlot = slots.find(s => s.available);

      const interview: InterviewSchedule = {
        id: uuidv4(),
        candidateId,
        jobId,
        interviewType: round.type,
        roundNumber: round.order,
        scheduledAt: (availableSlot?.start || currentDate).toISOString(),
        duration: round.duration,
        timezone: 'Asia/Kolkata',
        interviewers: round.interviewers.map((id, i) => ({
          interviewerId: id,
          interviewerName: `Interviewer ${id.slice(0, 8)}`,
          interviewerRole: i === 0 ? 'Lead' : 'Panelist',
          confirmed: false,
          feedbackSubmitted: false,
        })),
        status: InterviewStatus.SCHEDULED,
        reminders: { sent24h: false, sent1h: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy,
      };

      interviews.push(interview);

      // Move to next day for next interview
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return interviews;
  }

  /**
   * Get interview recommendations
   */
  getHiringRecommendation(interviews: InterviewSchedule[]): {
    recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | 'insufficient_data';
    confidence: number;
    summary: string;
  } {
    const completedInterviews = interviews.filter(i => i.status === InterviewStatus.COMPLETED);

    if (completedInterviews.length === 0) {
      return {
        recommendation: 'insufficient_data',
        confidence: 0,
        summary: 'No completed interviews yet to make a recommendation.',
      };
    }

    const summaries = completedInterviews.map(i => this.getInterviewSummary(i));

    // Aggregate all recommendations
    const allRecommendations = summaries.map(s => s.recommendation);
    const finalRecommendation = this.aggregateRecommendations(allRecommendations);

    // Calculate confidence based on feedback count
    const confidence = Math.min(100, completedInterviews.length * 20 + summaries.reduce((sum, s) => sum + s.overallScore, 0) / summaries.length * 0.3);

    // Generate summary
    const avgScore = summaries.reduce((sum, s) => sum + s.overallScore, 0) / summaries.length;
    const allStrengths = summaries.flatMap(s => s.strengths);
    const topStrengths = this.getTopItems(allStrengths, 3);

    let summary = `Average interview score: ${Math.round(avgScore)}/100. `;
    if (topStrengths.length > 0) {
      summary += `Key strengths: ${topStrengths.join(', ')}.`;
    }

    return {
      recommendation: finalRecommendation as 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | 'insufficient_data',
      confidence: Math.round(confidence),
      summary,
    };
  }
}

export const interviewScheduler = new InterviewScheduler();
