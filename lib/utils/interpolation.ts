/**
 * Seeded random number generator using date string as seed
 * Returns a deterministic value between 0 and 1
 */
export function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

/**
 * Get variation for meter reading (+/- 200 gallons) using date as seed
 */
export function getMeterVariation(dateString: string): number {
  const random = seededRandom(dateString);
  return (random - 0.5) * 400; // -200 to +200
}

export interface ReadingPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface InterpolatedReading {
  date: string;
  value: number;
  isInterpolated: boolean;
}

/**
 * Find the most recent reading before the given date
 */
function findPreviousReading(
  readings: ReadingPoint[],
  targetDate: string
): ReadingPoint | null {
  const target = new Date(targetDate).getTime();
  let prev: ReadingPoint | null = null;

  for (const reading of readings) {
    const readingTime = new Date(reading.date).getTime();
    if (readingTime < target) {
      if (!prev || readingTime > new Date(prev.date).getTime()) {
        prev = reading;
      }
    }
  }

  return prev;
}

/**
 * Find the earliest reading after the given date
 */
function findNextReading(
  readings: ReadingPoint[],
  targetDate: string
): ReadingPoint | null {
  const target = new Date(targetDate).getTime();
  let next: ReadingPoint | null = null;

  for (const reading of readings) {
    const readingTime = new Date(reading.date).getTime();
    if (readingTime > target) {
      if (!next || readingTime < new Date(next.date).getTime()) {
        next = reading;
      }
    }
  }

  return next;
}

/**
 * Interpolate missing days using linear interpolation (lerp)
 * For meter readings, adds seeded random variation
 */
export function interpolateMissingDays(
  readings: ReadingPoint[],
  allDates: string[],
  addVariation: boolean = false
): InterpolatedReading[] {
  // Build map of known values
  const knownValues = new Map(readings.map((r) => [r.date, r.value]));

  return allDates.map((date) => {
    if (knownValues.has(date)) {
      return { date, value: knownValues.get(date)!, isInterpolated: false };
    }

    // Find previous and next known readings
    const prev = findPreviousReading(readings, date);
    const next = findNextReading(readings, date);

    // No readings at all - return null value
    if (!prev && !next) {
      return { date, value: 0, isInterpolated: true };
    }

    let interpolatedValue: number;

    if (!prev) {
      // Only have future reading - use it as-is
      interpolatedValue = next!.value;
    } else if (!next) {
      // Only have past reading - use it as-is
      interpolatedValue = prev.value;
    } else {
      // Linear interpolation between prev and next
      const prevDate = new Date(prev.date).getTime();
      const nextDate = new Date(next.date).getTime();
      const currentDate = new Date(date).getTime();
      const t = (currentDate - prevDate) / (nextDate - prevDate);
      interpolatedValue = prev.value + t * (next.value - prev.value);
    }

    // Add seeded random variation for meter readings
    if (addVariation) {
      interpolatedValue += getMeterVariation(date);
    }

    return { date, value: interpolatedValue, isInterpolated: true };
  });
}

/**
 * Generate all dates in a month as YYYY-MM-DD strings
 */
export function getDaysInMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day.toString().padStart(2, "0");
    dates.push(`${yearMonth}-${dayStr}`);
  }

  return dates;
}
