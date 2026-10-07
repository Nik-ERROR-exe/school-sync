import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../../WizardContext';
import DiagnosticBanner from './DiagnosticBanner';
import api from '../../../../api';
import { Loader2, AlertCircle, Calculator } from 'lucide-react';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const schema = z.object({
  workingDays: z.array(z.string()).min(1, 'Select at least one working day'),
  saturdayHalfDay: z.boolean(),
  saturdayPeriodCount: z.number().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a valid time'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a valid time'),
  periodMinutes: z.number().int().min(20).max(90),
  lunchMinutes: z.number().int().min(0).max(120),
});

type FormData = z.infer<typeof schema>;

interface Slot {
  index: number;
  start: string;
  end: string;
  label: string;
  isLunch: boolean;
}

function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')}`;
}

function addMin(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  let total = h * 60 + m + minutes;
  total = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function computeSlots(
  startTime: string,
  periodMinutes: number,
  lunchMinutes: number,
  lunchPosition: number,
  periodsPerDay: number,
): Slot[] {
  const out: Slot[] = [];
  let cursor = startTime;
  for (let i = 1; i <= periodsPerDay; i++) {
    const isLunch = lunchMinutes > 0 && i === lunchPosition;
    const duration = isLunch ? lunchMinutes : periodMinutes;
    const end = addMin(cursor, duration);
    out.push({
      index: i,
      start: cursor,
      end,
      label: `${fmt12(cursor)} – ${fmt12(end)}`,
      isLunch,
    });
    cursor = end;
  }
  return out;
}

export default function Step1SchoolSettings({ onNext }: { onNext: () => void }) {
  const { state, updateState } = useWizard();

  const [periodsPerDay, setPeriodsPerDay] = useState<number | null>(null);
  const [actualEnd, setActualEnd] = useState<string>('');
  const [leftover, setLeftover] = useState<number>(0);
  const [lunchPeriod, setLunchPeriod] = useState<number>(state.lunchPeriod ?? 4);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      workingDays: state.schoolDays,
      saturdayHalfDay: state.schoolDays.includes('Saturday'),
      saturdayPeriodCount: state.saturdayPeriods,
      startTime: state.startTime,
      endTime: state.endTime,
      periodMinutes: state.periodMinutes,
      lunchMinutes: state.lunchMinutes,
    },
  });

  const watchSatHalfDay = watch('saturdayHalfDay');
  const watchedStart = watch('startTime');
  const watchedEnd = watch('endTime');
  const watchedMinutes = watch('periodMinutes');
  const watchedLunch = watch('lunchMinutes');

  useEffect(() => {
    setPeriodsPerDay(null);
    setActualEnd('');
    setLeftover(0);
    setCalcError(null);
  }, [watchedStart, watchedEnd, watchedMinutes, watchedLunch]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setCalcError(null);
    try {
      const res = await api.post('/admin/timetable/calculate-slots', {
        start_time: watchedStart,
        end_time: watchedEnd,
        period_minutes: Number(watchedMinutes),
        lunch_minutes: Number(watchedLunch),
      });
      const data = res.data;
      setPeriodsPerDay(data.periods_per_day);
      setActualEnd(data.actual_end);
      setLeftover(data.leftover_minutes);
      setLunchPeriod((prev) => Math.min(prev, data.periods_per_day));
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setCalcError(
        typeof detail === 'string'
          ? detail
          : detail?.message || 'Failed to calculate periods. Check the times and try again.'
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const slots = periodsPerDay
    ? computeSlots(
        watchedStart,
        Number(watchedMinutes),
        Number(watchedLunch),
        lunchPeriod,
        periodsPerDay,
      )
    : null;

  const onSubmit = (data: FormData) => {
    if (periodsPerDay === null) {
      setCalcError('Click "Calculate Periods" first to generate the slot list.');
      return;
    }
    updateState({
      schoolDays: data.workingDays,
      periodsPerDay: periodsPerDay,
      saturdayPeriods: data.saturdayHalfDay ? (data.saturdayPeriodCount ?? 4) : periodsPerDay,
      lunchPeriod: data.lunchMinutes > 0 ? lunchPeriod : 0,
      startTime: data.startTime,
      endTime: data.endTime,
      periodMinutes: data.periodMinutes,
      lunchMinutes: data.lunchMinutes,
    });
    onNext();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 1: School Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Set the school day boundaries, lecture length, and lunch length. The system calculates how many periods fit, then you pick which one is lunch.
        </p>
      </div>

      <div className="px-8 pt-4">
        <DiagnosticBanner issues={state.diagnosticIssues} stepNumber={1} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Working Days</label>
          <div className="flex flex-wrap gap-2">
            {days.map(day => (
              <label key={day} className="flex items-center gap-2 bg-slate-50 dark:bg-[#161D29] border border-slate-200 dark:border-[#253044] rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input type="checkbox" value={day} {...register('workingDays')} className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{day.substring(0, 3)}</span>
              </label>
            ))}
          </div>
          {errors.workingDays && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.workingDays.message}</p>}
        </div>

        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">School Day Boundaries</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Start Time</label>
              <input type="time" {...register('startTime')} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">End Time</label>
              <input type="time" {...register('endTime')} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime.message}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Lecture Length (min)</label>
              <input type="number" {...register('periodMinutes', { valueAsNumber: true })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              {errors.periodMinutes && <p className="text-xs text-red-500 mt-1">{errors.periodMinutes.message}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Lunch Length (min)</label>
              <input type="number" {...register('lunchMinutes', { valueAsNumber: true })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              {errors.lunchMinutes && <p className="text-xs text-red-500 mt-1">{errors.lunchMinutes.message}</p>}
              <p className="text-[10px] text-slate-500 mt-1">Set to 0 to disable lunch entirely.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isCalculating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
            >
              {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
              {isCalculating ? 'Calculating…' : 'Calculate Periods'}
            </button>
            {calcError && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                <AlertCircle size={14} className="shrink-0" />
                {calcError}
              </div>
            )}
          </div>

          {periodsPerDay !== null && (
            <p className="text-xs text-slate-600">
              <span className="font-bold text-slate-800">{periodsPerDay} slots</span> fit.
              Last slot ends at <span className="font-bold text-slate-800">{actualEnd}</span>.
              {leftover > 0 && <span className="text-amber-700"> {leftover} minutes are unused.</span>}
            </p>
          )}
        </div>

        {slots && slots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Lunch Slot</label>
              <span className="text-[11px] text-slate-500">
                Lunch occupies the selected slot. Non-lunch slots are teaching periods.
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {slots.map(s => (
                <button
                  key={s.index}
                  type="button"
                  onClick={() => setLunchPeriod(s.index)}
                  disabled={Number(watchedLunch) === 0}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    s.isLunch
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Slot {s.index}</div>
                  <div className="text-[10px] font-mono text-slate-500">{s.label}</div>
                  {s.isLunch && <div className="text-[10px] font-bold text-amber-700 mt-0.5">LUNCH</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('saturdayHalfDay')} className="w-5 h-5 text-blue-600 rounded border-blue-300 focus:ring-blue-500" />
            <span className="text-sm font-bold text-blue-900 dark:text-blue-200">Enable Saturday Half Day</span>
          </label>

          {watchSatHalfDay && (
            <div className="pl-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-2">Saturday Period Count</label>
              <input type="number" {...register('saturdayPeriodCount', { valueAsNumber: true })} className="w-32 bg-white border border-blue-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              <p className="text-[11px] text-blue-700 mt-2">
                Saturday runs for the first N slots of the same schedule. Lunch only applies if it falls within that range.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={!slots}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow"
          >
            Save & Continue
          </button>
        </div>
      </form>
    </div>
  );
}