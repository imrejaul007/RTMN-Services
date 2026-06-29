/**
 * Packing Advisor — Generate packing list
 * Spec Part 29: TravelOS
 */

import { v4 as uuidv4 } from 'uuid';
import { PackingItem, PackingListRequest, PackingListResponse } from '../types/travel.js';

export function generatePackingList(req: PackingListRequest): PackingListResponse {
  const items: PackingItem[] = [];

  // Clothing
  items.push(...generateClothing(req.durationDays, req.season));

  // Electronics
  items.push(...generateElectronics());

  // Toiletries
  items.push(...generateToiletries());

  // Documents
  items.push(...generateDocuments());

  // Medication (basic)
  items.push(
    { category: 'medication', item: 'Personal medications', packed: false },
    { category: 'medication', item: 'Pain reliever', packed: false },
  );

  return {
    tripId: req.tripId,
    items,
    generatedAt: new Date(),
  };
}

function generateClothing(days: number, season?: string): PackingItem[] {
  const items: PackingItem[] = [
    { category: 'clothing', item: 'Underwear', quantity: days + 2, packed: false },
    { category: 'clothing', item: 'Socks', quantity: days + 2, packed: false },
    { category: 'clothing', item: 'T-shirts', quantity: Math.ceil(days / 2), packed: false },
    { category: 'clothing', item: 'Pants', quantity: Math.ceil(days / 3), packed: false },
  ];

  if (days > 3) {
    items.push({ category: 'clothing', item: 'Jacket', packed: false });
  }

  if (season === 'winter' || season === 'fall') {
    items.push(
      { category: 'clothing', item: 'Warm jacket', packed: false },
      { category: 'clothing', item: 'Scarf', packed: false },
    );
  }

  if (season === 'summer') {
    items.push(
      { category: 'clothing', item: 'Sunglasses', packed: false },
      { category: 'clothing', item: 'Sunscreen', packed: false },
      { category: 'clothing', item: 'Hat', packed: false },
    );
  }

  if (days > 5) {
    items.push(
      { category: 'clothing', item: 'Formal outfit', packed: false },
      { category: 'clothing', item: 'Exercise clothes', packed: false },
    );
  }

  return items;
}

function generateElectronics(): PackingItem[] {
  return [
    { category: 'electronics', item: 'Phone charger', packed: false },
    { category: 'electronics', item: 'Laptop charger', packed: false },
    { category: 'electronics', item: 'Power adapter', packed: false },
    { category: 'electronics', item: 'Headphones', packed: false },
    { category: 'electronics', item: 'Portable charger', packed: false },
  ];
}

function generateToiletries(): PackingItem[] {
  return [
    { category: 'toiletries', item: 'Toothbrush & toothpaste', packed: false },
    { category: 'toiletries', item: 'Shampoo', packed: false },
    { category: 'toiletries', item: 'Body wash', packed: false },
    { category: 'toiletries', item: 'Deodorant', packed: false },
    { category: 'toiletries', item: 'Razor', packed: false },
    { category: 'toiletries', item: 'Skincare', packed: false },
  ];
}

function generateDocuments(): PackingItem[] {
  return [
    { category: 'documents', item: 'Passport / ID', packed: false },
    { category: 'documents', item: 'Tickets (printed + digital)', packed: false },
    { category: 'documents', item: 'Hotel reservation', packed: false },
    { category: 'documents', item: 'Travel insurance', packed: false },
    { category: 'documents', item: 'Credit cards', packed: false },
  ];
}