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

/** "2026-08-13T19:31" in district time, for datetime-local inputs */
export function toDistrictInputValue(iso: string): string {
  const { date, time } = getLogDateParts(iso);
  return `${date}T${time}`;
}

/** Offset of district time from UTC at the given instant, in ms */
function districtOffset(utcMs: number): number {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return asUtc - Math.floor(utcMs / 60_000) * 60_000;
}

/** Inverse of toDistrictInputValue: a datetime-local value in district time to ISO */
export function fromDistrictInputValue(value: string): string {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  // Correct once for the offset, then again in case the first guess crossed a DST change
  let utc = wallClock - districtOffset(wallClock);
  utc = wallClock - districtOffset(utc);
  return new Date(utc).toISOString();
}
