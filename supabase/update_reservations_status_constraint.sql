alter table reservations
  drop constraint if exists reservations_status_check;

alter table reservations
  add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'completed', 'expired', 'cancelled', 'no_show'));