/**
 * REZ Mind Integration Service - Auth Service
 * Sends auth events to Event Platform
 */

import axios from 'axios';
import { logger } from '../config/logger';

const REZ_MIND_URL = process.env.REZ_MIND_URL || 'http://localhost:4008';

interface AuthSignupEvent {
  user_id: string;
  method: 'email' | 'google' | 'phone' | 'apple';
}

interface AuthLoginEvent {
  user_id: string;
  method: 'email' | 'google' | 'phone' | 'apple';
  success: boolean;
}

interface AuthLogoutEvent {
  user_id: string;
}

export async function sendAuthSignupToRezMind(event: AuthSignupEvent): Promise<void> {
  try {
    await axios.post(`${REZ_MIND_URL}/webhook/auth/signup`, {
      user_id: event.user_id,
      method: event.method,
      source: 'auth_service',
    });
    logger.info('[REZ Mind] Auth signup event sent', { user_id: event.user_id });
  } catch (error) {
    const err = error as { message?: string };
    logger.warn('[REZ Mind] Failed to send auth signup', {
      user_id: event.user_id,
      error: err.message,
    });
  }
}

export async function sendAuthLoginToRezMind(event: AuthLoginEvent): Promise<void> {
  try {
    await axios.post(`${REZ_MIND_URL}/webhook/auth/login`, {
      user_id: event.user_id,
      method: event.method,
      success: event.success,
      source: 'auth_service',
    });
    logger.info('[REZ Mind] Auth login event sent', { user_id: event.user_id, success: event.success });
  } catch (error) {
    const err = error as { message?: string };
    logger.warn('[REZ Mind] Failed to send auth login', {
      user_id: event.user_id,
      error: err.message,
    });
  }
}

export async function sendAuthLogoutToRezMind(event: AuthLogoutEvent): Promise<void> {
  try {
    await axios.post(`${REZ_MIND_URL}/webhook/auth/logout`, {
      user_id: event.user_id,
      source: 'auth_service',
    });
    logger.info('[REZ Mind] Auth logout event sent', { user_id: event.user_id });
  } catch (error) {
    const err = error as { message?: string };
    logger.warn('[REZ Mind] Failed to send auth logout', {
      user_id: event.user_id,
      error: err.message,
    });
  }
}
