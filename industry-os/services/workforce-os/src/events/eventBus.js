/**
 * RTMN Event Bus Integration
 *
 * Connects Workforce OS to REZ Event Bus (Port 4510)
 * for Pub/Sub event-driven architecture
 */

import axios from 'axios';
import EventEmitter from 'events';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';

// Event types for Workforce OS
export const WORKFORCE_EVENTS = {
  // Employee Events
  EMPLOYEE_CREATED: 'workforce.employee.created',
  EMPLOYEE_UPDATED: 'workforce.employee.updated',
  EMPLOYEE_TERMINATED: 'workforce.employee.terminated',
  EMPLOYEE_ASSIGNED: 'workforce.employee.assigned',

  // Leave Events
  LEAVE_REQUESTED: 'workforce.leave.requested',
  LEAVE_APPROVED: 'workforce.leave.approved',
  LEAVE_REJECTED: 'workforce.leave.rejected',
  LEAVE_CANCELLED: 'workforce.leave.cancelled',

  // Attendance Events
  ATTENDANCE_CHECKIN: 'workforce.attendance.checkin',
  ATTENDANCE_CHECKOUT: 'workforce.attendance.checkout',
  ATTENDANCE_ANOMALY: 'workforce.attendance.anomaly',

  // Payroll Events
  PAYROLL_PROCESSED: 'workforce.payroll.processed',
  PAYROLL_APPROVED: 'workforce.payroll.approved',
  PAYSLIP_GENERATED: 'workforce.payroll.payslip_generated',

  // Benefits Events
  BENEFITS_ENROLLED: 'workforce.benefits.enrolled',
  BENEFITS_CLAIMED: 'workforce.benefits.claimed',

  // Training Events
  TRAINING_ENROLLED: 'workforce.training.enrolled',
  TRAINING_COMPLETED: 'workforce.training.completed',
  CERTIFICATION_EARNED: 'workforce.certification.earned',

  // Performance Events
  REVIEW_STARTED: 'workforce.performance.review_started',
  REVIEW_COMPLETED: 'workforce.performance.review_completed',
  GOAL_SET: 'workforce.performance.goal_set',
  FEEDBACK_SUBMITTED: 'workforce.performance.feedback_submitted',

  // Expense Events
  EXPENSE_SUBMITTED: 'workforce.expense.submitted',
  EXPENSE_APPROVED: 'workforce.expense.approved',
  EXPENSE_REJECTED: 'workforce.expense.rejected',

  // Onboarding Events
  ONBOARDING_STARTED: 'workforce.onboarding.started',
  ONBOARDING_COMPLETED: 'workforce.onboarding.completed',

  // Exit Events
  EXIT_INITIATED: 'workforce.exit.initiated',
  EXIT_COMPLETED: 'workforce.exit.completed',
};

// Event Bus Client
class EventBusClient {
  constructor() {
    this.baseURL = EVENT_BUS_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
    });
    this.localEmitter = new EventEmitter();
    this.connected = false;
  }

  // Check connection
  async healthCheck() {
    try {
      const { data } = await this.client.get('/health');
      this.connected = data.status === 'healthy';
      return this.connected;
    } catch (error) {
      this.connected = false;
      console.warn('Event Bus not available, using local events');
      return false;
    }
  }

  // Publish event
  async publish(eventType, payload, metadata = {}) {
    const event = {
      type: eventType,
      payload,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: 'workforce-os',
      },
    };

    // Always emit locally (works even without Event Bus)
    this.localEmitter.emit(eventType, event);

    // Try to publish to Event Bus
    if (this.connected) {
      try {
        await this.client.post('/events/publish', event);
        console.log(`Event published: ${eventType}`);
      } catch (error) {
        console.warn(`Failed to publish to Event Bus: ${error.message}`);
      }
    }

    return event;
  }

  // Subscribe to event
  subscribe(eventType, handler) {
    this.localEmitter.on(eventType, handler);
    console.log(`Subscribed to: ${eventType}`);
  }

  // Unsubscribe from event
  unsubscribe(eventType, handler) {
    this.localEmitter.off(eventType, handler);
  }

  // Get event history
  async getHistory(eventType, limit = 100) {
    if (!this.connected) {
      return [];
    }

    try {
      const { data } = await this.client.get('/events/history', {
        params: { type: eventType, limit }
      });
      return data.events || [];
    } catch (error) {
      console.warn('Failed to get event history:', error.message);
      return [];
    }
  }

  // Create subscription on Event Bus
  async createSubscription(eventType, webhookUrl) {
    if (!this.connected) {
      console.warn('Cannot create subscription: Event Bus not available');
      return null;
    }

    try {
      const { data } = await this.client.post('/subscriptions', {
        eventType,
        webhookUrl,
        service: 'workforce-os',
      });
      return data;
    } catch (error) {
      console.error('Failed to create subscription:', error.message);
      return null;
    }
  }
}

export const eventBus = new EventBusClient();

// Event Publisher Helper
export class WorkforceEventPublisher {
  constructor() {
    this.publish = eventBus.publish.bind(eventBus);
  }

  // Employee events
  async employeeCreated(employee) {
    return this.publish(WORKFORCE_EVENTS.EMPLOYEE_CREATED, {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      department: employee.departmentId,
      position: employee.positionId,
      employmentType: employee.employmentType,
      joiningDate: employee.joiningDate,
    });
  }

  async employeeUpdated(employee, changes) {
    return this.publish(WORKFORCE_EVENTS.EMPLOYEE_UPDATED, {
      employeeId: employee.id,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  async employeeTerminated(employee, reason) {
    return this.publish(WORKFORCE_EVENTS.EMPLOYEE_TERMINATED, {
      employeeId: employee.id,
      reason,
      terminationDate: new Date().toISOString(),
    });
  }

  // Leave events
  async leaveRequested(request) {
    return this.publish(WORKFORCE_EVENTS.LEAVE_REQUESTED, {
      requestId: request.id,
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      status: 'pending',
    });
  }

  async leaveApproved(request, approvedBy) {
    return this.publish(WORKFORCE_EVENTS.LEAVE_APPROVED, {
      requestId: request.id,
      employeeId: request.employeeId,
      approvedBy,
      status: 'approved',
    });
  }

  async leaveRejected(request, rejectedBy, reason) {
    return this.publish(WORKFORCE_EVENTS.LEAVE_REJECTED, {
      requestId: request.id,
      employeeId: request.employeeId,
      rejectedBy,
      reason,
      status: 'rejected',
    });
  }

  // Attendance events
  async attendanceCheckedIn(employeeId, location) {
    return this.publish(WORKFORCE_EVENTS.ATTENDANCE_CHECKIN, {
      employeeId,
      location,
      timestamp: new Date().toISOString(),
    });
  }

  async attendanceCheckedOut(employeeId, hours) {
    return this.publish(WORKFORCE_EVENTS.ATTENDANCE_CHECKOUT, {
      employeeId,
      hours,
      timestamp: new Date().toISOString(),
    });
  }

  async attendanceAnomaly(employeeId, anomalyType, details) {
    return this.publish(WORKFORCE_EVENTS.ATTENDANCE_ANOMALY, {
      employeeId,
      anomalyType,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Payroll events
  async payrollProcessed(runId, employeeCount, totalAmount) {
    return this.publish(WORKFORCE_EVENTS.PAYROLL_PROCESSED, {
      runId,
      employeeCount,
      totalAmount,
      timestamp: new Date().toISOString(),
    });
  }

  // Training events
  async trainingEnrolled(employeeId, courseId, courseName) {
    return this.publish(WORKFORCE_EVENTS.TRAINING_ENROLLED, {
      employeeId,
      courseId,
      courseName,
      enrolledAt: new Date().toISOString(),
    });
  }

  async trainingCompleted(employeeId, courseId, courseName, score) {
    return this.publish(WORKFORCE_EVENTS.TRAINING_COMPLETED, {
      employeeId,
      courseId,
      courseName,
      score,
      completedAt: new Date().toISOString(),
    });
  }

  async certificationEarned(employeeId, certification) {
    return this.publish(WORKFORCE_EVENTS.CERTIFICATION_EARNED, {
      employeeId,
      certification,
      earnedAt: new Date().toISOString(),
    });
  }

  // Onboarding events
  async onboardingStarted(employeeId, workflowId) {
    return this.publish(WORKFORCE_EVENTS.ONBOARDING_STARTED, {
      employeeId,
      workflowId,
      startedAt: new Date().toISOString(),
    });
  }

  async onboardingCompleted(employeeId) {
    return this.publish(WORKFORCE_EVENTS.ONBOARDING_COMPLETED, {
      employeeId,
      completedAt: new Date().toISOString(),
    });
  }

  // Exit events
  async exitInitiated(employeeId, type, lastWorkingDay) {
    return this.publish(WORKFORCE_EVENTS.EXIT_INITIATED, {
      employeeId,
      type,
      lastWorkingDay,
      initiatedAt: new Date().toISOString(),
    });
  }

  async exitCompleted(employeeId, exitId) {
    return this.publish(WORKFORCE_EVENTS.EXIT_COMPLETED, {
      employeeId,
      exitId,
      completedAt: new Date().toISOString(),
    });
  }
}

export const eventPublisher = new WorkforceEventPublisher();

// Event Subscriber Helper
export class WorkforceEventSubscriber {
  constructor() {
    this.subscribe = eventBus.subscribe.bind(eventBus);
    this.handlers = new Map();
  }

  // Subscribe to all employee events
  subscribeToEmployeeEvents(handler) {
    const events = [
      WORKFORCE_EVENTS.EMPLOYEE_CREATED,
      WORKFORCE_EVENTS.EMPLOYEE_UPDATED,
      WORKFORCE_EVENTS.EMPLOYEE_TERMINATED,
    ];
    events.forEach(event => {
      this.subscribe(event, handler);
    });
  }

  // Subscribe to leave events
  subscribeToLeaveEvents(handler) {
    const events = [
      WORKFORCE_EVENTS.LEAVE_REQUESTED,
      WORKFORCE_EVENTS.LEAVE_APPROVED,
      WORKFORCE_EVENTS.LEAVE_REJECTED,
    ];
    events.forEach(event => {
      this.subscribe(event, handler);
    });
  }

  // Subscribe to training events
  subscribeToTrainingEvents(handler) {
    const events = [
      WORKFORCE_EVENTS.TRAINING_ENROLLED,
      WORKFORCE_EVENTS.TRAINING_COMPLETED,
      WORKFORCE_EVENTS.CERTIFICATION_EARNED,
    ];
    events.forEach(event => {
      this.subscribe(event, handler);
    });
  }

  // Subscribe to attendance events
  subscribeToAttendanceEvents(handler) {
    const events = [
      WORKFORCE_EVENTS.ATTENDANCE_CHECKIN,
      WORKFORCE_EVENTS.ATTENDANCE_CHECKOUT,
      WORKFORCE_EVENTS.ATTENDANCE_ANOMALY,
    ];
    events.forEach(event => {
      this.subscribe(event, handler);
    });
  }
}

export const eventSubscriber = new WorkforceEventSubscriber();

// Initialize event subscriptions
export async function initializeEventSubscriptions() {
  // Check Event Bus connection
  await eventBus.healthCheck();

  // Subscribe to cross-industry events
  // These events come from other Industry OS

  eventBus.subscribe('industry.staff.created', (event) => {
    console.log('Staff created in industry:', event.payload);
    // Handle industry staff creation
  });

  eventBus.subscribe('industry.training.completed', (event) => {
    console.log('Training completed in industry:', event.payload);
    // Sync training data
  });

  eventBus.subscribe('industry.certification.earned', (event) => {
    console.log('Certification earned in industry:', event.payload);
    // Update compliance records
  });

  console.log('Event subscriptions initialized');
  console.log(`Event Bus connected: ${eventBus.connected}`);
}

export default {
  eventBus,
  eventPublisher,
  eventSubscriber,
  WORKFORCE_EVENTS,
  initializeEventSubscriptions,
};
