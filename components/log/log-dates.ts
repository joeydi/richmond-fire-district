// Log timestamps are shown in the district's local time on both server and
// client, so SSR output matches hydration and posts group into the right month.
const TIME_ZONE = "America/New_York";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "long",
  year: "numeric",
});

const shortMonthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
});

export interface LogDateParts {
  /** 2026-08-13 */
  date: string;
  /** 19:31 */
  time: string;
  /** 2026-08, used for grouping and anchors */
  monthKey: string;
  /** August 2026 */
  monthLabel: string;
  /** Aug */
  shortMonth: string;
  /** 2026 */
  year: string;
}

export function getLogDateParts(iso: string): LogDateParts {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(d).map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    monthKey: `${parts.year}-${parts.month}`,
    monthLabel: monthFormatter.format(d),
    shortMonth: shortMonthFormatter.format(d),
    year: parts.year,
  };
}
