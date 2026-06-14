alter table reservations
add column if not exists parking_rate numeric(10,2) not null default 50;

create or replace function calculate_parking_fee(
  p_elapsed_minutes integer,
  p_parking_rate numeric
)
returns numeric(10,2)
language plpgsql
immutable
as $$
declare
  v_rate numeric(10,2) := coalesce(p_parking_rate, 50);
  v_elapsed_minutes integer := greatest(0, coalesce(p_elapsed_minutes, 0));
begin
  return round(greatest((v_elapsed_minutes / 60.0) * v_rate, v_rate * 0.25)::numeric, 2);
end;
$$;
