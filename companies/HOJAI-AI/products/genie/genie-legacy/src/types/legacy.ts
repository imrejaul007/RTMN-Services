/**
 * Legacy Types — Spec Part 35: Digital Legacy
 */

export interface LegacyEntry {
  id: string;
  userId: string;
  type: 'memory' | 'lesson' | 'story' | 'family_history' | 'value' | 'writing';
  title: string;
  content: string;
  date: Date;
  tags?: string[];
  visibility: 'private' | 'family' | 'public';
  recipients?: string[];
  preserveUntil?: Date;       // Optional expiry
}

export interface LifeChapter {
  id: string;
  userId: string;
  title: string;
  period: { from: Date; to: Date };
  summary: string;
  highlights: string[];
  lessons: string[];
  photos?: string[];          // URLs
  people?: string[];
  significance: number;       // 1-10
}

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  birthdate?: Date;
  stories?: string[];        // IDs of stories about them
  photos?: string[];
  notes?: string;
}

export interface LegacyStats {
  totalEntries: number;
  byType: Record<string, number>;
  chaptersCount: number;
  familyMembersCount: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  totalWords: number;
}