/**
 * Household Manager — Family intelligence
 * Spec Part 9: HouseholdOS
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  HouseholdMember,
  GroceryItem,
  Bill,
  Medicine,
  HouseholdTask,
} from '../types/household.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const MEMBER_KEY = (householdId: string, id: string) => `household:${householdId}:member:${id}`;
const MEMBERS_KEY = (householdId: string) => `household:${householdId}:members`;
const GROCERY_KEY = (householdId: string) => `household:${householdId}:groceries`;
const BILL_KEY = (householdId: string) => `household:${householdId}:bills`;
const MEDICINE_KEY = (householdId: string) => `household:${householdId}:medicines`;
const TASK_KEY = (householdId: string) => `household:${householdId}:tasks`;

export const HouseholdManager = {
  // === Members ===
  async addMember(householdId: string, member: Omit<HouseholdMember, 'id'>): Promise<HouseholdMember> {
    const newMember: HouseholdMember = { ...member, id: `mem_${uuidv4()}` };
    await redis.set(MEMBER_KEY(householdId, newMember.id), JSON.stringify(newMember));
    await redis.sadd(MEMBERS_KEY(householdId), newMember.id);
    return newMember;
  },

  async getMembers(householdId: string): Promise<HouseholdMember[]> {
    const ids = await redis.smembers(MEMBERS_KEY(householdId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(MEMBER_KEY(householdId, id)));
    const results = await pipeline.exec();

    return results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];
  },

  // === Groceries ===
  async addGrocery(householdId: string, item: Omit<GroceryItem, 'id' | 'addedAt' | 'purchased'>): Promise<GroceryItem> {
    const newItem: GroceryItem = {
      ...item,
      id: `grc_${uuidv4()}`,
      addedAt: new Date(),
      purchased: false,
    };
    await redis.set(`grocery:${newItem.id}`, JSON.stringify({ ...newItem, householdId }));
    await redis.sadd(GROCERY_KEY(householdId), newItem.id);
    return newItem;
  },

  async getGroceries(householdId: string, includePurchased: boolean = false): Promise<GroceryItem[]> {
    const ids = await redis.smembers(GROCERY_KEY(householdId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`grocery:${id}`));
    const results = await pipeline.exec();

    let items = results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];

    if (!includePurchased) {
      items = items.filter(i => !i.purchased);
    }

    return items;
  },

  async markPurchased(householdId: string, itemId: string): Promise<void> {
    const data = await redis.get(`grocery:${itemId}`);
    if (!data) return;
    const item = JSON.parse(data);
    item.purchased = true;
    item.purchasedAt = new Date();
    await redis.set(`grocery:${itemId}`, JSON.stringify(item));
  },

  // === Bills ===
  async addBill(householdId: string, bill: Omit<Bill, 'id' | 'paid'>): Promise<Bill> {
    const newBill: Bill = { ...bill, id: `bil_${uuidv4()}`, paid: false };
    await redis.set(`bill:${newBill.id}`, JSON.stringify({ ...newBill, householdId }));
    await redis.sadd(BILL_KEY(householdId), newBill.id);
    return newBill;
  },

  async getBills(householdId: string, includePaid: boolean = false): Promise<Bill[]> {
    const ids = await redis.smembers(BILL_KEY(householdId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`bill:${id}`));
    const results = await pipeline.exec();

    let bills = results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];

    if (!includePaid) {
      bills = bills.filter(b => !b.paid);
    }

    // Sort by due date
    bills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return bills;
  },

  async getUpcomingBills(householdId: string, days: number = 30): Promise<Bill[]> {
    const bills = await this.getBills(householdId, false);
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return bills.filter(b => new Date(b.dueDate) <= cutoff);
  },

  // === Medicines ===
  async addMedicine(householdId: string, medicine: Omit<Medicine, 'id'>): Promise<Medicine> {
    const newMed: Medicine = { ...medicine, id: `med_${uuidv4()}` };
    await redis.set(`medicine:${newMed.id}`, JSON.stringify({ ...newMed, householdId }));
    await redis.sadd(MEDICINE_KEY(householdId), newMed.id);
    return newMed;
  },

  async getMedicines(householdId: string): Promise<Medicine[]> {
    const ids = await redis.smembers(MEDICINE_KEY(householdId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`medicine:${id}`));
    const results = await pipeline.exec();

    return results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];
  },

  async getExpiringMedicines(householdId: string, days: number = 7): Promise<Medicine[]> {
    const medicines = await this.getMedicines(householdId);
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return medicines.filter(m => {
      if (!m.expiresAt) return false;
      return new Date(m.expiresAt) <= cutoff;
    });
  },

  async getLowStockMedicines(householdId: string, threshold: number = 5): Promise<Medicine[]> {
    const medicines = await this.getMedicines(householdId);
    return medicines.filter(m => m.remaining <= threshold);
  },

  // === Tasks ===
  async addTask(householdId: string, task: Omit<HouseholdTask, 'id' | 'completed'>): Promise<HouseholdTask> {
    const newTask: HouseholdTask = { ...task, id: `tsk_${uuidv4()}`, completed: false };
    await redis.set(`task:${newTask.id}`, JSON.stringify({ ...newTask, householdId }));
    await redis.sadd(TASK_KEY(householdId), newTask.id);
    return newTask;
  },

  async getTasks(householdId: string, includeCompleted: boolean = false): Promise<HouseholdTask[]> {
    const ids = await redis.smembers(TASK_KEY(householdId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`task:${id}`));
    const results = await pipeline.exec();

    let tasks = results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];

    if (!includeCompleted) {
      tasks = tasks.filter(t => !t.completed);
    }
    return tasks;
  },

  async completeTask(householdId: string, taskId: string): Promise<void> {
    const data = await redis.get(`task:${taskId}`);
    if (!data) return;
    const task = JSON.parse(data);
    task.completed = true;
    task.completedAt = new Date();
    await redis.set(`task:${taskId}`, JSON.stringify(task));
  },
};