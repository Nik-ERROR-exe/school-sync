import React, { useState, useMemo } from 'react';
import { ApiSlot, ApiSubject, ApiTeacher, ApiClass } from '../../types';
import { X, Trash2, Save, AlertTriangle, AlertCircle } from 'lucide-react';
import { checkSlotEditConflict } from '../../utils/conflictChecker';
import OverwriteWarningModal from './OverwriteWarningModal';

interface EditCellModalProps {
  slot: ApiSlot;
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  schedule?: ApiSlot[];
  classes?: ApiClass[];
  ptSubjectId?: number | null;
  onClose: () => void;
  onSave: (slot: ApiSlot) => void;
  onDelete: () => void;
}

export default function EditCellModal({ 
  slot, 
  subjects, 
  teachers, 
  schedule = [],
  classes = [],
  ptSubjectId = null,
  onClose, 
  onSave, 
  onDelete 
}: EditCellModalProps) {
  const [subjectId, setSubjectId] = useState(slot.subject_id);
  const [teacherId, setTeacherId] = useState(slot.teacher_id);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const candidateSlot: ApiSlot = useMemo(() => ({
    ...slot,
    subject_id: Number(subjectId),
    teacher_id: Number(teacherId),
  }), [slot, subjectId, teacherId]);

  // Compute live conflicts against master schedule
  const conflicts = useMemo(() => {
    return checkSlotEditConflict(
      candidateSlot,
      schedule,
      teachers,
      classes,
      subjects,
      ptSubjectId
    );
  }, [candidateSlot, schedule, teachers, classes, subjects, ptSubjectId]);

  const targetClass = useMemo(() => {
    return classes.find(c => c.id === slot.class_id);
  }, [classes, slot.class_id]);

  const classNameStr = targetClass
    ? `Class ${targetClass.class_name}-${targetClass.division}`
    : `Class #${slot.class_id}`;

  const selectedSubjectName = subjects.find(s => s.id === Number(subjectId))?.subject_name ?? 'Free Period';
  const selectedTeacherName = teachers.find(t => t.id === Number(teacherId))?.name ?? 'None';

  const handleSaveClick = () => {
    if (conflicts.length > 0) {
      setShowWarningModal(true);
    } else {
      onSave(candidateSlot);
    }
  };

  const handleConfirmOverwrite = () => {
    setShowWarningModal(false);
    onSave(candidateSlot);
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setSubjectId(val);
    if (val === 0) {
      setTeacherId(0);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-slate-900">Edit Timetable Cell</h3>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
                {classNameStr} • {slot.day_of_week} • Period {slot.period_number}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200/50">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Subject Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject</label>
              <select 
                value={subjectId} 
                onChange={handleSubjectChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="0">Free Period</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subject_name} ({s.code})</option>
                ))}
              </select>
            </div>

            {/* Teacher Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teacher</label>
              <select 
                value={teacherId} 
                onChange={e => setTeacherId(Number(e.target.value))}
                disabled={subjectId === 0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
              >
                <option value="0">None / Free</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Live In-Modal Warning Banner */}
            {conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-2 text-amber-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-800 uppercase tracking-wider">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  Manual Overwrite Warnings ({conflicts.length})
                </div>
                <div className="space-y-1.5 pl-6">
                  {conflicts.map((c, idx) => (
                    <div key={idx} className="text-xs text-amber-800 leading-relaxed flex items-start gap-1.5">
                      <span className="shrink-0 text-amber-600 font-bold">•</span>
                      <span>{c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <button 
              onClick={onDelete}
              className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
            
            <div className="flex gap-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200/50 rounded-lg text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveClick}
                className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${
                  conflicts.length > 0
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Overwrite Warning Pop-up Modal */}
      <OverwriteWarningModal
        isOpen={showWarningModal}
        conflicts={conflicts}
        slot={candidateSlot}
        subjectName={selectedSubjectName}
        teacherName={selectedTeacherName}
        className={classNameStr}
        onConfirm={handleConfirmOverwrite}
        onCancel={() => setShowWarningModal(false)}
      />
    </>
  );
}

