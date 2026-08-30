import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../../WizardContext';
import { PERIODS_PER_DAY, LUNCH_PERIOD } from '../../periodSchedule';
import DiagnosticBanner from './DiagnosticBanner';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const schema = z.object({
  workingDays: z.array(z.string()).min(1, 'Select at least one working day'),
  saturdayHalfDay: z.boolean(),
  saturdayPeriodCount: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Step1SchoolSettings({ onNext }: { onNext: () => void }) {
  const { state, updateState } = useWizard();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      workingDays: state.schoolDays,
      saturdayHalfDay: state.schoolDays.includes('Saturday'),
      saturdayPeriodCount: state.saturdayPeriods,
    }
  });

  const watchSatHalfDay = watch('saturdayHalfDay');

  const onSubmit = (data: FormData) => {
    updateState({
      schoolDays: data.workingDays,
      periodsPerDay: PERIODS_PER_DAY,
      saturdayPeriods: data.saturdayHalfDay ? (data.saturdayPeriodCount ?? 4) : PERIODS_PER_DAY,
      lunchPeriod: LUNCH_PERIOD,
    });
    onNext();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 1: School Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure global parameters for the timetable generation. The school schedule is fixed at{' '}
          {PERIODS_PER_DAY} periods/day (7:10 AM start) with lunch in period {LUNCH_PERIOD}.
        </p>
      </div>

      {/* Diagnostic Banner for Step 1 issues */}
      <div className="px-8 pt-4">
        <DiagnosticBanner issues={state.diagnosticIssues} stepNumber={1} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* Working Days */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Working Days</label>
          <div className="flex flex-wrap gap-2">
            {days.map(day => (
              <label key={day} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" value={day} {...register('workingDays')} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                <span className="text-sm font-medium text-slate-700">{day.substring(0, 3)}</span>
              </label>
            ))}
          </div>
          {errors.workingDays && <p className="text-xs text-red-500 mt-1">{errors.workingDays.message}</p>}
        </div>

        {/* Saturday Half Day */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('saturdayHalfDay')} className="w-5 h-5 text-blue-600 rounded border-blue-300 focus:ring-blue-500" />
            <span className="text-sm font-bold text-blue-900">Enable Saturday Half Day</span>
          </label>

          {watchSatHalfDay && (
            <div className="pl-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-2">Saturday Period Count</label>
              <input type="number" {...register('saturdayPeriodCount', { valueAsNumber: true })} className="w-32 bg-white border border-blue-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow">
            Save & Continue
          </button>
        </div>
      </form>
    </div>
  );
}
