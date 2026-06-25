// Auth utilities for BAM

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('bam_user');
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bam_user', JSON.stringify(user));
  }
}

export function clearCurrentUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bam_user');
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
