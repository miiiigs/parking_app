alter table locations
add column if not exists pricing_mode text not null default 'fixed_rate'
  check (pricing_mode in ('flat_rate', 'fixed_rate', 'tiered'));

alter table locations
add column if not exists flat_rate_amount numeric(10,2) not null default 50;

alter table locations
add column if not exists fixed_hourly_rate numeric(10,2) not null default 50;

alter table locations
add column if not exists first_period_hours integer not null default 3
  check (first_period_hours >= 1);

alter table locations
add column if not exists first_period_rate numeric(10,2) not null default 50;

alter table locations
add column if not exists succeeding_hourly_rate numeric(10,2) not null default 20;

alter table locations
add column if not exists entry_grace_minutes integer not null default 15
  check (entry_grace_minutes >= 0 and entry_grace_minutes <= 120);

alter table locations
add column if not exists exit_grace_minutes integer not null default 15
  check (exit_grace_minutes >= 0 and exit_grace_minutes <= 120);

alter table reservations
add column if not exists pricing_config jsonb not null default '{}'::jsonb;

update reservations
set pricing_config = jsonb_build_object(
  'mode', 'fixed_rate',
  'flatRateAmount', coalesce(parking_rate, 50),
  'fixedHourlyRate', coalesce(parking_rate, 50),
  'firstPeriodHours', 3,
  'firstPeriodRate', coalesce(parking_rate, 50),
  'succeedingHourlyRate', 20,
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
  v_fixed_hourly_rate numeric(10,2) := greatest(0, coalesce((v_config->>'fixedHourlyRate')::numeric, 50));
  v_first_period_hours integer := greatest(1, coalesce((v_config->>'firstPeriodHours')::integer, 3));
  v_first_period_rate numeric(10,2) := greatest(0, coalesce((v_config->>'firstPeriodRate')::numeric, 50));
  v_succeeding_hourly_rate numeric(10,2) := greatest(0, coalesce((v_config->>'succeedingHourlyRate')::numeric, 20));
  v_entry_grace_minutes integer := greatest(0, coalesce((v_config->>'entryGraceMinutes')::integer, 15));
  v_elapsed_minutes integer := greatest(0, coalesce(p_elapsed_minutes, 0));
  v_billable_minutes integer := greatest(0, v_elapsed_minutes - v_entry_grace_minutes);
  v_extra_minutes integer;
  v_extra_hours integer;
  v_amount numeric(10,2);
begin
  if v_mode = 'flat_rate' then
    return round(v_flat_rate, 2);
  end if;

  if v_mode = 'tiered' then
    v_extra_minutes := greatest(0, v_billable_minutes - (v_first_period_hours * 60));
    v_extra_hours := case when v_extra_minutes > 0 then ceil(v_extra_minutes / 60.0)::integer else 0 end;
    v_amount := v_first_period_rate + (v_extra_hours * v_succeeding_hourly_rate);
    return round(v_amount, 2);
  end if;

  v_amount := greatest(1, ceil(greatest(1, v_billable_minutes) / 60.0)::integer) * v_fixed_hourly_rate;
  return round(v_amount, 2);
end;
$$;
