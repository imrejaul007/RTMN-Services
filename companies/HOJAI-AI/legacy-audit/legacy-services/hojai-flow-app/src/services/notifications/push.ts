/**
 * Push Notifications - Expo Notifications
 *
 * Features:
 * - Action reminders
 * - Approval requests
 * - Meeting notifications
 * - Smart suggestions
 */

import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-push-notification-async';
import Constants from 'expo-constants';

// ============================================================================
// CONFIG
// ============================================================================

// Handle notification received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================================
// PERMISSIONS
// ============================================================================

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission denied');
    return false;
  }

  // Get push token
  if (Constants.isDevice) {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    console.log('[Notifications] Token:', token);
  }

  return true;
}

// ============================================================================
// SCHEDULE
// ============================================================================

/**
 * Schedule approval reminder
 */
export async function scheduleApprovalReminder(
  actionId: string,
  title: string,
  delayMs: number = 15 * 60 * 1000 // 15 min default
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Approval Needed',
      body: title,
      data: { actionId, type: 'approval' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delayMs / 1000,
    },
  });
}

/**
 * Schedule meeting reminder
 */
export async function scheduleMeetingReminder(
  meetingId: string,
  title: string,
  scheduledFor: Date
) {
  const reminderTime = new Date(scheduledFor.getTime() - 10 * 60 * 1000); // 10 min before

  if (reminderTime > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Meeting in 10 minutes',
        body: title,
        data: { meetingId, type: 'meeting' },
        sound: true,
      },
      trigger: {
        date: reminderTime,
      },
    });
  }
}

/**
 * Schedule follow-up reminder
 */
export async function scheduleFollowUpReminder(
  contactId: string,
  contactName: string,
  delayDays: number = 3
) {
  const reminderTime = new Date();
  reminderTime.setDate(reminderTime.getDate() + delayDays);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Follow up with ' + contactName,
      body: 'Time to check in!',
      data: { contactId, type: 'follow_up' },
      sound: true,
    },
    trigger: {
      date: reminderTime,
    },
  });
}

// ============================================================================
// SEND
// ============================================================================

/**
 * Send local notification
 */
export async function sendNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Send action notification
 */
export async function sendActionNotification(
  actionTitle: string,
  actionType: string,
  priority: 'low' | 'medium' | 'high'
) {
  const sounds = {
    low: false,
    medium: true,
    high: true,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Action',
      body: actionTitle,
      data: { type: actionType },
      sound: sounds[priority],
      badge: priority === 'high' ? 1 : 0,
    },
    trigger: null,
  });
}

// ============================================================================
// CANCEL
// ============================================================================

/**
 * Cancel all scheduled notifications
 */
export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel specific notification
 */
export async function cancel(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// ============================================================================
// LISTENERS
// ============================================================================

/**
 * Add notification received listener
 */
export function onReceived(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener
 */
export function onResponse(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ============================================================================
// BADGE
// ============================================================================

/**
 * Set badge count
 */
export async function setBadge(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get badge count
 */
export async function getBadge(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export default {
  requestPermissions,
  scheduleApprovalReminder,
  scheduleMeetingReminder,
  scheduleFollowUpReminder,
  sendNotification,
  sendActionNotification,
  cancelAll,
  cancel,
  onReceived,
  onResponse,
  setBadge,
  getBadge,
};
