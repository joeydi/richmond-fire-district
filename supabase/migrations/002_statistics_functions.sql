-- Statistics Functions for Dashboard
-- Run this in Supabase SQL Editor

-- Get daily water usage for a date range
create or replace function get_daily_usage(start_date date, end_date date)
returns table (
  date date,
  total_usage numeric,
  reading_count bigint
) as $$
  select
    date_trunc('day', recorded_at)::date as date,
    sum(reading_value) as total_usage,
    count(*) as reading_count
  from water_production_readings
  where recorded_at >= start_date
    and recorded_at < end_date + interval '1 day'
  group by date_trunc('day', recorded_at)::date
  order by date;
$$ language sql security definer;

-- Get monthly water usage for a year
create or replace function get_monthly_usage(year_param integer)
returns table (
  month integer,
  month_name text,
  total_usage numeric,
  reading_count bigint
) as $$
  select
    extract(month from recorded_at)::integer as month,
    to_char(recorded_at, 'Mon') as month_name,
    sum(reading_value) as total_usage,
    count(*) as reading_count
  from water_production_readings
  where extract(year from recorded_at) = year_param
  group by extract(month from recorded_at), to_char(recorded_at, 'Mon')
  order by month;
$$ language sql security definer;

-- Get current dashboard stats
create or replace function get_dashboard_stats()
returns table (
  stat_name text,
  stat_value numeric,
  stat_unit text,
  stat_change numeric
) as $$
begin
  -- Today's usage
  return query
  select
    'today_usage'::text,
    coalesce(sum(reading_value), 0),
    'gallons'::text,
    null::numeric
  from water_production_readings
  where recorded_at >= current_date;

  -- This month's usage
  return query
  select
    'month_usage'::text,
    coalesce(sum(reading_value), 0),
    'gallons'::text,
    null::numeric
  from water_production_readings
  where recorded_at >= date_trunc('month', current_date);

  -- Latest chlorine reading
  return query
  select
    'latest_chlorine'::text,
    residual_level,
    'mg/L'::text,
    null::numeric
  from chlorine_readings
  order by recorded_at desc
  limit 1;

  -- Average reservoir level (latest reading per reservoir)
  return query
  select
    'avg_reservoir_level'::text,
    coalesce(avg(level_percent), 0),
    '%'::text,
    null::numeric
  from (
    select distinct on (reservoir_id) level_percent
    from reservoir_readings
    order by reservoir_id, recorded_at desc
  ) latest_readings;
end;
$$ language plpgsql security definer;

-- Get recent readings for dashboard
create or replace function get_recent_readings(limit_count integer default 10)
returns table (
  id uuid,
  type text,
  value numeric,
  unit text,
  recorded_at timestamptz,
  location_name text
) as $$
  (
    select
      w.id,
      'water_production'::text as type,
      w.reading_value as value,
      'gal'::text as unit,
      w.recorded_at,
      m.name as location_name
    from water_production_readings w
    left join meters m on w.meter_id = m.id
    order by w.recorded_at desc
    limit limit_count
  )
  union all
  (
    select
      c.id,
      'chlorine'::text as type,
      c.residual_level as value,
      'mg/L'::text as unit,
      c.recorded_at,
      i.name as location_name
    from chlorine_readings c
    left join infrastructure_points i on c.location_id = i.id
    order by c.recorded_at desc
    limit limit_count
  )
  union all
  (
    select
      r.id,
      'reservoir'::text as type,
      r.level_feet as value,
      'ft'::text as unit,
      r.recorded_at,
      res.name as location_name
    from reservoir_readings r
    left join reservoirs res on r.reservoir_id = res.id
    order by r.recorded_at desc
    limit limit_count
  )
  order by recorded_at desc
  limit limit_count;
$$ language sql security definer;
