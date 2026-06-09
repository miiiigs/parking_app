import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// @ts-expect-error JS helper used for Node test coverage and shared runtime logic.
import { buildReservationFollowUpNotificationPlan } from './notificationScheduling';

const PARKING_NOTIFICATION_CHANNEL_ID = 'parking-reminders';

function isRunningInExpoGo() {
  return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
  }),
});

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(PARKING_NOTIFICATION_CHANNEL_ID, {
    name: 'Parking reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3dd6a5',
  });
}

export async function ensureParkingNotificationsEnabled() {
  if (isRunningInExpoGo()) {
    return false;
  }

  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.status !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();

    if (requestedPermissions.status !== 'granted') {
      return false;
    }
  }

  await ensureNotificationChannel();
  return true;
}

export async function getParkingNotificationReadiness() {
  if (isRunningInExpoGo()) {
    return {
      status: 'expo-go' as const,
      label: 'Expo Go',
      message: 'Notifications are unavailable in Expo Go. Use a development build to receive reminders.',
    };
  }

  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.status === 'granted') {
    return {
      status: 'ready' as const,
      label: 'Reminders enabled',
      message: 'Parking reminders are enabled on this device.',
    };
  }

  if (currentPermissions.status === 'denied') {
    return {
      status: 'blocked' as const,
      label: 'Notifications blocked',
      message: 'Notification access is blocked. Open device settings to allow parking reminders.',
    };
  }

  return {
    status: 'needs-permission' as const,
    label: 'Reminders not enabled',
    message: 'Tap Enable reminders to request notification access for reservation updates.',
  };
}

function buildBaseContent(title: string, body: string) {
  return {
    title,
    body,
    sound: 'default',
    channelId: Platform.OS === 'android' ? PARKING_NOTIFICATION_CHANNEL_ID : undefined,
  };
}

function asTriggerDate(dateValue: string | Date | number): Notifications.DateTriggerInput | null {
  const triggerDate = typeof dateValue === 'number' ? new Date(dateValue) : typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return triggerDate.getTime() > Date.now() + 5000
    ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate }
    : null;
}

function getScheduledNotificationData(notification: any) {
  return notification?.content?.data ?? null;
}

function notificationMatchesReservation(notification: any, reservationId: string, notificationTypes?: string[]) {
  const data = getScheduledNotificationData(notification);

  if (!data || data.reservationId !== reservationId) {
    return false;
  }

  if (!notificationTypes || notificationTypes.length === 0) {
    return true;
  }

  return notificationTypes.includes(data.type);
}

export async function getScheduledReservationNotificationIds(
  reservationId: string,
  notificationTypes?: string[],
) {
  if (!reservationId) {
    return [] as string[];
  }

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  return scheduledNotifications
    .filter((notification) => notificationMatchesReservation(notification, reservationId, notificationTypes))
    .map((notification) => notification.identifier)
    .filter(Boolean);
}

export async function hasScheduledReservationNotifications(
  reservationId: string,
  notificationTypes?: string[],
) {
  const scheduledNotificationIds = await getScheduledReservationNotificationIds(reservationId, notificationTypes);
  return scheduledNotificationIds.length > 0;
}

export async function cancelReservationNotifications(
  reservationId: string,
  notificationIds: string[] = [],
  notificationTypes?: string[],
) {
  const scheduledNotificationIds = await getScheduledReservationNotificationIds(reservationId, notificationTypes);
  const uniqueNotificationIds = [...new Set([...notificationIds, ...scheduledNotificationIds])].filter(Boolean);

  await Promise.all(
    uniqueNotificationIds.map(async (notificationId) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        // Ignore cleanup errors. The backend workflow remains authoritative.
      }
    }),
  );
}

export async function scheduleReservationConfirmationNotification(params: {
  reservationId: string;
  slotLabel: string;
  expiresAt: string;
}) {
  if (isRunningInExpoGo()) {
    return [] as string[];
  }

  const notificationsEnabled = await ensureParkingNotificationsEnabled();

  if (!notificationsEnabled) {
    return [] as string[];
  }

  const confirmationId = await Notifications.scheduleNotificationAsync({
    content: {
      ...buildBaseContent('Parking slot reserved', `${params.slotLabel} is confirmed. The booking is active now.`),
      data: {
        reservationId: params.reservationId,
        type: 'reservation-confirmed',
      },
    },
    trigger: null,
  });

  return [confirmationId];
}

export async function scheduleReservationFollowUpNotifications(params: {
  reservationId: string;
  slotLabel: string;
  expiresAt: string;
}) {
  if (isRunningInExpoGo()) {
    return [] as string[];
  }

  const notificationsEnabled = await ensureParkingNotificationsEnabled();

  if (!notificationsEnabled) {
    return [] as string[];
  }

  const scheduledNotificationIds: string[] = [];
  const notificationPlan = buildReservationFollowUpNotificationPlan(params);

  for (const notification of notificationPlan) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        ...buildBaseContent(notification.title, notification.body),
        data: {
          reservationId: params.reservationId,
          type: notification.type,
        },
      },
      trigger: asTriggerDate(notification.triggerAt),
    });

    scheduledNotificationIds.push(notificationId);
  }

  return scheduledNotificationIds;
}

export async function scheduleReservationReminderNotifications(params: {
  reservationId: string;
  slotLabel: string;
  expiresAt: string;
}) {
  return scheduleReservationFollowUpNotifications(params);
}

export async function sendSessionCompletedNotification(params: {
  slotLabel: string;
  billedAmount: number | null;
}) {
  if (isRunningInExpoGo()) {
    return null;
  }

  const notificationsEnabled = await ensureParkingNotificationsEnabled();

  if (!notificationsEnabled) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      ...buildBaseContent(
        'Parking session completed',
        params.billedAmount !== null
          ? `${params.slotLabel} has been released. Payment recorded: PHP ${params.billedAmount.toFixed(2)}.`
          : `${params.slotLabel} has been released and payment was recorded.`,
      ),
      data: {
        slotLabel: params.slotLabel,
        type: 'session-completed',
      },
    },
    trigger: null,
  });
}

export async function cancelScheduledNotifications(notificationIds: string[]) {
  await Promise.all(
    notificationIds.map(async (notificationId) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        // Ignore cleanup errors. The backend workflow remains authoritative.
      }
    }),
  );
}
