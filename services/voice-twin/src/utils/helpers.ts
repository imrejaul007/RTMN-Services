import { v4 as uuidv4 } from 'uuid';

// Generate unique call ID
export function generateCallId(): string {
  return `VC-${uuidv4().substring(0, 8).toUpperCase()}`;
}

// Generate recording ID
export function generateRecordingId(): string {
  return `REC-${uuidv4().substring(0, 8).toUpperCase()}`;
}

// Format phone number
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Add country code if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return phone.startsWith('+') ? phone : `+${digits}`;
}

// Format duration (seconds to mm:ss or hh:mm:ss)
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Format date for display
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format date and time
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calculate call cost (example rate: $0.01 per second)
export function calculateCallCost(durationSeconds: number, ratePerSecond: number = 0.01): number {
  return Math.round(durationSeconds * ratePerSecond * 100) / 100;
}

// Truncate text
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Extract key information from transcript
export function extractPhoneNumbers(text: string): string[] {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  return text.match(phoneRegex) || [];
}

// Extract email addresses from text
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

// Determine if text is positive
export function isPositiveText(text: string): boolean {
  const positiveWords = ['thank', 'great', 'excellent', 'good', 'love', 'happy', 'best'];
  const lower = text.toLowerCase();
  return positiveWords.some(word => lower.includes(word));
}

// Get average from array
export function getAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// Get percentage
export function getPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(2) + '%';
}

export default {
  generateCallId,
  generateRecordingId,
  formatPhoneNumber,
  formatDuration,
  formatDate,
  formatDateTime,
  calculateCallCost,
  truncate,
  extractPhoneNumbers,
  extractEmails,
  isPositiveText,
  getAverage,
  getPercentage
};
