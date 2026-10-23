"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection, settingsLabelClass } from "@/components/settings/settings-nav";
import { cn } from "@/lib/utils";
import { updateNotificationPreferences, type NotificationPreferencesInput } from "@/lib/actions/notifications";
import type { NotificationPreferences, DigestFrequency } from "@/lib/types/database";

/** Form state: every field present, with the phone number as an editable string */
type Preferences = Omit<Required<NotificationPreferencesInput>, "phone_number"> & { phone_number: string };
type BooleanKey = { [K in keyof Preferences]: Preferences[K] extends boolean ? K : never }[keyof Preferences];

const DAY_OPTIONS = [1, 2, 3, 5, 7, 14, 30];

interface NotificationsFormProps {
  preferences: NotificationPreferences | null;
  defaultPreferences: Omit<NotificationPreferences, "id" | "created_at" | "updated_at">;
  userEmail: string;
}

interface AlertRow {
  title: string;
  description: string;
  enabled: BooleanKey;
  email: BooleanKey;
  sms: BooleanKey | null;
}

const ALERTS: AlertRow[] = [
  {
    title: "New log posts",
    description: "When anyone posts to the log",
    enabled: "notify_new_log_posts",
    email: "notify_new_log_posts_email",
    sms: "notify_new_log_posts_sms",
  },
  {
    title: "Missing meter readings",
    description: "When no meter reading has been entered",
    enabled: "notify_missing_meter_readings",
    email: "notify_missing_meter_readings_email",
    sms: "notify_missing_meter_readings_sms",
  },
  {
    title: "Missing chlorine readings",
    description: "When no chlorine reading has been entered",
    enabled: "notify_missing_chlorine_readings",
    email: "notify_missing_chlorine_readings_email",
    sms: "notify_missing_chlorine_readings_sms",
  },
  {
    title: "Summary digest",
    description: "Stats, latest readings and recent log posts",
    enabled: "digest_enabled",
    email: "digest_email",
    sms: null,
  },
];

function toInput(source: NotificationsFormProps["defaultPreferences"]): Preferences {
  return {
    phone_number: source.phone_number ?? "",
    notify_new_log_posts: source.notify_new_log_posts,
    notify_new_log_posts_email: source.notify_new_log_posts_email,
    notify_new_log_posts_sms: source.notify_new_log_posts_sms,
    notify_missing_meter_readings: source.notify_missing_meter_readings,
    notify_missing_meter_readings_email: source.notify_missing_meter_readings_email,
    notify_missing_meter_readings_sms: source.notify_missing_meter_readings_sms,
    missing_meter_reading_days: source.missing_meter_reading_days,
    notify_missing_chlorine_readings: source.notify_missing_chlorine_readings,
    notify_missing_chlorine_readings_email: source.notify_missing_chlorine_readings_email,
    notify_missing_chlorine_readings_sms: source.notify_missing_chlorine_readings_sms,
    missing_chlorine_reading_days: source.missing_chlorine_reading_days,
    digest_enabled: source.digest_enabled,
    digest_frequency: source.digest_frequency,
    digest_email: source.digest_email,
  };
}

function ChannelToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 font-mono text-[10px] tracking-[0.06em] uppercase sm:justify-center sm:border-0 sm:px-0",
        checked && !disabled ? "border-brand/40 bg-brand/10 sm:bg-transparent" : "text-muted-foreground",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-brand"
      />
      <span className="sm:sr-only">{label}</span>
    </label>
  );
}

const thClass = "font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase";
// From md the first column plus the gap matches SettingsSection's 220px label
// column and 32px gap, so the controls start on the same line as the fields above
const gridClass =
  "sm:grid sm:grid-cols-[minmax(0,1fr)_56px_56px_56px_112px] sm:items-center sm:gap-x-2 md:grid-cols-[244px_56px_56px_56px_120px_minmax(0,1fr)]";

export function NotificationsForm({ preferences, defaultPreferences, userEmail }: NotificationsFormProps) {
  const [saved, setSaved] = useState(() => toInput(preferences ?? defaultPreferences));
  const [prefs, setPrefs] = useState(saved);
  const [isSaving, startSaving] = useTransition();

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPrefs((current) => ({ ...current, [key]: value }));

  const isDirty = JSON.stringify(prefs) !== JSON.stringify(saved);
  const smsInUse = ALERTS.some((alert) => alert.sms && prefs[alert.enabled] && prefs[alert.sms]);
  const missingPhone = smsInUse && !prefs.phone_number.trim();
  const activeCount = ALERTS.filter((alert) => prefs[alert.enabled]).length;

  const handleSave = () => {
    startSaving(async () => {
      const next = { ...prefs, phone_number: prefs.phone_number.trim() };
      const result = await updateNotificationPreferences({ ...next, phone_number: next.phone_number || null });
      if (result.success) {
        setSaved(next);
        setPrefs(next);
        toast.success("Notification preferences saved");
      } else {
        toast.error(result.error || "Failed to save preferences");
      }
    });
  };

  const setting = (alert: AlertRow) => {
    const disabled = !prefs[alert.enabled];
    if (alert.enabled === "digest_enabled") {
      return (
        <Select
          value={prefs.digest_frequency}
          onValueChange={(v) => set("digest_frequency", v as DigestFrequency)}
          disabled={disabled}
        >
          <SelectTrigger size="sm" className="!h-7 w-full px-2 text-xs" aria-label="Digest frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    const key =
      alert.enabled === "notify_missing_meter_readings"
        ? "missing_meter_reading_days"
        : alert.enabled === "notify_missing_chlorine_readings"
          ? "missing_chlorine_reading_days"
          : null;
    if (!key) return <span className="hidden text-center text-muted-foreground sm:block md:pl-2 md:text-left">—</span>;
    return (
      <Select value={String(prefs[key])} onValueChange={(v) => set(key, Number(v))} disabled={disabled}>
        <SelectTrigger size="sm" className="!h-7 w-full px-2 text-xs" aria-label={`${alert.title} threshold`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((d) => (
            <SelectItem key={d} value={String(d)}>
              After {d} {d === 1 ? "day" : "days"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <SettingsSection title="Delivery" description="Where alerts are sent. Email always goes to your account address.">
        <div className="flex flex-col gap-1.5">
          <span className={settingsLabelClass}>Email</span>
          <span className="font-mono text-[13px]">{userEmail}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className={settingsLabelClass}>
            Phone for SMS
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+1 802 555 0123"
            value={prefs.phone_number}
            onChange={(e) => set("phone_number", e.target.value)}
            aria-invalid={missingPhone}
            className="h-8 font-mono text-[13px]"
          />
          <p className={cn("text-xs", missingPhone ? "text-amber-700" : "text-muted-foreground")}>
            {missingPhone
              ? "SMS alerts are on, but there’s no number to send them to."
              : "Include the country code."}
          </p>
        </div>
      </SettingsSection>

      <section aria-label="Alerts" className="border-b">
        <div className="flex items-baseline gap-2 px-4 pt-4 pb-2 lg:px-6">
          <h2 className={thClass}>Alerts</h2>
          <span className="font-mono text-[10px] text-muted-foreground">{activeCount} ON</span>
        </div>
        <div className={cn("hidden border-y bg-zinc-50 px-4 py-1.5 lg:px-6", gridClass)}>
          <span className={thClass}>Alert</span>
          <span className={cn(thClass, "text-center md:text-left")}>On</span>
          <span className={cn(thClass, "text-center")}>Email</span>
          <span className={cn(thClass, "text-center")}>SMS</span>
          <span className={thClass}>When</span>
        </div>
        <ul>
          {ALERTS.map((alert) => {
            const enabled = prefs[alert.enabled];
            const switchId = `alert-${alert.enabled}`;
            return (
              <li
                key={alert.enabled}
                className={cn("flex flex-col gap-2 border-b border-zinc-100 px-4 py-2.5 last:border-b-0 lg:px-6", gridClass)}
              >
                <div className="flex items-center gap-3 sm:contents">
                  <label htmlFor={switchId} className="flex min-w-0 flex-1 cursor-pointer flex-col">
                    <span className="text-[13px] font-medium">{alert.title}</span>
                    <span className="text-xs text-muted-foreground">{alert.description}</span>
                  </label>
                  <div className="flex sm:justify-center md:justify-start">
                    <Switch
                      id={switchId}
                      checked={enabled}
                      onCheckedChange={(checked) => set(alert.enabled, checked)}
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1.5 sm:contents",
                    // Phones only show channel settings for alerts that are on
                    !enabled && "hidden sm:contents"
                  )}
                >
                  <ChannelToggle
                    label="Email"
                    checked={prefs[alert.email]}
                    disabled={!enabled}
                    onChange={(checked) => set(alert.email, checked)}
                  />
                  {alert.sms ? (
                    <ChannelToggle
                      label="SMS"
                      checked={prefs[alert.sms]}
                      disabled={!enabled}
                      onChange={(checked) => set(alert.sms!, checked)}
                    />
                  ) : (
                    <span className="hidden text-center text-muted-foreground sm:block">—</span>
                  )}
                  <div className="ml-auto w-[120px] sm:ml-0 sm:w-auto">{setting(alert)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-0 z-10 flex items-center gap-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur md:grid md:grid-cols-[244px_minmax(0,1fr)] lg:px-6">
        <span className={cn("flex-1 font-mono text-[11px]", isDirty ? "text-amber-700" : "text-muted-foreground")}>
          {isDirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
        </span>
        <div className="flex gap-2">
          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving ? "Saving…" : "Save preferences"}
          </Button>
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setPrefs(saved)}
              disabled={isSaving}
            >
              Discard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
