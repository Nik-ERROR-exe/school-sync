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
