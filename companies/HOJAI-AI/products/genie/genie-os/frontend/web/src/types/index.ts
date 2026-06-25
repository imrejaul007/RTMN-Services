// Shared TypeScript types for Genie web app

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  message?: string;
}

// === Memory ===

export interface Memory {
  id: string;
  type: 'note' | 'photo' | 'voice' | 'event' | 'person' | 'place' | 'idea';
  title?: string;
  content: string;
  tags?: string[];
  createdAt: string;
  importance?: number;
  source?: string;
}

export interface MemoryGraph {
  identity: { name: string; userId: string };
  knowledgeCount: number;
  relationshipsCount: number;
  activeGoals: number;
}

// === Briefing ===

export interface Briefing {
  greeting: string;
  date: string;
  weather?: { temp: number; condition: string; city: string };
  activeGoals: number;
  recentMemories: Memory[];
  insights: string[];
  tasks?: Array<{ id: string; title: string; due?: string }>;
  calendarToday?: Array<{ id: string; title: string; time: string }>;
}

// === Calendar ===

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
  attendees?: string[];
  category?: string;
}

// === Money ===

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'daily' | 'weekly' | 'monthly';
}

// === Wellness ===

export interface MoodEntry {
  id: string;
  score: number; // 1-10
  note?: string;
  tags?: string[];
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  hours: number;
  quality: number; // 1-5
  date: string;
}

// === Relationships ===

export interface Contact {
  id: string;
  name: string;
  relationship: string; // friend, family, colleague, etc.
  lastContact?: string;
  intimacy?: number; // 0-100
  notes?: string;
  avatar?: string;
}

// === Search ===

export interface SearchResult {
  source: string; // specialist name
  type: string;
  title: string;
  snippet?: string;
  url?: string;
  score: number;
  data?: any;
}

// === Chat ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'genie' | 'system';
  content: string;
  timestamp: string;
  attachments?: Array<{ type: string; url: string }>;
}

// === Notifications ===

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'briefing' | 'memory' | 'reminder' | 'social' | 'system';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// === Onboarding ===

export type OnboardingStep =
  | 'welcome'
  | 'name'
  | 'goals'
  | 'integrations'
  | 'permissions'
  | 'done';

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  name?: string;
  goals?: string[];
  integrations?: string[];
}

// === Spiritual OS ===

export interface Prayer {
  id: string;
  text: string;
  category: string;
  tags?: string[];
  answered: boolean;
  answeredAt?: string | null;
  createdAt: string;
}

export interface GratitudeEntry {
  id: string;
  items: string[];
  mood: string;
  note?: string | null;
  date: string;
  createdAt: string;
}

export interface Reflection {
  id: string;
  title: string;
  body: string;
  mood?: string;
  themes?: string[];
  wordCount?: number;
  createdAt: string;
}

export interface MeditationSession {
  id: string;
  type: string;
  minutes: number;
  focus?: string | null;
  note?: string | null;
  completedAt: string;
}

// === Life Replay ===

export interface ReplayStats {
  memories: number;
  moods?: number;
  moodAvg?: number | null;
  prayers?: number;
  prayersAnswered?: number;
  gratitudes?: number;
  gratitudeItems?: number;
  meditations?: number;
  meditationMinutes?: number;
  sleepAvg?: number;
}

export interface Replay {
  id: string;
  userId: string;
  period: 'monthly' | 'yearly' | 'life';
  periodStart: string;
  periodEnd: string;
  title: string;
  summary: string;
  highlights: string[];
  themes: string[];
  stats: ReplayStats;
  aiUsed?: boolean;
  createdAt: string;
}

export interface Highlight {
  type: string;
  icon: string;
  title: string;
  detail?: string;
  date?: string;
}

// === Personal Simulation (C1) ===

export interface SimulationTemplate {
  id: string;
  category: string;
  title: string;
  prompt: string;
  variables: string[];
  description: string;
}

export interface SimulationOutcomes {
  financial?: any;
  lifestyle?: any;
  career?: any;
  mental?: any;
  relationship?: any;
  risks?: string[];
  opportunities?: string[];
  recommendation?: string;
}

export interface Simulation {
  id: string;
  userId: string;
  title: string;
  scenario: string;
  variables: Record<string, string>;
  outcomes: SimulationOutcomes;
  pros: string[];
  cons: string[];
  recommendation: string;
  aiUsed: boolean;
  createdAt: string;
}

export interface SimulationComparisonMatrix {
  id: string;
  title: string;
  scores: {
    financial: number;
    lifestyle: number;
    career: number;
    risk: number;
    relationship: number;
  };
  winner: boolean;
}

export interface SimulationComparison {
  titles: string[];
  matrix: SimulationComparisonMatrix[];
  overallWinner: string | null;
}

// === Personal Digital Twin (C2) ===

export interface PersonalTwin {
  id: string;
  userId: string;
  name: string;
  pronouns?: string;
  age?: number;
  location?: string;
  occupation?: string;
  relationshipStatus?: string;
  householdSize?: number;
  headline?: string;
  bio?: string;
  mood?: { current?: string; trend?: string; score?: number };
  energy?: { current?: string; score?: number };
  focus?: string[];
  updatedAt?: string;
}

export interface PersonalTrait {
  id: string;
  userId: string;
  category: 'value' | 'skill' | 'interest' | 'goal' | 'fear';
  name: string;
  strength: number;
  examples?: string[];
  addedAt?: string;
}

export interface PersonalMoment {
  id: string;
  userId: string;
  type: 'milestone' | 'relationship' | 'learning' | 'loss' | 'win' | 'travel' | 'health' | 'career';
  title: string;
  date: string;
  description?: string;
  impact: 'low' | 'medium' | 'high' | 'transformative';
  createdAt?: string;
}

// === CalendarEvent (full type) ===

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  color?: string;
  hasConflicts?: boolean;
  conflicts?: any[];
}

// === Person (Relationships) ===

export interface Person {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  category: string;
  relationshipType: string;
  importance: number;
  birthday?: string;
  anniversary?: string;
  notes?: string;
  tags?: string[];
  photo?: string;
  lastContact?: string;
  totalInteractions: number;
  relationshipHealth: number;
  createdAt: string;
}

// === Learning (extended Course) ===

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lessons: number;
  category: string;
  skills: string[];
  rating: number;
  students: number;
  modules?: Array<{ title: string; lessons: number }>;
  enrolled?: boolean;
  enrollment?: {
    progress: number;
    completedLessons: string[];
    currentLesson: string | null;
    status: string;
  };
}

// === Finance ===

export interface Goal {
  id: string;
  userId: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
}