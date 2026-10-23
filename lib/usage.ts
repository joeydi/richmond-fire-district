// Production-rate math shared by the dashboard KPI band (server) and the
// water production chart (client)

export interface UsageData {
  date: string;
  total_usage: number;
  reading_count: number;
}

export interface RateData {
  date: string;
  rate: number;
  reading_count: number;
}

export interface RateSummary {
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  total: number;
}

/** Gallons/day between consecutive daily meter totals */
export function calculateDailyRate(data: UsageData[]): RateData[] {
  if (data.length === 0) return [];

  // Sort by date ascending to calculate differences correctly
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const rateData: RateData[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];

    // Calculate the difference in usage between consecutive days
    const usageDiff = current.total_usage - previous.total_usage;

    // Calculate days between readings (usually 1, but could be more if data is sparse)
    const daysDiff = Math.max(
      1,
      (new Date(current.date).getTime() - new Date(previous.date).getTime()) /
        (24 * 60 * 60 * 1000)
    );

    rateData.push({
      date: current.date,
      rate: Math.max(0, usageDiff / daysDiff), // Avoid negative rates from meter resets
      reading_count: current.reading_count,
    });
  }

  return rateData;
}

export function summarizeRates(rates: number[]): RateSummary | null {
  if (rates.length === 0) return null;
  const total = rates.reduce((a, b) => a + b, 0);
  const avg = total / rates.length;
  const variance = rates.reduce((a, r) => a + (r - avg) ** 2, 0) / rates.length;
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
    avg,
    stdDev: Math.sqrt(variance),
    total,
  };
}
