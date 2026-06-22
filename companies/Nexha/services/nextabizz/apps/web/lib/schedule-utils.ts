/**
 * Schedule utilities for date manipulation and calendar calculations
 */

export type ViewMode = 'week' | 'month';

export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  serviceType: ServiceType;
  vendorId: string;
  vendorName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: AppointmentStatus;
  reminderSettings?: ReminderSettings;
  notes?: string;
  color?: string;
}

export type ServiceType =
  | 'installation'
  | 'repair'
  | 'maintenance'
  | 'consultation'
  | 'inspection'
  | 'delivery';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface ReminderSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  minutesBefore: number; // Minutes before appointment to send reminder
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface VendorAvailability {
  vendorId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  breakStart?: string;
  breakEnd?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingEvents: ScheduleEvent[];
}

// Service type colors for calendar
export const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
  installation: '#7C3AED', // Purple
  repair: '#F59E0B', // Amber
  maintenance: '#10B981', // Emerald
  consultation: '#3B82F6', // Blue
  inspection: '#EC4899', // Pink
  delivery: '#6366F1', // Indigo
};

// Status colors
export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: '#3B82F6', // Blue
  confirmed: '#10B981', // Emerald
  in_progress: '#F59E0B', // Amber
  completed: '#6B7280', // Gray
  cancelled: '#EF4444', // Red
  no_show: '#9CA3AF', // Light Gray
};

/**
 * Get the start of a day (midnight)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of a week (Sunday)
 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a week (Saturday 23:59:59.999)
 */
export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of a month
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the end of a month
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get all days in a month, including padding for weeks
 */
export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days: Date[] = [];

  // Add padding days from previous month
  const startDayOfWeek = start.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const paddingDate = new Date(start);
    paddingDate.setDate(paddingDate.getDate() - i - 1);
    days.push(paddingDate);
  }

  // Add all days of the current month
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // Add padding days for remaining week(s)
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    const paddingDate = new Date(end);
    paddingDate.setDate(paddingDate.getDate() + i);
    days.push(paddingDate);
  }

  return days;
}

/**
 * Get all days in a week, starting from Sunday
 */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  return days;
}

/**
 * Get hours for a day (for time grid display)
 */
export function getDayHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format full date
 */
export function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if two date ranges overlap
 */
export function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Detect conflicts for a proposed appointment
 */
export function detectConflicts(
  proposedStart: Date,
  proposedEnd: Date,
  existingEvents: ScheduleEvent[],
  vendorId?: string
): ConflictResult {
  const conflictingEvents = existingEvents.filter((event) => {
    // If vendorId is specified, only check events for the same vendor
    if (vendorId && event.vendorId !== vendorId) {
      return false;
    }

    // Check if statuses allow conflict detection
    if (
      event.status === 'cancelled' ||
      event.status === 'completed' ||
      event.status === 'no_show'
    ) {
      return false;
    }

    return rangesOverlap(
      proposedStart,
      proposedEnd,
      new Date(event.startTime),
      new Date(event.endTime)
    );
  });

  return {
    hasConflict: conflictingEvents.length > 0,
    conflictingEvents,
  };
}

/**
 * Generate time slots for availability display
 */
export function generateTimeSlots(
  date: Date,
  intervalMinutes: number = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = startOfDay(date);
  const end = endOfDay(date);

  let current = new Date(start);
  while (current < end) {
    const slotEnd = new Date(current);
    slotEnd.setMinutes(slotEnd.getMinutes() + intervalMinutes);

    slots.push({
      start: new Date(current),
      end: slotEnd,
      available: true,
    });

    current = slotEnd;
  }

  return slots;
}

/**
 * Get service type label
 */
export function getServiceTypeLabel(type: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    installation: 'Installation',
    repair: 'Repair',
    maintenance: 'Maintenance',
    consultation: 'Consultation',
    inspection: 'Inspection',
    delivery: 'Delivery',
  };
  return labels[type];
}

/**
 * Get status label
 */
export function getStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
  };
  return labels[status];
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is in the current month
 */
export function isCurrentMonth(date: Date, referenceDate: Date): boolean {
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  );
}

/**
 * Navigate to previous period
 */
export function getPreviousPeriod(
  date: Date,
  mode: ViewMode
): Date {
  const result = new Date(date);

  if (mode === 'week') {
    result.setDate(result.getDate() - 7);
  } else {
    result.setMonth(result.getMonth() - 1);
  }

  return result;
}

/**
 * Navigate to next period
 */
export function getNextPeriod(
  date: Date,
  mode: ViewMode
): Date {
  const result = new Date(date);

  if (mode === 'week') {
    result.setDate(result.getDate() + 7);
  } else {
    result.setMonth(result.getMonth() + 1);
  }

  return result;
}

/**
 * Get period label for display
 */
export function getPeriodLabel(date: Date, mode: ViewMode): string {
  if (mode === 'week') {
    const start = startOfWeek(date);
    const end = endOfWeek(date);

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.getDate()}, ${start.getFullYear()}`;
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
}

/**
 * Calculate event position for calendar display
 */
export function calculateEventPosition(
  event: ScheduleEvent,
  dayStart: Date,
  dayEnd: Date
): { top: number; height: number; left: number; width: number } | null {
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);

  // Check if event is on this day
  if (!isSameDay(eventStart, dayStart) && !isSameDay(eventEnd, dayStart)) {
    return null;
  }

  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  // Calculate top position (percentage of day)
  const startMs = Math.max(eventStart.getTime(), dayStartMs);
  const endMs = Math.min(eventEnd.getTime(), dayEndMs);

  const dayDuration = dayEndMs - dayStartMs;
  const top = ((startMs - dayStartMs) / dayDuration) * 100;
  const height = ((endMs - startMs) / dayDuration) * 100;

  return {
    top: Math.max(0, top),
    height: Math.min(100 - top, height),
    left: 0,
    width: 100,
  };
}

/**
 * Parse time string to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a time is within a vendor's availability window
 */
export function isWithinAvailability(
  eventStart: Date,
  eventEnd: Date,
  availability: VendorAvailability[]
): boolean {
  const dayOfWeek = eventStart.getDay();
  const eventMinutesStart = eventStart.getHours() * 60 + eventStart.getMinutes();
  const eventMinutesEnd = eventEnd.getHours() * 60 + eventEnd.getMinutes();

  const dayAvailability = availability.find((a) => a.dayOfWeek === dayOfWeek);

  if (!dayAvailability) {
    return false;
  }

  const availStart = timeToMinutes(dayAvailability.startTime);
  const availEnd = timeToMinutes(dayAvailability.endTime);
  const breakStart = dayAvailability.breakStart
    ? timeToMinutes(dayAvailability.breakStart)
    : null;
  const breakEnd = dayAvailability.breakEnd
    ? timeToMinutes(dayAvailability.breakEnd)
    : null;

  // Check if within availability window
  if (eventMinutesStart < availStart || eventMinutesEnd > availEnd) {
    return false;
  }

  // Check if within break
  if (breakStart !== null && breakEnd !== null) {
    if (
      (eventMinutesStart >= breakStart && eventMinutesStart < breakEnd) ||
      (eventMinutesEnd > breakStart && eventMinutesEnd <= breakEnd)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Get duration in minutes
 */
export function getDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Format duration for display
 */
export function formatDuration(start: Date, end: Date): string {
  const minutes = getDurationMinutes(start, end);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
