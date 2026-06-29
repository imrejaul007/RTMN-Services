/**
 * Prayer Tracker — Daily prayer times
 * Spec Part 30: SpiritualOS
 */

import { PrayerTime, PrayerTimesResponse } from '../types/spiritual.js';

// Simplified prayer time calculation
// In production, use Aladhan API or similar
const PRAYER_OFFSETS = {
  Fajr: -30,        // 30 min before sunrise
  Sunrise: 0,
  Dhuhr: 6,         // noon
  Asr: 9,           // afternoon
  Maghrib: 12,      // sunset
  Isha: 14,         // night
};

export async function getPrayerTimes(
  date: Date,
  location: { lat: number; lng: number },
  timezone: string = 'Asia/Kolkata'
): Promise<PrayerTimesResponse> {
  // Simplified calculation based on timezone and date
  // Production: Use Aladhan API (https://aladhan.com/prayer-times-api)
  const baseHour = 5; // Approximate sunrise for tropical locations
  const now = new Date();

  const prayers: PrayerTime[] = [
    { name: 'Fajr', time: `${(baseHour + PRAYER_OFFSETS.Fajr / 60).toFixed(2).replace('.', ':')}`, timezone, passed: false, upcoming: false },
    { name: 'Sunrise', time: `${baseHour.toString().padStart(2, '0')}:00`, timezone, passed: false, upcoming: false },
    { name: 'Dhuhr', time: '12:30', timezone, passed: false, upcoming: false },
    { name: 'Asr', time: '15:45', timezone, passed: false, upcoming: false },
    { name: 'Maghrib', time: '18:15', timezone, passed: false, upcoming: false },
    { name: 'Isha', time: '19:45', timezone, passed: false, upcoming: false },
  ];

  // Mark passed/upcoming
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const prayer of prayers) {
    const [h, m] = prayer.time.split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    prayer.passed = currentMinutes > prayerMinutes;
    prayer.upcoming = !prayer.passed && (prayerMinutes - currentMinutes) <= 60;
  }

  const nextPrayer = prayers.find(p => !p.passed);

  return {
    date: date.toISOString().split('T')[0],
    location: `${location.lat},${location.lng}`,
    timezone,
    prayers,
    nextPrayer,
    qiblaDirection: calculateQibla(location),
  };
}

function calculateQibla(location: { lat: number; lng: number }): number {
  // Kaaba coordinates: 21.4225° N, 39.8262° E
  const kaabaLat = 21.4225;
  const kaabaLng = 39.8262;

  const latRad = (location.lat * Math.PI) / 180;
  const lngRad = (location.lng * Math.PI) / 180;
  const kaabaLatRad = (kaabaLat * Math.PI) / 180;
  const kaabaLngRad = (kaabaLng * Math.PI) / 180;

  const dLng = kaabaLngRad - lngRad;

  const x = Math.sin(dLng) * Math.cos(kaabaLatRad);
  const y = Math.cos(latRad) * Math.sin(kaabaLatRad) - Math.sin(latRad) * Math.cos(kaabaLatRad) * Math.cos(dLng);

  let qibla = (Math.atan2(x, y) * 180) / Math.PI;
  qibla = (qibla + 360) % 360;

  return Math.round(qibla * 100) / 100;
}