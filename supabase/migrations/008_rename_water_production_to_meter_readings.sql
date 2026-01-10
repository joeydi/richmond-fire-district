-- Rename water_production_readings table to meter_readings
ALTER TABLE water_production_readings RENAME TO meter_readings;

-- Rename indexes
ALTER INDEX water_production_readings_recorded_at_idx RENAME TO meter_readings_recorded_at_idx;
ALTER INDEX water_production_readings_meter_id_idx RENAME TO meter_readings_meter_id_idx;

-- Update get_daily_usage function
CREATE OR REPLACE FUNCTION get_daily_usage(
  start_date date DEFAULT (now() - interval '30 days')::date,
  end_date date DEFAULT now()::date
)
RETURNS TABLE (
  date date,
  total_usage numeric,
  reading_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('day', recorded_at)::date as date,
    sum(reading_value) as total_usage,
    count(*) as reading_count
  FROM meter_readings
  WHERE recorded_at >= start_date
    AND recorded_at <= end_date + interval '1 day'
  GROUP BY date_trunc('day', recorded_at)::date
  ORDER BY date ASC;
END;
$$;

-- Update get_monthly_usage function
CREATE OR REPLACE FUNCTION get_monthly_usage(
  year_param integer DEFAULT extract(year from now())::integer
)
RETURNS TABLE (
  month integer,
  month_name text,
  total_usage numeric,
  reading_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    extract(month from recorded_at)::integer as month,
    to_char(recorded_at, 'Mon') as month_name,
    sum(reading_value) as total_usage,
    count(*) as reading_count
  FROM meter_readings
  WHERE extract(year from recorded_at) = year_param
  GROUP BY extract(month from recorded_at)::integer, to_char(recorded_at, 'Mon')
  ORDER BY month ASC;
END;
$$;

-- Update get_dashboard_stats function
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  stat_name text,
  stat_value numeric,
  stat_unit text,
  stat_change numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_total numeric;
  yesterday_total numeric;
  month_total numeric;
  last_month_total numeric;
BEGIN
  -- Today's usage
  SELECT coalesce(sum(reading_value), 0) INTO today_total
  FROM meter_readings
  WHERE recorded_at >= date_trunc('day', now());

  SELECT coalesce(sum(reading_value), 0) INTO yesterday_total
  FROM meter_readings
  WHERE recorded_at >= date_trunc('day', now() - interval '1 day')
    AND recorded_at < date_trunc('day', now());

  -- This month's usage
  SELECT coalesce(sum(reading_value), 0) INTO month_total
  FROM meter_readings
  WHERE recorded_at >= date_trunc('month', now());

  SELECT coalesce(sum(reading_value), 0) INTO last_month_total
  FROM meter_readings
  WHERE recorded_at >= date_trunc('month', now() - interval '1 month')
    AND recorded_at < date_trunc('month', now());

  RETURN QUERY VALUES
    ('Today''s Usage', today_total, 'gallons',
     CASE WHEN yesterday_total > 0 THEN ((today_total - yesterday_total) / yesterday_total * 100) ELSE NULL END),
    ('This Month', month_total, 'gallons',
     CASE WHEN last_month_total > 0 THEN ((month_total - last_month_total) / last_month_total * 100) ELSE NULL END);
END;
$$;

-- Update get_recent_readings function
CREATE OR REPLACE FUNCTION get_recent_readings(
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  type text,
  value numeric,
  unit text,
  recorded_at timestamptz,
  location_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      w.id,
      'meter'::text as type,
      w.reading_value as value,
      'gal'::text as unit,
      w.recorded_at,
      m.name as location_name
    FROM meter_readings w
    LEFT JOIN meters m ON m.id = w.meter_id
    ORDER BY w.recorded_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      c.id,
      'chlorine'::text as type,
      c.residual_level as value,
      'mg/L'::text as unit,
      c.recorded_at,
      i.name as location_name
    FROM chlorine_readings c
    LEFT JOIN infrastructure_points i ON i.id = c.location_id
    ORDER BY c.recorded_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      r.id,
      'reservoir'::text as type,
      r.level_inches as value,
      'in'::text as unit,
      r.recorded_at,
      res.name as location_name
    FROM reservoir_readings r
    LEFT JOIN reservoirs res ON res.id = r.reservoir_id
    ORDER BY r.recorded_at DESC
    LIMIT limit_count
  )
  ORDER BY recorded_at DESC
  LIMIT limit_count;
END;
$$;

-- Note: RLS policies are automatically applied to renamed table
-- The policies created on water_production_readings now apply to meter_readings
