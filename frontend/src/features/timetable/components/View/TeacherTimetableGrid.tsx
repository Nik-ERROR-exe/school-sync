import React from 'react';
import { Coffee } from 'lucide-react';
import { ApiSlot, ApiClass, ApiSubject } from '../../types';
import { getPeriodTimeStr, getPeriodStartTime } from '../../periodSchedule';

interface TeacherTimetableGridProps {
  schedule: ApiSlot[];
  classes: ApiClass[];
  subjects: ApiSubject[];
  teacherName: string;
  schoolDays: string[];
  periodsPerDay: number;
  saturdayPeriods: number;
  lunchPeriod?: number | null;
}

interface DayRow {
  day: string;
  lectures: { period: number; subject?: ApiSubject; classInfo?: ApiClass }[];
  freeCount: number;
  totalPeriods: number;
}

export default function TeacherTimetableGrid({
  schedule,
  classes,
  subjects,
  teacherName,
  schoolDays,
  periodsPerDay,
  saturdayPeriods,
  lunchPeriod,
}: TeacherTimetableGridProps) {
  const getSubject = (id: number) => subjects.find(s => s.id === id);
  const getClassInfo = (id: number) => classes.find(c => c.id === id);

  const getSlot = (day: string, periodNum: number) =>
    schedule.find(s => s.day_of_week === day && s.period_number === periodNum);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const lunchNum = lunchPeriod ?? null;

  // Pre-compute each day's lectures + free-period count once.
  const days: DayRow[] = schoolDays.map(day => {
    const isSat = day === 'Saturday';
    const pCount = isSat ? saturdayPeriods : periodsPerDay;
    const lectures: DayRow['lectures'] = [];
    let freeCount = 0;

    for (let i = 0; i < pCount; i++) {
      const period = i + 1;
      if (lunchNum !== null && period === lunchNum) continue; // lunch isn't a lecture
      const slot = getSlot(day, period);
      if (slot && slot.subject_id !== 0) {
        lectures.push({
          period,
          subject: getSubject(slot.subject_id),
          classInfo: getClassInfo(slot.class_id),
        });
      } else {
        freeCount++;
      }
    }

    return { day, lectures, freeCount, totalPeriods: pCount };
  });

  const totalLectures = days.reduce((sum, d) => sum + d.lectures.length, 0);
  const lunchTimeLabel = lunchNum !== null ? getPeriodTimeStr(lunchNum) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Your schedule</p>
          <h2 className="mt-0.5 font-heading text-lg font-extrabold tracking-tight text-slate-900">
            Timetable for {teacherName}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Personal weekly teaching schedule.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
            {totalLectures} lectures / week
          </span>
          {lunchNum !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              <Coffee className="h-3 w-3" />
              {lunchTimeLabel ? `Lunch ${lunchTimeLabel}` : `Lunch · Period ${lunchNum}`}
            </span>
          )}
        </div>
      </div>

      {/* Body — one clean column of day rows */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="mx-auto max-w-3xl space-y-3">
          {days.map(({ day, lectures, freeCount, totalPeriods }) => {
            const isToday = day === today;
            const hasLunch = lunchNum !== null && lunchNum <= totalPeriods;

            return (
              <div
                key={day}
                className={`overflow-hidden rounded-xl border transition ${
                  isToday
                    ? 'border-blue-300 bg-white shadow-md ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                {/* Day header */}
                <div
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    isToday
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-slate-50/80 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-bold">{day}</span>
                    {isToday && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      isToday ? 'text-blue-50' : 'text-slate-500'
                    }`}
                  >
                    {lectures.length} lecture{lectures.length === 1 ? '' : 's'}
                    {freeCount > 0 && ` · ${freeCount} free`}
                  </span>
                </div>

                {/* Lectures or empty state */}
                <div className="px-4 py-3">
                  {lectures.length === 0 ? (
                    <p className="py-2 text-center text-xs font-semibold text-slate-400">
                      No lectures scheduled
                      {freeCount > 0 && ` · ${freeCount} free period${freeCount === 1 ? '' : 's'}`}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lectures.map(({ period, subject, classInfo }) => {
                        const startTimeChip = getPeriodStartTime(period);
                        return (
                          <div
                            key={period}
                            className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2.5 transition hover:border-slate-200 hover:bg-white"
                          >
                            {/* Period number + time chip */}
                            <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 px-1.5 py-1.5 text-white shadow-sm">
                              <span className="font-heading text-xs font-extrabold leading-none">
                                P{period}
                              </span>
                              {startTimeChip && (
                                <span className="mt-1 text-[9px] font-mono leading-none opacity-90">
                                  {startTimeChip}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {subject ? subject.subject_name : `Subject #${period}`}
                              </p>
                              <p className="mt-0.5 truncate text-xs font-semibold text-blue-600">
                                Class {classInfo ? `${classInfo.class_name}-${classInfo.division}` : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Single inline lunch note for the day, only where it falls */}
                      {hasLunch && (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                          <Coffee className="h-3 w-3" />
                          <span>
                            Lunch break · period {lunchNum}
                            {lunchTimeLabel ? ` · ${lunchTimeLabel}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
