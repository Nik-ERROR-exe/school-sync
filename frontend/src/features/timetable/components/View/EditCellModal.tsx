import React, { useState } from 'react';
import { TimetableSlot } from '../../types';
import { mockSubjects, mockTeachers } from '../../mock';
import { X, Trash2, Save } from 'lucide-react';

interface EditCellModalProps {
  slot: TimetableSlot;
  onClose: () => void;
  onSave: (slot: TimetableSlot) => void;
  onDelete: () => void;
}

export default function EditCellModal({ slot, onClose, onSave, onDelete }: EditCellModalProps) {
  const [subjectId, setSubjectId] = useState(slot.subjectId);
  const [teacherId, setTeacherId] = useState(slot.teacherId);
  const [roomId, setRoomId] = useState(slot.roomId || '');

  const handleSave = () => {
    onSave({ ...slot, subjectId, teacherId, roomId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Edit Timetable Cell</h3>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
              {slot.day} • Period {slot.period}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200/50">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject</label>
            <select 
              value={subjectId} 
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {mockSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teacher</label>
            <select 
              value={teacherId} 
              onChange={e => setTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {mockTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Room (Optional)</label>
            <input 
              value={roomId} 
              onChange={e => setRoomId(e.target.value)}
              placeholder="e.g. Lab 1"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
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
