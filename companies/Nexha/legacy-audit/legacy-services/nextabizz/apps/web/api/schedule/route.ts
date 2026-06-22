import { NextRequest, NextResponse } from 'next/server';
import {
  ScheduleEvent,
  ServiceType,
  AppointmentStatus,
  detectConflicts,
  VendorAvailability,
} from '@/lib/schedule-utils';
import { rateLimitMiddleware, getRateLimitHeaders, getRateLimitRecord } from '@/middleware/rateLimit';

// In-memory storage for demo (replace with Supabase in production)
let scheduleEvents: ScheduleEvent[] = [];
let vendorAvailability: VendorAvailability[] = [];

// Sample vendors
const vendors = [
  { id: 'v1', name: 'John Smith', specialty: 'installation' as ServiceType },
  { id: 'v2', name: 'Sarah Johnson', specialty: 'repair' as ServiceType },
  { id: 'v3', name: 'Mike Williams', specialty: 'maintenance' as ServiceType },
  { id: 'v4', name: 'Emily Brown', specialty: 'consultation' as ServiceType },
];

// Sample events for demo
const sampleEvents: ScheduleEvent[] = [
  {
    id: 'e1',
    title: 'HVAC Installation',
    description: 'Install new central AC unit',
    startTime: new Date(2026, 4, 11, 9, 0),
    endTime: new Date(2026, 4, 11, 12, 0),
    serviceType: 'installation',
    vendorId: 'v1',
    vendorName: 'John Smith',
    customerId: 'c1',
    customerName: 'Acme Corp',
    customerPhone: '555-0101',
    status: 'confirmed',
    reminderSettings: { email: true, sms: true, push: true, minutesBefore: 60 },
    notes: 'First floor unit',
  },
  {
    id: 'e2',
    title: 'Refrigerator Repair',
    description: 'Fix cooling issue',
    startTime: new Date(2026, 4, 11, 14, 0),
    endTime: new Date(2026, 4, 11, 16, 0),
    serviceType: 'repair',
    vendorId: 'v2',
    vendorName: 'Sarah Johnson',
    customerId: 'c2',
    customerName: 'Food Mart',
    customerPhone: '555-0102',
    status: 'scheduled',
    reminderSettings: { email: true, sms: false, push: true, minutesBefore: 30 },
  },
  {
    id: 'e3',
    title: 'Preventive Maintenance',
    description: 'Quarterly maintenance check',
    startTime: new Date(2026, 4, 12, 10, 0),
    endTime: new Date(2026, 4, 12, 11, 30),
    serviceType: 'maintenance',
    vendorId: 'v3',
    vendorName: 'Mike Williams',
    customerId: 'c3',
    customerName: 'Restaurant XYZ',
    customerPhone: '555-0103',
    status: 'confirmed',
    reminderSettings: { email: true, sms: true, push: false, minutesBefore: 60 },
  },
  {
    id: 'e4',
    title: 'Kitchen Consultation',
    description: 'Equipment assessment',
    startTime: new Date(2026, 4, 12, 13, 0),
    endTime: new Date(2026, 4, 12, 14, 0),
    serviceType: 'consultation',
    vendorId: 'v4',
    vendorName: 'Emily Brown',
    customerId: 'c4',
    customerName: 'New Restaurant',
    customerPhone: '555-0104',
    status: 'scheduled',
    reminderSettings: { email: false, sms: true, push: true, minutesBefore: 15 },
  },
  {
    id: 'e5',
    title: 'Safety Inspection',
    description: 'Annual fire safety check',
    startTime: new Date(2026, 4, 13, 9, 0),
    endTime: new Date(2026, 4, 13, 11, 0),
    serviceType: 'inspection',
    vendorId: 'v2',
    vendorName: 'Sarah Johnson',
    customerId: 'c5',
    customerName: 'Safety First Corp',
    customerPhone: '555-0105',
    status: 'confirmed',
    reminderSettings: { email: true, sms: true, push: true, minutesBefore: 120 },
  },
  {
    id: 'e6',
    title: 'Equipment Delivery',
    description: 'Deliver replacement parts',
    startTime: new Date(2026, 4, 13, 14, 0),
    endTime: new Date(2026, 4, 13, 15, 30),
    serviceType: 'delivery',
    vendorId: 'v1',
    vendorName: 'John Smith',
    customerId: 'c1',
    customerName: 'Acme Corp',
    customerPhone: '555-0101',
    status: 'scheduled',
    reminderSettings: { email: true, sms: false, push: true, minutesBefore: 45 },
  },
];

// Sample availability
const sampleAvailability: VendorAvailability[] = [
  { vendorId: 'v1', dayOfWeek: 1, startTime: '08:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { vendorId: 'v1', dayOfWeek: 2, startTime: '08:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { vendorId: 'v1', dayOfWeek: 3, startTime: '08:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { vendorId: 'v1', dayOfWeek: 4, startTime: '08:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { vendorId: 'v1', dayOfWeek: 5, startTime: '08:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { vendorId: 'v2', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakStart: '12:30', breakEnd: '13:30' },
  { vendorId: 'v2', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', breakStart: '12:30', breakEnd: '13:30' },
  { vendorId: 'v2', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', breakStart: '12:30', breakEnd: '13:30' },
  { vendorId: 'v2', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', breakStart: '12:30', breakEnd: '13:30' },
  { vendorId: 'v2', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', breakStart: '12:30', breakEnd: '13:30' },
  { vendorId: 'v3', dayOfWeek: 2, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '12:30' },
  { vendorId: 'v3', dayOfWeek: 3, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '12:30' },
  { vendorId: 'v3', dayOfWeek: 4, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '12:30' },
  { vendorId: 'v3', dayOfWeek: 5, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '12:30' },
  { vendorId: 'v4', dayOfWeek: 1, startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { vendorId: 'v4', dayOfWeek: 3, startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { vendorId: 'v4', dayOfWeek: 5, startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
];

// Initialize with sample data
scheduleEvents = [...sampleEvents];
vendorAvailability = [...sampleAvailability];

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const { searchParams } = new URL(request.url);

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const vendorId = searchParams.get('vendorId');
  const eventId = searchParams.get('eventId');
  const type = searchParams.get('type');

  // Return vendors
  if (type === 'vendors') {
    return NextResponse.json({
      success: true,
      data: vendors,
    });
  }

  // Return availability
  if (type === 'availability') {
    const availVendorId = searchParams.get('vendorId');
    const filtered = availVendorId
      ? vendorAvailability.filter((a) => a.vendorId === availVendorId)
      : vendorAvailability;
    return NextResponse.json({
      success: true,
      data: filtered,
    });
  }

  // Return single event
  if (eventId) {
    const event = scheduleEvents.find((e) => e.id === eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: event,
    });
  }

  // Return events filtered by date range
  let filtered = [...scheduleEvents];

  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter((e) => new Date(e.startTime) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    filtered = filtered.filter((e) => new Date(e.endTime) <= end);
  }

  if (vendorId) {
    filtered = filtered.filter((e) => e.vendorId === vendorId);
  }

  // Sort by start time
  filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return NextResponse.json({
    success: true,
    data: filtered,
  });
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();

    // Check for conflicts
    const conflicts = detectConflicts(
      new Date(body.startTime),
      new Date(body.endTime),
      scheduleEvents,
      body.vendorId
    );

    if (conflicts.hasConflict) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scheduling conflict detected',
          conflicts: conflicts.conflictingEvents,
        },
        { status: 409 }
      );
    }

    // Create new event
    const newEvent: ScheduleEvent = {
      id: `e${Date.now()}`,
      title: body.title,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      serviceType: body.serviceType as ServiceType,
      vendorId: body.vendorId,
      vendorName: vendors.find((v) => v.id === body.vendorId)?.name || 'Unknown',
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      status: (body.status as AppointmentStatus) || 'scheduled',
      reminderSettings: body.reminderSettings,
      notes: body.notes,
    };

    scheduleEvents.push(newEvent);

    return NextResponse.json({
      success: true,
      data: newEvent,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();
    const { eventId, ...updates } = body;

    const index = scheduleEvents.findIndex((e) => e.id === eventId);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check for conflicts if time is being updated
    if (updates.startTime || updates.endTime) {
      const newStart = updates.startTime
        ? new Date(updates.startTime)
        : new Date(scheduleEvents[index].startTime);
      const newEnd = updates.endTime
        ? new Date(updates.endTime)
        : new Date(scheduleEvents[index].endTime);

      // Exclude current event from conflict check
      const otherEvents = scheduleEvents.filter((e) => e.id !== eventId);
      const conflicts = detectConflicts(newStart, newEnd, otherEvents, updates.vendorId);

      if (conflicts.hasConflict) {
        return NextResponse.json(
          {
            success: false,
            error: 'Scheduling conflict detected',
            conflicts: conflicts.conflictingEvents,
          },
          { status: 409 }
        );
      }
    }

    // Update event
    const updatedEvent: ScheduleEvent = {
      ...scheduleEvents[index],
      ...updates,
      startTime: updates.startTime
        ? new Date(updates.startTime)
        : scheduleEvents[index].startTime,
      endTime: updates.endTime
        ? new Date(updates.endTime)
        : scheduleEvents[index].endTime,
      vendorName: updates.vendorId
        ? vendors.find((v) => v.id === updates.vendorId)?.name || 'Unknown'
        : scheduleEvents[index].vendorName,
    };

    scheduleEvents[index] = updatedEvent;

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID required' },
      { status: 400 }
    );
  }

  const index = scheduleEvents.findIndex((e) => e.id === eventId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  scheduleEvents.splice(index, 1);

  return NextResponse.json({
    success: true,
    message: 'Event deleted',
  });
}

// Vendor availability management
export async function PATCH(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();
    const { action, vendorId, availability } = body;

    if (action === 'updateAvailability') {
      // Remove existing availability for vendor
      vendorAvailability = vendorAvailability.filter(
        (a) => a.vendorId !== vendorId
      );

      // Add new availability
      if (availability && Array.isArray(availability)) {
        vendorAvailability.push(...availability);
      }

      return NextResponse.json({
        success: true,
        message: 'Availability updated',
        data: vendorAvailability.filter((a) => a.vendorId === vendorId),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
