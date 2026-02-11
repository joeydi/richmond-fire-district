-- Fix get_daily_usage to use average instead of sum
-- and add optional meter_id filtering
--
-- This corrects the calculation when there are multiple readings per day.
-- reading_value is a cumulative meter reading (like an odometer), so
-- averaging multiple readings on the same day gives the correct daily value.

CREATE OR REPLACE FUNCTION get_daily_usage(
  start_date date DEFAULT (now() - interval '30 days')::date,
  end_date date DEFAULT now()::date,
  meter_id_param uuid DEFAULT NULL
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
    avg(reading_value) as total_usage,
    count(*) as reading_count
  FROM meter_readings
  WHERE recorded_at >= start_date
    AND recorded_at <= end_date + interval '1 day'
    AND (meter_id_param IS NULL OR meter_id = meter_id_param)
  GROUP BY date_trunc('day', recorded_at)::date
  ORDER BY date ASC;
END;
$$;
