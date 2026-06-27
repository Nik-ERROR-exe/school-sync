import React, { useState } from 'react';
import { mockTeachers, mockSubjects } from '../../mock';
import { Teacher } from '../../types';
import { Edit2, Trash2, Plus } from 'lucide-react';

export default function Step2Teachers({ onNext, onPrev }: { onNext: () => void, onPrev: () => void }) {
  const [teachers] = useState<Teacher[]>(mockTeachers);

  const getSubjectNames = (subjectIds: string[]) => {
    return subjectIds.map(id => mockSubjects.find(s => s.id === id)?.name).filter(Boolean).join(', ');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Step 2: Teachers</h2>
          <p className="text-sm text-slate-500 mt-1">Manage teaching staff, their subjects, and workload limits.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      <div className="p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Teacher</th>
              <th className="px-6 py-4">Subjects</th>
              <th className="px-6 py-4">Max/Day</th>
              <th className="px-6 py-4">Max/Week</th>
              <th className="px-6 py-4">Availability</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map(teacher => (
              <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{teacher.name}</div>
                  <div className="text-xs text-slate-500">{teacher.teacherId} • {teacher.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map(subId => (
                      <span key={subId} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600">
                        {mockSubjects.find(s => s.id === subId)?.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-700 font-medium">{teacher.maxLecturesPerDay}</td>
                <td className="px-6 py-4 text-slate-700 font-medium">{teacher.maxLecturesPerWeek}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    {teacher.availability}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
        <button onClick={onPrev} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
          Back
        </button>
        <button onClick={onNext} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow">
          Save & Continue
        </button>
      </div>
    </div>
  );
}
