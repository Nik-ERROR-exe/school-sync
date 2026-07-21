import React from 'react';
import { ApiSlot, ApiClass, ApiSubject, ApiTeacher } from '../../types';

interface TeacherTimetableGridProps {
  schedule: ApiSlot[];
  classes: ApiClass[];
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  schoolDays: string[];
  periodsPerDay: number;
  saturdayPeriods: number;
  teacherId: number;
}

export default function TeacherTimetableGrid({
  schedule,
  classes,
  subjects,
  teachers,
  schoolDays,
  periodsPerDay,
  saturdayPeriods,
  teacherId,
}: TeacherTimetableGridProps) {
  const getSubject = (id: number) => subjects.find(s => s.id === id);
  const getClassInfo = (id: number) => classes.find(c => c.id === id);

  const getSlot = (day: string, periodNum: number) => {
    return schedule.find(
      s => s.teacher_id === teacherId && s.day_of_week === day && s.period_number === periodNum
    );
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentTeacher = teachers.find(t => t.id === teacherId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Timetable for {currentTeacher ? currentTeacher.name : 'Teacher'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Personal weekly teaching schedule.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schoolDays.map(day => {
            const isToday = day === today;
            const isSat = day === 'Saturday';
            const pCount = isSat ? saturdayPeriods : periodsPerDay;

            return (
              <div 
                key={day} 
                className={`rounded-2xl border overflow-hidden ${
                  isToday 
                    ? 'border-blue-300 shadow-md ring-4 ring-blue-50/50' 
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                <div className={`px-4 py-3 font-bold text-sm ${
                  isToday ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-900 border-b border-slate-100'
                }`}>
                  {day} {isToday && <span className="ml-2 text-[10px] uppercase bg-white/20 px-2 py-0.5 rounded-full">Today</span>}
                </div>
                
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: pCount }).map((_, i) => {
                    const period = i + 1;
                    const slot = getSlot(day, period);
                    const subject = slot ? getSubject(slot.subject_id) : null;
                    const classInfo = slot ? getClassInfo(slot.class_id) : null;

                    return (
                      <div key={period} className="flex items-center px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                        <div className="w-12 text-xs font-extrabold text-slate-400">P{period}</div>
                        <div className="flex-1 pl-4 border-l border-slate-100">
                          {slot && slot.subject_id !== 0 ? (
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {subject ? subject.subject_name : `Subject #${slot.subject_id}`}
                              </div>
                              <div className="text-xs font-semibold text-blue-600 mt-0.5">
                                Class {classInfo ? `${classInfo.class_name}-${classInfo.division}` : `ID: ${slot.class_id}`}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-slate-350 italic">Free Period / Off</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
