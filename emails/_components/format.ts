// Cron jobs run in UTC on Vercel, so every date in an email is pinned to the
// district's local time
export const TIME_ZONE = "America/New_York";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    ...options,
  });
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
