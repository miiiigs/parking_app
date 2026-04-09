import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PARKING_NOTIFICATION_CHANNEL_ID = 'parking-reminders';
const EXPIRY_REMINDER_OFFSET_MINUTES = 5;

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

function buildBaseContent(title: string, body: string) {
  return {
    title,
    body,
    sound: 'default',
    channelId: Platform.OS === 'android' ? PARKING_NOTIFICATION_CHANNEL_ID : undefined,
  };
}

function asTriggerDate(dateValue: string | Date) {
  const triggerDate = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return triggerDate.getTime() > Date.now() + 5000 ? triggerDate : null;
}

export async function scheduleReservationReminderNotifications(params: {
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
  const reservationExpiresAt = new Date(params.expiresAt);

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
  scheduledNotificationIds.push(confirmationId);

  const reminderTrigger = new Date(reservationExpiresAt.getTime() - EXPIRY_REMINDER_OFFSET_MINUTES * 60 * 1000);

  if (reminderTrigger.getTime() > Date.now() + 5000) {
    const reminderId = await Notifications.scheduleNotificationAsync({
      content: {
        ...buildBaseContent('Reservation expiring soon', `${params.slotLabel} expires in ${EXPIRY_REMINDER_OFFSET_MINUTES} minutes.`),
        data: {
          reservationId: params.reservationId,
          type: 'reservation-expiry-reminder',
        },
      },
      trigger: asTriggerDate(reminderTrigger),
    });

    scheduledNotificationIds.push(reminderId);
  }

  if (reservationExpiresAt.getTime() > Date.now() + 5000) {
    const expiryId = await Notifications.scheduleNotificationAsync({
      content: {
        ...buildBaseContent('Reservation expired', `${params.slotLabel} is now past the arrival window.`),
        data: {
          reservationId: params.reservationId,
          type: 'reservation-expired',
        },
      },
      trigger: asTriggerDate(reservationExpiresAt),
    });

    scheduledNotificationIds.push(expiryId);
  }

  return scheduledNotificationIds;
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