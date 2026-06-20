import React from 'react';
import { mockAssignments, mockTeachers, mockSubjects, mockClasses } from '../../mock';
import { Filter } from 'lucide-react';

export default function Step4TeacherAssignment({ onNext, onPrev }: { onNext: () => void, onPrev: () => void }) {
  const getTeacherName = (id: string) => mockTeachers.find(t => t.id === id)?.name || id;
  const getSubjectName = (id: string) => mockSubjects.find(s => s.id === id)?.name || id;
  const getClassName = (id: string) => mockClasses.find(c => c.id === id)?.name || id;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Step 4: Teacher Assignment</h2>
          <p className="text-sm text-slate-500 mt-1">Review all assignments in a spreadsheet format and set specific constraints.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors">
          <Filter size={14} /> Filter
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Teacher</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Weekly Lectures</th>
              <th className="px-6 py-4">Preferred Period</th>
              <th className="px-6 py-4">Max Consecutive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockAssignments.map((assign, idx) => (
              <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-3 font-bold text-slate-900">{getTeacherName(assign.teacherId)}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600">
                    {getSubjectName(assign.subjectId)}
                  </span>
                </td>
                <td className="px-6 py-3 font-semibold text-slate-700">{getClassName(assign.classId)}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-slate-50 border border-slate-200 font-bold text-slate-700">
                    {assign.weeklyLectures}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <select 
                    defaultValue={assign.preferredPeriod} 
                    className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm"
                  >
                    <option value="Any">Any</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                  </select>
                </td>
                <td className="px-6 py-3">
                  <select 
                    defaultValue={assign.maxConsecutiveLectures} 
                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </td>
              </tr>
            ))}
            {/* Pad with empty rows to look like a spreadsheet if we want, or just list real assignments */}
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
