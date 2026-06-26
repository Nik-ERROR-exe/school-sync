import React, { useState } from 'react';
import { mockClasses, mockSubjects, mockTeachers } from '../../mock';
import { TimetableData, TimetableSlot } from '../../types';
import EditCellModal from './EditCellModal';

interface TimetableGridProps {
  data: TimetableData;
  onUpdateSlot: (slot: TimetableSlot) => void;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export default function TimetableGrid({ data, onUpdateSlot }: TimetableGridProps) {
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const getSubject = (id: string) => mockSubjects.find(s => s.id === id);
  const getTeacher = (id: string) => mockTeachers.find(t => t.id === id);

  const getSlot = (classId: string, day: string, period: number) => {
    return data.slots.find(s => s.classId === classId && s.day === day && s.period === period);
  };

  const handleCellClick = (classId: string, day: typeof days[number], period: number) => {
    const slot = getSlot(classId, day, period);
    if (slot) {
      setEditingSlot(slot);
    } else {
      setEditingSlot({
        id: `new_${classId}_${day}_${period}`,
        classId,
        day,
        period,
        subjectId: mockSubjects[0].id,
        teacherId: mockTeachers[0].id,
      });
    }
  };

  const handleSaveEdit = (updatedSlot: TimetableSlot) => {
    onUpdateSlot(updatedSlot);
    setEditingSlot(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Master Timetable</h2>
        <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          Generated: {new Date(data.generatedAt).toLocaleDateString()}
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 border-r border-slate-200 border-b w-24 sticky left-0 bg-slate-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Class</span>
              </th>
              {days.map(day => {
                const pCount = day === 'Saturday' ? 4 : 8;
                return (
                  <th key={day} colSpan={pCount} className="px-4 py-2 border-r border-slate-200 border-b text-center">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{day}</span>
                  </th>
                );
              })}
            </tr>
            <tr>
              <th className="border-r border-slate-200 border-b sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
              {days.map(day => {
                const pCount = day === 'Saturday' ? 4 : 8;
                return Array.from({ length: pCount }).map((_, i) => (
                  <th key={`${day}_${i}`} className="px-2 py-1 border-r border-slate-200 border-b text-center bg-slate-50 w-24 min-w-[6rem]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">P{i + 1}</span>
                  </th>
                ));
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white relative">
            {mockClasses.map(cls => (
              <tr key={cls.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 border-r border-slate-100 font-extrabold text-slate-900 bg-white sticky left-0 z-10 group-hover:bg-slate-50/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                  {cls.name}
                </td>
                {days.map(day => {
                  const pCount = day === 'Saturday' ? 4 : 8;
                  return Array.from({ length: pCount }).map((_, i) => {
                    const period = i + 1;
                    const slot = getSlot(cls.id, day, period);
                    const subject = slot ? getSubject(slot.subjectId) : null;
                    const teacher = slot ? getTeacher(slot.teacherId) : null;

                    return (
                      <td 
                        key={`${cls.id}_${day}_${period}`} 
                        className="p-1 border-r border-slate-100 cursor-pointer group/cell relative"
                        onClick={() => handleCellClick(cls.id, day, period)}
                      >
                        <div className={`w-full h-16 rounded-md border flex flex-col justify-center items-center p-1 transition-all ${
                          subject ? `${subject.color} border-transparent group-hover/cell:shadow-md group-hover/cell:-translate-y-0.5` : 'bg-slate-50/50 border-slate-100 border-dashed hover:bg-slate-100 hover:border-slate-300'
                        }`}>
                          {subject ? (
                            <>
                              <span className="text-[11px] font-bold leading-tight truncate w-full text-center">{subject.name}</span>
                              <span className="text-[9px] font-medium opacity-80 truncate w-full text-center">{teacher?.name.split(' ')[0]}</span>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-medium">+ Add</span>
                          )}
                        </div>
                      </td>
                    );
                  });
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingSlot && (
        <EditCellModal 
          slot={editingSlot} 
          onClose={() => setEditingSlot(null)} 
          onSave={handleSaveEdit}
          onDelete={() => {
            // handle delete logic here (e.g. passing null to parent or special event)
            setEditingSlot(null);
          }}
        />
      )}
    </div>
  );
}
