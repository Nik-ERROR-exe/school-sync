import React, { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../../WizardContext';
import api from '../../../../api';
import { ApiClass } from '../../types';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const schema = z.object({
  workingDays: z.array(z.string()).min(1, 'Select at least one working day'),
  schoolStartTime: z.string(),
  schoolEndTime: z.string(),
  periodsPerDay: z.number().min(1, 'At least 1 period required'),
  periodDuration: z.number().min(1, 'Duration must be at least 1 minute'),
  saturdayHalfDay: z.boolean(),
  saturdayPeriodCount: z.number().optional(),
  lunchPeriod: z.number().nullable(),
  selectedClassId: z.number().nullable(),
});

type FormData = z.infer<typeof schema>;

export default function Step1SchoolSettings({ onNext }: { onNext: () => void }) {
  const { state, updateState } = useWizard();
  const [classes, setClasses] = useState<ApiClass[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/admin/classes/');
        setClasses(res.data);
      } catch (err) {
        console.error('Failed to fetch classes', err);
      }
    };
    fetchClasses();
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      workingDays: state.schoolDays,
      schoolStartTime: state.startTime,
      schoolEndTime: state.endTime,
      periodsPerDay: state.periodsPerDay,
      periodDuration: state.periodDuration,
      saturdayHalfDay: state.schoolDays.includes('Saturday'),
      saturdayPeriodCount: state.saturdayPeriods,
      lunchPeriod: state.lunchPeriod,
      selectedClassId: state.selectedClassId,
    }
  });

  const watchSatHalfDay = watch('saturdayHalfDay');
  const watchPeriodsPerDay = watch('periodsPerDay');

  // Build lunch period options dynamically based on periodsPerDay
  const lunchOptions = useMemo(() => {
    const count = watchPeriodsPerDay || 0;
    const opts: { value: number | null; label: string }[] = [{ value: null, label: 'None' }];
    for (let i = 1; i <= count; i++) {
      opts.push({ value: i, label: `Period ${i}` });
    }
    return opts;
  }, [watchPeriodsPerDay]);

  const onSubmit = (data: FormData) => {
    updateState({
      schoolDays: data.workingDays,
      periodsPerDay: data.periodsPerDay,
      saturdayPeriods: data.saturdayHalfDay ? (data.saturdayPeriodCount ?? 4) : data.periodsPerDay,
      startTime: data.schoolStartTime,
      endTime: data.schoolEndTime,
      periodDuration: data.periodDuration,
      lunchPeriod: data.lunchPeriod,
      selectedClassId: data.selectedClassId,
    });
    onNext();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 1: School Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure global parameters for the timetable generation.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
        {/* Target Class Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Target Class for Timetable</label>
          <select
            value={watch('selectedClassId') ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              setValue('selectedClassId', val);
            }}
            className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">All Classes (Master Timetable)</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                Class {cls.class_name} - Division {cls.division}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            Generate the timetable for all classes or select a specific class to generate for.
          </p>
        </div>

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

        {/* Time & Period Settings */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Start Time</label>
            <input type="time" {...register('schoolStartTime')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">End Time</label>
            <input type="time" {...register('schoolEndTime')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Periods/Day</label>
            <input type="number" {...register('periodsPerDay', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Duration (min)</label>
            <input type="number" {...register('periodDuration', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>

        {/* Lunch Period Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lunch Period</label>
          <select
            value={watch('lunchPeriod') ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              setValue('lunchPeriod', val);
            }}
            className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {lunchOptions.map(opt => (
              <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400">Select which period is the lunch break. This period will be marked as free for all classes.</p>
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
