/**
 * Offline Cycle Prediction Algorithm
 *
 * Runs entirely on-device using SQLite cycle data.
 * Predicts next period, fertile window, and ovulation date.
 * No network required — works offline-first.
 */

export interface CycleInput {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate?: string | null; // ISO date string, null if ongoing
  flowIntensity?: string | null;
}

export interface CyclePrediction {
  nextPeriodStart: Date;
  nextPeriodEnd: Date; // based on average period length
  fertileWindowStart: Date; // ~5 days before ovulation
  fertileWindowEnd: Date; // ~1 day after ovulation
  ovulationDate: Date; // ~14 days before next period
  confidence: 'low' | 'medium' | 'high'; // based on cycle count and regularity
  averageCycleLength: number;
  averagePeriodLength: number;
}

/** Default assumptions when data is insufficient */
const DEFAULTS = {
  CYCLE_LENGTH: 28,
  PERIOD_LENGTH: 5,
  LUTEAL_PHASE: 14, // days from ovulation to next period
  FERTILE_WINDOW_BEFORE_OVULATION: 5,
  FERTILE_WINDOW_AFTER_OVULATION: 1,
  MIN_VALID_CYCLE_LENGTH: 18,
  MAX_VALID_CYCLE_LENGTH: 50,
  MIN_VALID_PERIOD_LENGTH: 1,
  MAX_VALID_PERIOD_LENGTH: 12,
  HIGH_CONFIDENCE_MAX_STD_DEV: 3, // days
};

/**
 * Calculate the average of an array of numbers.
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = average(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

/**
 * Parse a date string (YYYY-MM-DD) into a Date at midnight UTC.
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Calculate days between two dates (absolute).
 */
function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Add days to a Date, returning a new Date.
 */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Filter out cycles with unrealistic lengths.
 */
function filterValidCycleLengths(lengths: number[]): number[] {
  return lengths.filter(
    (len) => len >= DEFAULTS.MIN_VALID_CYCLE_LENGTH && len <= DEFAULTS.MAX_VALID_CYCLE_LENGTH,
  );
}

/**
 * Determine confidence level based on cycle count and regularity.
 *
 * - low: fewer than 3 cycles tracked
 * - medium: 3-5 cycles, or 6+ with high variability
 * - high: 6+ cycles with standard deviation <= 3 days
 */
function determineConfidence(cycleCount: number, stdDev: number): 'low' | 'medium' | 'high' {
  if (cycleCount < 3) return 'low';
  if (cycleCount < 6) return 'medium';
  // 6+ cycles: high only if regular
  if (stdDev <= DEFAULTS.HIGH_CONFIDENCE_MAX_STD_DEV) return 'high';
  return 'medium';
}

/**
 * Main prediction function.
 *
 * @param cycles - Array of past cycles from SQLite, sorted by startDate ascending.
 *                 Each cycle needs at least a startDate. endDate is optional.
 * @returns CyclePrediction or null if no data at all.
 */
export function predictCycle(cycles: CycleInput[]): CyclePrediction | null {
  if (!cycles || cycles.length === 0) {
    return null;
  }

  // Sort cycles by start date ascending
  const sorted = [...cycles].sort(
    (a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime(),
  );

  // Calculate cycle lengths (gap between consecutive period start dates)
  const cycleLengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevStart = parseDate(sorted[i - 1].startDate);
    const currStart = parseDate(sorted[i].startDate);
    const length = daysBetween(prevStart, currStart);
    cycleLengths.push(length);
  }

  // Calculate period lengths (start to end of each cycle)
  const periodLengths: number[] = [];
  for (const cycle of sorted) {
    if (cycle.endDate) {
      const start = parseDate(cycle.startDate);
      const end = parseDate(cycle.endDate);
      const length = daysBetween(start, end) + 1; // inclusive
      if (length >= DEFAULTS.MIN_VALID_PERIOD_LENGTH && length <= DEFAULTS.MAX_VALID_PERIOD_LENGTH) {
        periodLengths.push(length);
      }
    }
  }

  // Filter to valid cycle lengths only
  const validCycleLengths = filterValidCycleLengths(cycleLengths);

  // Determine averages (use defaults if insufficient data)
  const avgCycleLength =
    validCycleLengths.length > 0
      ? Math.round(average(validCycleLengths))
      : DEFAULTS.CYCLE_LENGTH;

  const avgPeriodLength =
    periodLengths.length > 0
      ? Math.round(average(periodLengths))
      : DEFAULTS.PERIOD_LENGTH;

  // Standard deviation for confidence calculation
  const stdDev = standardDeviation(validCycleLengths);

  // Confidence based on how many valid cycles we have and their regularity
  const confidence = determineConfidence(validCycleLengths.length, stdDev);

  // Last known period start
  const lastCycle = sorted[sorted.length - 1];
  const lastPeriodStart = parseDate(lastCycle.startDate);

  // Predict next period start
  const nextPeriodStart = addDays(lastPeriodStart, avgCycleLength);

  // If predicted next period is in the past, project forward
  const today = new Date();
  let adjustedNextPeriodStart = nextPeriodStart;
  while (adjustedNextPeriodStart < today) {
    adjustedNextPeriodStart = addDays(adjustedNextPeriodStart, avgCycleLength);
  }

  // Predict next period end
  const nextPeriodEnd = addDays(adjustedNextPeriodStart, avgPeriodLength - 1);

  // Ovulation: ~14 days (luteal phase) before next period
  const ovulationDate = addDays(adjustedNextPeriodStart, -DEFAULTS.LUTEAL_PHASE);

  // Fertile window: 5 days before ovulation to 1 day after
  const fertileWindowStart = addDays(ovulationDate, -DEFAULTS.FERTILE_WINDOW_BEFORE_OVULATION);
  const fertileWindowEnd = addDays(ovulationDate, DEFAULTS.FERTILE_WINDOW_AFTER_OVULATION);

  return {
    nextPeriodStart: adjustedNextPeriodStart,
    nextPeriodEnd,
    fertileWindowStart,
    fertileWindowEnd,
    ovulationDate,
    confidence,
    averageCycleLength: avgCycleLength,
    averagePeriodLength: avgPeriodLength,
  };
}

/**
 * Convenience function: load cycles from SQLite and predict.
 * This is the main entry point for use within the app.
 */
export async function predictCycleFromDb(
  db: { getAllAsync: <T>(sql: string) => Promise<T[]> },
): Promise<CyclePrediction | null> {
  const rows = await db.getAllAsync<{ start_date: string; end_date: string | null; flow_intensity: string | null }>(
    `SELECT start_date, end_date, flow_intensity FROM cycles ORDER BY start_date ASC`,
  );

  if (!rows || rows.length === 0) return null;

  const cycles: CycleInput[] = rows.map((row) => ({
    startDate: row.start_date,
    endDate: row.end_date,
    flowIntensity: row.flow_intensity,
  }));

  return predictCycle(cycles);
}
