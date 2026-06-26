import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DayOfWeek } from '../../types';

const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const schema = z.object({
  academicYear: z.string().min(1, 'Academic Year is required'),
  workingDays: z.array(z.string()).min(1, 'Select at least one working day'),
  schoolStartTime: z.string(),
  schoolEndTime: z.string(),
  periodsPerDay: z.number().min(1),
  periodDuration: z.number().min(1),
  breakDuration: z.number().min(0),
  saturdayHalfDay: z.boolean(),
  saturdayPeriodCount: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Step1SchoolSettings({ onNext }: { onNext: () => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      academicYear: '2024-2025',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      schoolStartTime: '08:00',
      schoolEndTime: '14:30',
      periodsPerDay: 8,
      periodDuration: 40,
      breakDuration: 30,
      saturdayHalfDay: true,
      saturdayPeriodCount: 4,
    }
  });

  const watchSatHalfDay = watch('saturdayHalfDay');

  const onSubmit = (data: FormData) => {
    console.log(data);
    onNext();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 1: School Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure global parameters for the timetable generation.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academic Year</label>
            <input 
              {...register('academicYear')} 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
              placeholder="e.g. 2024-2025"
            />
            {errors.academicYear && <p className="text-xs text-red-500 mt-1">{errors.academicYear.message}</p>}
          </div>
          
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
        </div>

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
