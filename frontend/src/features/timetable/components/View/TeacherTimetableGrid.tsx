import React from 'react';
import { mockSubjects, mockClasses } from '../../mock';
import { TimetableData } from '../../types';

interface TeacherTimetableGridProps {
  data: TimetableData;
  teacherId: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export default function TeacherTimetableGrid({ data, teacherId }: TeacherTimetableGridProps) {
  const getSubject = (id: string) => mockSubjects.find(s => s.id === id);
  const getClassInfo = (id: string) => mockClasses.find(c => c.id === id);

  const getSlot = (day: string, period: number) => {
    return data.slots.find(s => s.teacherId === teacherId && s.day === day && s.period === period);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">My Timetable</h2>
        <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          Generated: {new Date(data.generatedAt).toLocaleDateString()}
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map(day => {
            const isToday = day === today;
            const pCount = day === 'Saturday' ? 4 : 8;

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
                    const subject = slot ? getSubject(slot.subjectId) : null;
                    const classInfo = slot ? getClassInfo(slot.classId) : null;

                    return (
                      <div key={period} className="flex items-center px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                        <div className="w-12 text-xs font-extrabold text-slate-400">P{period}</div>
                        <div className="flex-1 pl-4 border-l border-slate-100">
                          {slot ? (
                            <div>
                              <div className="text-sm font-bold text-slate-900">{subject?.name}</div>
                              <div className="text-xs font-semibold text-blue-600 mt-0.5">Class {classInfo?.name}</div>
                              {slot.roomId && <div className="text-[10px] text-slate-500 mt-0.5">Room: {slot.roomId}</div>}
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-slate-300 italic">Free Period</div>
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
