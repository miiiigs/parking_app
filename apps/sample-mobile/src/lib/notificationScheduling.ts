export type ReservationFollowUpNotification = {
  title: string;
  body: string;
  type: 'reservation-confirmed' | 'reservation-reminder' | 'reservation-expiring';
  triggerAt: string;
};

export function buildReservationFollowUpNotificationPlan(params: {
  reservationId: string;
  slotLabel: string;
  expiresAt: string;
}) {
  const expiryDate = new Date(params.expiresAt);
  const reminderDate = new Date(expiryDate.getTime() - 15 * 60 * 1000);

  const notifications: ReservationFollowUpNotification[] = [];

  if (!Number.isNaN(reminderDate.getTime()) && reminderDate.getTime() > Date.now()) {
    notifications.push({
      title: 'Reservation reminder',
      body: `${params.slotLabel} expires soon. Please arrive before the window closes.`,
      type: 'reservation-reminder',
      triggerAt: reminderDate.toISOString(),
    });
  }

  if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() > Date.now()) {
    notifications.push({
      title: 'Reservation expiring',
      body: `${params.slotLabel} is about to expire.`,
      type: 'reservation-expiring',
      triggerAt: expiryDate.toISOString(),
    });
  }

  return notifications;
}
