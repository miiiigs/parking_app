const EXPIRY_REMINDER_OFFSET_MINUTES = 5;
const MINIMUM_SCHEDULE_BUFFER_MS = 5000;

function buildReservationFollowUpNotificationPlan(params) {
  const reminderOffsetMinutes = params.reminderOffsetMinutes ?? EXPIRY_REMINDER_OFFSET_MINUTES;
  const now = params.now ?? Date.now();
  const reservationExpiresAt = new Date(params.expiresAt);
  const reminderTriggerAt = reservationExpiresAt.getTime() - reminderOffsetMinutes * 60 * 1000;
  const notificationPlan = [];

  if (reminderTriggerAt > now + MINIMUM_SCHEDULE_BUFFER_MS) {
    notificationPlan.push({
      type: 'reservation-expiry-reminder',
      title: 'Reservation expiring soon',
      body: `${params.slotLabel} expires in ${reminderOffsetMinutes} minutes.`,
      triggerAt: reminderTriggerAt,
    });
  }

  if (reservationExpiresAt.getTime() > now + MINIMUM_SCHEDULE_BUFFER_MS) {
    notificationPlan.push({
      type: 'reservation-expired',
      title: 'Reservation expired',
      body: `${params.slotLabel} is now past the arrival window.`,
      triggerAt: reservationExpiresAt.getTime(),
    });
  }

  return notificationPlan;
}

module.exports = {
  EXPIRY_REMINDER_OFFSET_MINUTES,
  MINIMUM_SCHEDULE_BUFFER_MS,
  buildReservationFollowUpNotificationPlan,
};