/**
 * Spiritual Types — Spec Part 30: SpiritualOS
 */

export interface PrayerTime {
  name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Tahajjud' | 'Sunrise';
  time: string;           // HH:MM
  timezone: string;
  passed: boolean;
  upcoming: boolean;
}

export interface PrayerTimesResponse {
  date: string;            // YYYY-MM-DD
  location: string;
  timezone: string;
  prayers: PrayerTime[];
  nextPrayer?: PrayerTime;
  qiblaDirection: number;  // degrees from north
}

export interface RamadanStatus {
  isRamadan: boolean;
  daysUntil: number;
  currentDay?: number;
  hijriDate?: string;
  schedule?: Array<{
    day: number;
    sehri: string;        // pre-dawn meal
    iftar: string;         // sunset breaking fast
  }>;
}

export interface CharityReminder {
  type: 'zakat' | 'sadaqah' | 'fitrah';
  amount?: number;
  currency?: string;
  description: string;
  dueDate?: Date;
  recurring?: boolean;
  completed: boolean;
}

export interface QuranProgress {
  userId: string;
  surah: number;
  ayah: number;
  totalSurahs: number;
  totalAyahs: number;
  percentComplete: number;
  lastRead?: Date;
  streak: number;
}

export interface SpiritualGoal {
  id: string;
  userId: string;
  type: 'prayer' | 'quran' | 'fasting' | 'dhikr' | 'charity';
  target: number;          // times per period
  period: 'daily' | 'weekly' | 'monthly';
  progress: number;
  startDate: Date;
}