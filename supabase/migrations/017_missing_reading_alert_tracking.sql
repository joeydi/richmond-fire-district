-- ============================================
-- MISSING READING ALERT TRACKING
-- Remember when each user was last alerted so the daily cron sends one alert
-- per gap in readings instead of one every day until a reading is entered.
-- An alert is due again only once a newer reading has been recorded and the
-- gap reopens.
-- ============================================

ALTER TABLE notification_preferences
  ADD COLUMN last_meter_alert_at TIMESTAMPTZ,
  ADD COLUMN last_chlorine_alert_at TIMESTAMPTZ;
