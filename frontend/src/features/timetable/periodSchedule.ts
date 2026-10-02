// Fixed school schedule — mirrors the backend constant in
// backend/app/services/timetable/period_schedule.py. The school day is no
// longer configurable: start 07:10, 8 periods/day, lunch in period 4.
// Each period is 40.625 min; times are shown as HH:MM.
export const PERIODS_PER_DAY = 8;
export const LUNCH_PERIOD = 4;

export interface PeriodTime {
  period: number;
  start: string;
  end: string;
}

export const PERIOD_TIMES: PeriodTime[] = [
  { period: 1, start: '07:10', end: '07:50' },
  { period: 2, start: '07:50', end: '08:31' },
  { period: 3, start: '08:31', end: '09:11' },
  { period: 4, start: '09:11', end: '09:52' },
  { period: 5, start: '09:52', end: '10:33' },
  { period: 6, start: '10:33', end: '11:13' },
  { period: 7, start: '11:13', end: '11:54' },
  { period: 8, start: '11:54', end: '12:35' },
];

export const getPeriodTimeStr = (periodNum: number): string => {
  const p = PERIOD_TIMES.find(t => t.period === periodNum);
  if (!p) return '';
  return `${p.start} – ${p.end}`;
};

export const getPeriodStartTime = (periodNum: number): string | null =>
  PERIOD_TIMES.find(t => t.period === periodNum)?.start ?? null;

export interface ComputedSlotLabel {
  period: number;
  start: string; // "HH:MM" 24h
  end: string;
  label: string; // "9:00 – 10:00" 12h
  isLunch: boolean;
}

function _pad(n: number): string {
  return String(n).padStart(2, '0');
}

function _fmt24(minutes: number): string {
  return `${_pad(Math.floor(minutes / 60))}:${_pad(minutes % 60)}`;
}

function _fmt12(minutes: number): string {
  const h = Math.floor(minutes / 60) % 12 || 12;
  const m = minutes % 60;
  return `${h}:${_pad(m)}`;
}

/**
 * Build per-period slot labels from admin config.
 * Returns null when config is incomplete — callers fall back to the
 * hardcoded PERIOD_TIMES above.
 */
export function computeSlotLabels(
  startTime: string | null | undefined,
  periodMinutes: number | null | undefined,
  lunchMinutes: number | null | undefined,
  lunchPeriod: number | null | undefined,
  periodsPerDay: number | null | undefined,
): ComputedSlotLabel[] | null {
  if (!startTime || !periodMinutes || periodsPerDay == null) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(startTime);
  if (!m) return null;
  const startMin = Number(m[1]) * 60 + Number(m[2]);
  const lunchDur = lunchMinutes ?? periodMinutes;
  const lunchNum = lunchPeriod ?? 0;
  const out: ComputedSlotLabel[] = [];
  let cursor = startMin;
  for (let i = 1; i <= periodsPerDay; i++) {
    const isLunch = lunchNum > 0 && i === lunchNum;
    const dur = isLunch ? lunchDur : periodMinutes;
    const end = cursor + dur;
    out.push({
      period: i,
      start: _fmt24(cursor),
      end: _fmt24(end),
      label: `${_fmt12(cursor)} – ${_fmt12(end)}`,
      isLunch,
    });
    cursor = end;
  }
  return out;
}
