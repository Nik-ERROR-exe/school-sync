import React, { useState, useEffect } from 'react';
import { ApiSlot, ApiClass, ApiSubject, ApiTeacher } from '../../types';
import { getPeriodTimeStr } from '../../periodSchedule';
import EditCellModal from './EditCellModal';

interface TimetableGridProps {
  schedule: ApiSlot[];
  classes: ApiClass[];
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  schoolDays: string[];
  periodsPerDay: number;
  saturdayPeriods: number;
  lunchPeriod: number | null;
  onSave: (updatedSchedule: ApiSlot[]) => void;
  onClassChange?: (id: number | null) => void;
}

export default function TimetableGrid({
  schedule,
  classes,
  subjects,
  teachers,
  schoolDays,
  periodsPerDay,
  saturdayPeriods,
  lunchPeriod,
  onSave,
  onClassChange,
}: TimetableGridProps) {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    classes.length > 0 ? classes[0].id : null
  );
  const [editingSlot, setEditingSlot] = useState<ApiSlot | null>(null);

  // Set default class if not set yet
  useEffect(() => {
    if (classes.length > 0 && selectedClassId === null) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Notify the parent of the currently viewed class (for download scoping)
  useEffect(() => {
    onClassChange?.(selectedClassId);
  }, [selectedClassId, onClassChange]);

  const handleCellClick = (day: string, periodNum: number) => {
    if (!selectedClassId) return;

    // Check if it's Saturday and beyond Saturday period limit
    if (day === 'Saturday' && periodNum > saturdayPeriods) {
      return;
    }

    const slot = schedule.find(
      s => s.class_id === selectedClassId && s.day_of_week === day && s.period_number === periodNum
    );

    if (slot) {
      setEditingSlot(slot);
    } else {
      // Pass a new empty slot template
      setEditingSlot({
        class_id: selectedClassId,
        day_of_week: day,
        period_number: periodNum,
        subject_id: 0,
        teacher_id: 0,
      });
    }
  };

  const handleSaveCell = (updatedSlot: ApiSlot) => {
    let newSlots = [...schedule];
    const idx = newSlots.findIndex(
      s =>
        s.class_id === updatedSlot.class_id &&
        s.day_of_week === updatedSlot.day_of_week &&
        s.period_number === updatedSlot.period_number
    );

    if (idx !== -1) {
      newSlots[idx] = updatedSlot;
    } else {
      newSlots.push(updatedSlot);
    }

    setEditingSlot(null);
    onSave(newSlots);
  };

  const handleDeleteCell = () => {
    if (!editingSlot) return;
    const newSlots = schedule.filter(
      s =>
        !(
          s.class_id === editingSlot.class_id &&
          s.day_of_week === editingSlot.day_of_week &&
          s.period_number === editingSlot.period_number
        )
    );
    setEditingSlot(null);
    onSave(newSlots);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 h-full overflow-hidden">
      {/* Top Header: Class Selector */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Master Timetable View</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select a class to view and adjust its schedule.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Class:</label>
          <select
            value={selectedClassId ?? ''}
            onChange={e => setSelectedClassId(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                Class {c.class_name} - {c.division}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Table */}
      <div className="flex-1 overflow-auto p-6">
        {selectedClassId ? (
          <table className="w-full border-collapse border border-slate-200 text-left text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider w-40">
                  Period / Time
                </th>
                {schoolDays.map(day => (
                  <th
                    key={day}
                    className="px-4 py-3 border border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider text-center"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodsPerDay }).map((_, idx) => {
                const periodNum = idx + 1;
                const isLunch = periodNum === lunchPeriod;
                const timeStr = getPeriodTimeStr(periodNum);

                if (isLunch) {
                  return (
                    <tr key={`lunch-${periodNum}`} className="bg-amber-50/50">
                      <td className="px-4 py-3 border border-slate-200 text-xs font-bold text-amber-800">
                        {timeStr}
                      </td>
                      <td
                        colSpan={schoolDays.length}
                        className="px-4 py-3 border border-slate-200 text-center font-bold text-amber-800 tracking-widest text-xs uppercase"
                      >
                        Lunch Break
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`period-${periodNum}`} className="hover:bg-slate-50/50 transition-colors">
                    {/* Time cell */}
                    <td className="px-4 py-4 border border-slate-200 font-medium text-slate-700 bg-slate-50/30">
                      <div className="font-bold text-slate-900 text-xs">Period {periodNum}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{timeStr}</div>
                    </td>

                    {/* Day cells */}
                    {schoolDays.map(day => {
                      const isSaturdayOut = day === 'Saturday' && periodNum > saturdayPeriods;

                      if (isSaturdayOut) {
                        return (
                          <td
                            key={`${day}-${periodNum}`}
                            className="px-4 py-4 border border-slate-200 bg-slate-100/50 text-center"
                          >
                            <span className="text-xs text-slate-355 italic">N/A</span>
                          </td>
                        );
                      }

                      // Find matching slot in database schedule
                      const slot = schedule.find(
                        s =>
                          s.class_id === selectedClassId &&
                          s.day_of_week === day &&
                          s.period_number === periodNum
                      );

                      const subject = slot ? subjects.find(s => s.id === slot.subject_id) : null;
                      const teacher = slot ? teachers.find(t => t.id === slot.teacher_id) : null;
                      const isFree = !slot || slot.subject_id === 0;

                      return (
                        <td
                          key={`${day}-${periodNum}`}
                          onClick={() => handleCellClick(day, periodNum)}
                          className="px-4 py-4 border border-slate-200 text-center cursor-pointer hover:bg-blue-50/30 hover:border-blue-300 transition-colors group relative"
                        >
                          {isFree ? (
                            <span className="text-xs text-slate-400 italic font-medium">Free Period</span>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors text-xs sm:text-sm">
                                {subject ? subject.subject_name : `Sub #${slot.subject_id}`}
                              </div>
                              <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                                {teacher ? teacher.name : `Teacher #${slot.teacher_id}`}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-slate-500 font-medium">
            No classes available. Add classes in the admin panel first.
          </div>
        )}
      </div>

      {editingSlot && (
        <EditCellModal
          slot={editingSlot}
          subjects={subjects}
          teachers={teachers}
          onClose={() => setEditingSlot(null)}
          onSave={handleSaveCell}
          onDelete={handleDeleteCell}
        />
      )}
    </div>
  );
}
