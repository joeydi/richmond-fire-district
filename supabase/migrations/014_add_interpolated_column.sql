-- Add interpolated boolean column to meter_readings and chlorine_readings
-- Used to flag readings that were accepted from report interpolation

ALTER TABLE meter_readings ADD COLUMN interpolated boolean NOT NULL DEFAULT false;
ALTER TABLE chlorine_readings ADD COLUMN interpolated boolean NOT NULL DEFAULT false;

-- Migrate existing auto-accepted readings: set the flag and clear the notes
UPDATE meter_readings
SET interpolated = true, notes = NULL
WHERE notes = 'Auto-accepted from report interpolation';

UPDATE chlorine_readings
SET interpolated = true, notes = NULL
WHERE notes = 'Auto-accepted from report interpolation';
