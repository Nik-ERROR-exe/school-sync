import React, { useState } from 'react';
import { mockClasses, mockSubjects, mockTeachers } from '../../mock';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

export default function Step3ClassesSubjects({ onNext, onPrev }: { onNext: () => void, onPrev: () => void }) {
  const [expandedClass, setExpandedClass] = useState<string | null>(mockClasses[0]?.id || null);

  const getSubjectName = (id: string) => mockSubjects.find(s => s.id === id)?.name || id;
  const getTeacherName = (id: string) => mockTeachers.find(t => t.id === id)?.name || id;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Step 3: Classes & Subjects</h2>
          <p className="text-sm text-slate-500 mt-1">Configure subjects, weekly lectures, and assign default teachers per class.</p>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {mockClasses.map(cls => (
          <div key={cls.id} className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-300">
            {/* Accordion Header */}
            <button 
              onClick={() => setExpandedClass(expandedClass === cls.id ? null : cls.id)}
              className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${
                expandedClass === cls.id ? 'bg-blue-50/50 border-b border-slate-200' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                  {cls.name}
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900">Class {cls.name}</div>
                  <div className="text-xs text-slate-500">{cls.assignments.length} Subjects Assigned</div>
                </div>
              </div>
              <div className="text-slate-400">
                {expandedClass === cls.id ? <ChevronUp /> : <ChevronDown />}
              </div>
            </button>

            {/* Accordion Body */}
            {expandedClass === cls.id && (
              <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold rounded-lg overflow-hidden">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg">Subject</th>
                      <th className="px-4 py-3">Weekly Lectures</th>
                      <th className="px-4 py-3">Assigned Teacher</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg rounded-br-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cls.assignments.map((assign, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-3 font-semibold text-slate-900">{getSubjectName(assign.subjectId)}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            defaultValue={assign.weeklyLectures} 
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            defaultValue={assign.teacherId} 
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            {mockTeachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end">
                  <button className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                    <Plus size={16} /> Add Subject
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
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
