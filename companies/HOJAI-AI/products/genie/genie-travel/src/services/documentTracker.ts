/**
 * Document Tracker — Track travel documents
 * Spec Part 29: TravelOS
 */

import axios from 'axios';
import { DocumentCheckResult, TravelDocument } from '../types/travel.js';

const GENIE_TWINOS_URL = process.env.GENIE_TWINOS_URL || 'http://localhost:4705';

export async function checkDocuments(
  userId: string,
  destination: string,
  departureDate: Date
): Promise<DocumentCheckResult> {
  const docs = await fetchDocuments(userId);

  const result: DocumentCheckResult = {
    ready: true,
    missing: [],
    expiring: [],
    recommendations: [],
  };

  // Check passport
  const passport = docs.find(d => d.type === 'passport');
  if (!passport) {
    result.missing.push('Passport');
    result.ready = false;
  } else if (passport.expiresAt) {
    const monthsUntilExpiry = (new Date(passport.expiresAt).getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsUntilExpiry < 6) {
      result.expiring.push(`Passport (${Math.round(monthsUntilExpiry)} months)`);
      result.recommendations.push('Renew passport — many countries require 6 months validity');
    }
  }

  // Check visa
  const visa = docs.find(d => d.type === 'visa');
  const needsVisa = await checkVisaRequirement(destination, passport?.expiresAt);
  if (needsVisa && !visa) {
    result.missing.push(`Visa for ${destination}`);
    result.ready = false;
  }

  // Check insurance
  const insurance = docs.find(d => d.type === 'insurance');
  if (!insurance) {
    result.recommendations.push('Consider travel insurance');
  }

  // Check tickets
  const tickets = docs.find(d => d.type === 'ticket');
  if (!tickets) {
    result.missing.push('Flight tickets');
    result.ready = false;
  }

  // Generate recommendations
  if (result.ready && result.missing.length === 0) {
    result.recommendations.push('All required documents in order');
  }

  return result;
}

async function fetchDocuments(userId: string): Promise<TravelDocument[]> {
  try {
    const response = await axios.get(
      `${GENIE_TWINOS_URL}/api/documents/${userId}`,
      { timeout: 5000 }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}

async function checkVisaRequirement(
  destination: string,
  passportExpiry?: Date
): Promise<boolean> {
  // Simplified visa check
  // In production, use a visa database API
  const visaRequired = ['US', 'UK', 'Schengen', 'China', 'India'];
  return visaRequired.some(c => destination.includes(c));
}