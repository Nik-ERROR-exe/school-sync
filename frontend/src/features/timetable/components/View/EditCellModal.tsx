import React, { useState } from 'react';
import { ApiSlot, ApiSubject, ApiTeacher } from '../../types';
import { X, Trash2, Save } from 'lucide-react';

interface EditCellModalProps {
  slot: ApiSlot;
  subjects: ApiSubject[];
  teachers: ApiTeacher[];
  onClose: () => void;
  onSave: (slot: ApiSlot) => void;
  onDelete: () => void;
}

export default function EditCellModal({ 
  slot, 
  subjects, 
  teachers, 
  onClose, 
  onSave, 
  onDelete 
}: EditCellModalProps) {
  const [subjectId, setSubjectId] = useState(slot.subject_id);
  const [teacherId, setTeacherId] = useState(slot.teacher_id);

  const handleSave = () => {
    onSave({ 
      ...slot, 
      subject_id: Number(subjectId), 
      teacher_id: Number(teacherId) 
    });
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setSubjectId(val);
    if (val === 0) {
      setTeacherId(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Edit Timetable Cell</h3>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
              {slot.day_of_week} • Period {slot.period_number}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200/50">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
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
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
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
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <Save size={16} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
