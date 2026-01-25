-- Add production_rate column to meter_readings table
-- Stores calculated GPM (gallons per minute) based on consecutive readings

ALTER TABLE meter_readings
ADD COLUMN production_rate numeric DEFAULT NULL;

-- Create a composite index to optimize lookups for nearby readings by meter and time
CREATE INDEX meter_readings_meter_recorded_idx
ON meter_readings(meter_id, recorded_at DESC);
