/**
 * Household Types — Spec Part 9: HouseholdOS
 */

export interface HouseholdMember {
  id: string;
  userId: string;
  name: string;
  relationship: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  birthdate?: Date;
  allergies?: string[];
  medications?: string[];
}

export interface GroceryItem {
  id: string;
  householdId: string;
  item: string;
  quantity?: number;
  unit?: string;
  addedBy: string;
  addedAt: Date;
  purchased: boolean;
  purchasedAt?: Date;
  category?: 'produce' | 'dairy' | 'meat' | 'pantry' | 'frozen' | 'other';
}

export interface Bill {
  id: string;
  householdId: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: 'utility' | 'rent' | 'internet' | 'insurance' | 'subscription' | 'other';
  recurring: boolean;
  paid: boolean;
  paidAt?: Date;
  autopay?: boolean;
}

export interface Medicine {
  id: string;
  householdId: string;
  memberId: string;
  memberName: string;
  name: string;
  dosage: string;
  frequency: string;        // "twice daily", "as needed"
  remaining: number;        // pills/doses
  expiresAt?: Date;
  prescribedBy?: string;
  notes?: string;
}

export interface HouseholdTask {
  id: string;
  householdId: string;
  title: string;
  assignee?: string;
  dueDate?: Date;
  category: 'cleaning' | 'maintenance' | 'shopping' | 'childcare' | 'other';
  recurring?: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  completedAt?: Date;
}