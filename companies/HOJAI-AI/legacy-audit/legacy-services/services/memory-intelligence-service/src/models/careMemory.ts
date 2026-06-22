// Care Memory Types

export interface CareVisit {
  id: string;
  profileId: string;
  visitId?: string;

  // Visit details
  date: Date;
  type: 'consultation' | 'follow_up' | 'emergency' | 'teleconsult' | 'home_visit';
  provider: {
    id: string;
    name: string;
    specialty?: string;
    hospital?: string;
  };

  // Content
  summary?: string;
  transcript?: string;
  keyPoints: string[];

  // Extracted data
  diagnoses: CareDiagnosis[];
  medications: CareMedication[];
  instructions: string[];
  followUps: CareFollowUp[];
  questionsForNextVisit: string[];

  // Flags
  redFlags: string[];
  sentiment: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: 'voice_recording' | 'manual_entry' | 'teleconsult' | 'import';
}

export interface CareDiagnosis {
  condition: string;
  icdCode?: string;
  status: 'active' | 'resolved' | 'chronic' | 'suspected';
  diagnosedDate?: Date;
  notes?: string;
}

export interface CareMedication {
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration?: string;
  instructions?: string;
  status: 'active' | 'stopped' | 'completed';
  startDate?: Date;
  endDate?: Date;
  prescribedBy?: string;
}

export interface CareFollowUp {
  id: string;
  type: 'appointment' | 'test' | 'procedure' | 'review' | 'referral';
  description: string;
  urgency: 'routine' | 'soon' | 'urgent';
  dueDate?: Date;
  completed: boolean;
  completedDate?: Date;
}

export interface CareTimeline {
  profileId: string;
  events: TimelineEvent[];
  lastUpdated: Date;
}

export interface TimelineEvent {
  id: string;
  date: Date;
  type: 'visit' | 'diagnosis' | 'medication' | 'test' | 'procedure' | 'symptom' | 'milestone';
  category: string;
  title: string;
  description?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: Record<string, any>;
  sentiment?: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActionItem {
  id: string;
  profileId: string;
  visitId?: string;

  type: 'medication' | 'appointment' | 'test' | 'procedure' | 'referral' | 'lifestyle' | 'other';
  title: string;
  description?: string;

  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  completedDate?: Date;

  priority: 'low' | 'medium' | 'high';
  reminders: Reminder[];

  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  channel?: 'whatsapp' | 'sms' | 'push' | 'email';
}
