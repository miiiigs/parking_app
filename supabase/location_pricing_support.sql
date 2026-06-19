alter table locations
add column if not exists pricing_mode text not null default 'fixed_rate'
  check (pricing_mode in ('flat_rate', 'fixed_rate', 'tiered'));

alter table locations
add column if not exists flat_rate_amount numeric(10,2) not null default 50;

alter table locations
add column if not exists fixed_rate_amount numeric(10,2) not null default 50;

alter table locations
add column if not exists fixed_rate_interval_minutes integer not null default 60
  check (fixed_rate_interval_minutes >= 1 and fixed_rate_interval_minutes <= 1440);

alter table locations
add column if not exists first_period_minutes integer not null default 180
  check (first_period_minutes >= 1 and first_period_minutes <= 1440);

alter table locations
add column if not exists first_period_rate numeric(10,2) not null default 50;

alter table locations
add column if not exists succeeding_rate_amount numeric(10,2) not null default 20;

alter table locations
add column if not exists succeeding_rate_interval_minutes integer not null default 60
  check (succeeding_rate_interval_minutes >= 1 and succeeding_rate_interval_minutes <= 1440);

alter table locations
add column if not exists entry_grace_minutes integer not null default 15
  check (entry_grace_minutes >= 0 and entry_grace_minutes <= 120);

alter table locations
add column if not exists exit_grace_minutes integer not null default 15
  check (exit_grace_minutes >= 0 and exit_grace_minutes <= 120);

alter table locations
add column if not exists reservation_fee_30_minutes numeric(10,2) not null default 25;

alter table locations
add column if not exists reservation_fee_60_minutes numeric(10,2) not null default 40;

alter table locations
add column if not exists reservation_fee_120_minutes numeric(10,2) not null default 60;

alter table reservations
add column if not exists pricing_config jsonb not null default '{}'::jsonb;

update reservations
set pricing_config = jsonb_build_object(
  'mode', 'fixed_rate',
  'flatRateAmount', coalesce(parking_rate, 50),
  'fixedRateAmount', coalesce(parking_rate, 50),
  'fixedRateIntervalMinutes', 60,
  'firstPeriodMinutes', 180,
  'firstPeriodRate', coalesce(parking_rate, 50),
  'succeedingRateAmount', 20,
  'succeedingRateIntervalMinutes', 60,
  'entryGraceMinutes', 15,
  'exitGraceMinutes', 15
)
where pricing_config = '{}'::jsonb;

create or replace function calculate_parking_fee_from_config(
  p_elapsed_minutes integer,
  p_pricing_config jsonb
)
returns numeric(10,2)
language plpgsql
immutable
as $$
declare
  v_config jsonb := coalesce(p_pricing_config, '{}'::jsonb);
  v_mode text := coalesce(v_config->>'mode', 'fixed_rate');
  v_flat_rate numeric(10,2) := greatest(0, coalesce((v_config->>'flatRateAmount')::numeric, 50));
  v_fixed_rate_amount numeric(10,2) := greatest(0, coalesce((v_config->>'fixedRateAmount')::numeric, (v_config->>'fixedHourlyRate')::numeric, 50));
  v_fixed_rate_interval_minutes integer := greatest(1, coalesce((v_config->>'fixedRateIntervalMinutes')::integer, 60));
  v_first_period_minutes integer := greatest(1, coalesce((v_config->>'firstPeriodMinutes')::integer, ((v_config->>'firstPeriodHours')::integer * 60), 180));
  v_first_period_rate numeric(10,2) := greatest(0, coalesce((v_config->>'firstPeriodRate')::numeric, 50));
  v_succeeding_rate_amount numeric(10,2) := greatest(0, coalesce((v_config->>'succeedingRateAmount')::numeric, (v_config->>'succeedingHourlyRate')::numeric, 20));
  v_succeeding_rate_interval_minutes integer := greatest(1, coalesce((v_config->>'succeedingRateIntervalMinutes')::integer, 60));
  v_entry_grace_minutes integer := greatest(0, coalesce((v_config->>'entryGraceMinutes')::integer, 15));
  v_elapsed_minutes integer := greatest(0, coalesce(p_elapsed_minutes, 0));
  v_billable_minutes integer := greatest(0, v_elapsed_minutes - v_entry_grace_minutes);
  v_extra_minutes integer;
  v_extra_units integer;
  v_amount numeric(10,2);
begin
  if v_mode = 'flat_rate' then
    return round(v_flat_rate, 2);
  end if;

  if v_mode = 'tiered' then
    v_extra_minutes := greatest(0, v_billable_minutes - v_first_period_minutes);
    v_extra_units := case when v_extra_minutes > 0 then ceil(v_extra_minutes / v_succeeding_rate_interval_minutes::numeric)::integer else 0 end;
    v_amount := v_first_period_rate + (v_extra_units * v_succeeding_rate_amount);
    return round(v_amount, 2);
  end if;

  v_amount := greatest(1, ceil(greatest(1, v_billable_minutes) / v_fixed_rate_interval_minutes::numeric)::integer) * v_fixed_rate_amount;
  return round(v_amount, 2);
end;
$$;
