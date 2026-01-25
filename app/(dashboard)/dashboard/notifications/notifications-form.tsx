"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, FileText, Droplets, Gauge, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateNotificationPreferences } from "@/lib/actions/notifications";
import type { NotificationPreferences, DigestFrequency } from "@/lib/types/database";

interface NotificationsFormProps {
  preferences: NotificationPreferences | null;
  defaultPreferences: Omit<NotificationPreferences, "id" | "created_at" | "updated_at">;
  userEmail: string;
}

export function NotificationsForm({
  preferences,
  defaultPreferences,
  userEmail,
}: NotificationsFormProps) {
  const initial = preferences ?? defaultPreferences;

  const [saving, setSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(initial.phone_number ?? "");

  // Log post notifications
  const [notifyNewLogPosts, setNotifyNewLogPosts] = useState(initial.notify_new_log_posts);
  const [notifyNewLogPostsEmail, setNotifyNewLogPostsEmail] = useState(initial.notify_new_log_posts_email);
  const [notifyNewLogPostsSms, setNotifyNewLogPostsSms] = useState(initial.notify_new_log_posts_sms);

  // Meter reading notifications
  const [notifyMissingMeterReadings, setNotifyMissingMeterReadings] = useState(initial.notify_missing_meter_readings);
  const [notifyMissingMeterReadingsEmail, setNotifyMissingMeterReadingsEmail] = useState(initial.notify_missing_meter_readings_email);
  const [notifyMissingMeterReadingsSms, setNotifyMissingMeterReadingsSms] = useState(initial.notify_missing_meter_readings_sms);
  const [missingMeterReadingDays, setMissingMeterReadingDays] = useState(initial.missing_meter_reading_days);

  // Chlorine reading notifications
  const [notifyMissingChlorineReadings, setNotifyMissingChlorineReadings] = useState(initial.notify_missing_chlorine_readings);
  const [notifyMissingChlorineReadingsEmail, setNotifyMissingChlorineReadingsEmail] = useState(initial.notify_missing_chlorine_readings_email);
  const [notifyMissingChlorineReadingsSms, setNotifyMissingChlorineReadingsSms] = useState(initial.notify_missing_chlorine_readings_sms);
  const [missingChlorineReadingDays, setMissingChlorineReadingDays] = useState(initial.missing_chlorine_reading_days);

  // Digest preferences
  const [digestEnabled, setDigestEnabled] = useState(initial.digest_enabled);
  const [digestFrequency, setDigestFrequency] = useState<DigestFrequency>(initial.digest_frequency);
  const [digestEmail, setDigestEmail] = useState(initial.digest_email);

  const handleSave = async () => {
    setSaving(true);

    try {
      const result = await updateNotificationPreferences({
        phone_number: phoneNumber || null,

        notify_new_log_posts: notifyNewLogPosts,
        notify_new_log_posts_email: notifyNewLogPostsEmail,
        notify_new_log_posts_sms: notifyNewLogPostsSms,

        notify_missing_meter_readings: notifyMissingMeterReadings,
        notify_missing_meter_readings_email: notifyMissingMeterReadingsEmail,
        notify_missing_meter_readings_sms: notifyMissingMeterReadingsSms,
        missing_meter_reading_days: missingMeterReadingDays,

        notify_missing_chlorine_readings: notifyMissingChlorineReadings,
        notify_missing_chlorine_readings_email: notifyMissingChlorineReadingsEmail,
        notify_missing_chlorine_readings_sms: notifyMissingChlorineReadingsSms,
        missing_chlorine_reading_days: missingChlorineReadingDays,

        digest_enabled: digestEnabled,
        digest_frequency: digestFrequency,
        digest_email: digestEmail,
      });

      if (result.success) {
        toast.success("Notification preferences saved");
      } else {
        toast.error(result.error || "Failed to save preferences");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const hasSmsEnabled = notifyNewLogPostsSms || notifyMissingMeterReadingsSms || notifyMissingChlorineReadingsSms;

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={userEmail} disabled />
            <p className="text-sm text-muted-foreground">
              Email notifications will be sent to your account email
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (for SMS)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Required for SMS notifications. Include country code.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* New Log Post Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            New Log Posts
          </CardTitle>
          <CardDescription>
            Get notified when new log entries are posted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts for new log posts
              </p>
            </div>
            <Switch
              checked={notifyNewLogPosts}
              onCheckedChange={setNotifyNewLogPosts}
            />
          </div>
          {notifyNewLogPosts && (
            <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label>Email</Label>
                </div>
                <Switch
                  checked={notifyNewLogPostsEmail}
                  onCheckedChange={setNotifyNewLogPostsEmail}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label>SMS</Label>
                </div>
                <Switch
                  checked={notifyNewLogPostsSms}
                  onCheckedChange={setNotifyNewLogPostsSms}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Meter Readings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Missing Meter Readings
          </CardTitle>
          <CardDescription>
            Get notified when meter readings are overdue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable notifications</Label>
              <p className="text-sm text-muted-foreground">
                Alert when no readings recorded
              </p>
            </div>
            <Switch
              checked={notifyMissingMeterReadings}
              onCheckedChange={setNotifyMissingMeterReadings}
            />
          </div>
          {notifyMissingMeterReadings && (
            <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
              <div className="space-y-2">
                <Label htmlFor="meterDays">Days threshold</Label>
                <Select
                  value={String(missingMeterReadingDays)}
                  onValueChange={(v) => setMissingMeterReadingDays(Number(v))}
                >
                  <SelectTrigger id="meterDays" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} {d === 1 ? "day" : "days"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Notify after this many days without a reading
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label>Email</Label>
                </div>
                <Switch
                  checked={notifyMissingMeterReadingsEmail}
                  onCheckedChange={setNotifyMissingMeterReadingsEmail}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label>SMS</Label>
                </div>
                <Switch
                  checked={notifyMissingMeterReadingsSms}
                  onCheckedChange={setNotifyMissingMeterReadingsSms}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Chlorine Readings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Missing Chlorine Readings
          </CardTitle>
          <CardDescription>
            Get notified when chlorine readings are overdue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable notifications</Label>
              <p className="text-sm text-muted-foreground">
                Alert when no readings recorded
              </p>
            </div>
            <Switch
              checked={notifyMissingChlorineReadings}
              onCheckedChange={setNotifyMissingChlorineReadings}
            />
          </div>
          {notifyMissingChlorineReadings && (
            <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
              <div className="space-y-2">
                <Label htmlFor="chlorineDays">Days threshold</Label>
                <Select
                  value={String(missingChlorineReadingDays)}
                  onValueChange={(v) => setMissingChlorineReadingDays(Number(v))}
                >
                  <SelectTrigger id="chlorineDays" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} {d === 1 ? "day" : "days"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Notify after this many days without a reading
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label>Email</Label>
                </div>
                <Switch
                  checked={notifyMissingChlorineReadingsEmail}
                  onCheckedChange={setNotifyMissingChlorineReadingsEmail}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label>SMS</Label>
                </div>
                <Switch
                  checked={notifyMissingChlorineReadingsSms}
                  onCheckedChange={setNotifyMissingChlorineReadingsSms}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digest Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Summary Digest
          </CardTitle>
          <CardDescription>
            Receive periodic summaries with stats, readings, and log entries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable digest emails</Label>
              <p className="text-sm text-muted-foreground">
                Get periodic summary reports
              </p>
            </div>
            <Switch
              checked={digestEnabled}
              onCheckedChange={setDigestEnabled}
            />
          </div>
          {digestEnabled && (
            <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
              <div className="space-y-2">
                <Label htmlFor="digestFrequency">Frequency</Label>
                <Select
                  value={digestFrequency}
                  onValueChange={(v) => setDigestFrequency(v as DigestFrequency)}
                >
                  <SelectTrigger id="digestFrequency" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label>Email</Label>
                </div>
                <Switch
                  checked={digestEmail}
                  onCheckedChange={setDigestEmail}
                />
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  Digest includes: system statistics, latest meter readings,
                  chlorine levels, reservoir levels, and recent log entries.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning for SMS without phone */}
      {hasSmsEnabled && !phoneNumber && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            You have SMS notifications enabled but no phone number set.
            Please add your phone number above to receive SMS alerts.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
