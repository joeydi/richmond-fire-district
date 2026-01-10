-- Rename level_feet to level_inches in reservoir_readings
ALTER TABLE reservoir_readings
RENAME COLUMN level_feet TO level_inches;

-- Rename max_level_feet to max_level_inches in reservoirs
ALTER TABLE reservoirs
RENAME COLUMN max_level_feet TO max_level_inches;

-- Update the get_reservoir_stats function to use level_inches
CREATE OR REPLACE FUNCTION get_reservoir_stats(
  target_reservoir_id uuid,
  start_date timestamptz DEFAULT now() - interval '30 days',
  end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  date date,
  value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('day', r.recorded_at)::date as date,
    r.level_inches as value
  FROM reservoir_readings r
  WHERE r.reservoir_id = target_reservoir_id
    AND r.recorded_at >= start_date
    AND r.recorded_at <= end_date
  ORDER BY date ASC;
END;
$$;
