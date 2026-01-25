-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- User-specific notification settings for alerts and digests
-- ============================================

-- Create table for storing user notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Contact information for notifications
  phone_number TEXT,  -- For SMS notifications

  -- New log post notifications
  notify_new_log_posts BOOLEAN NOT NULL DEFAULT false,
  notify_new_log_posts_email BOOLEAN NOT NULL DEFAULT false,
  notify_new_log_posts_sms BOOLEAN NOT NULL DEFAULT false,

  -- Missing meter reading alerts
  notify_missing_meter_readings BOOLEAN NOT NULL DEFAULT false,
  notify_missing_meter_readings_email BOOLEAN NOT NULL DEFAULT false,
  notify_missing_meter_readings_sms BOOLEAN NOT NULL DEFAULT false,
  missing_meter_reading_days INTEGER NOT NULL DEFAULT 1,  -- Days threshold

  -- Missing chlorine reading alerts
  notify_missing_chlorine_readings BOOLEAN NOT NULL DEFAULT false,
  notify_missing_chlorine_readings_email BOOLEAN NOT NULL DEFAULT false,
  notify_missing_chlorine_readings_sms BOOLEAN NOT NULL DEFAULT false,
  missing_chlorine_reading_days INTEGER NOT NULL DEFAULT 1,  -- Days threshold

  -- Digest preferences
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly')),
  digest_email BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One preference record per user
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX notification_preferences_user_id_idx ON notification_preferences(user_id);

-- Trigger for updated_at
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view only their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update only their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all preferences
CREATE POLICY "Admins can manage all notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (is_admin());
