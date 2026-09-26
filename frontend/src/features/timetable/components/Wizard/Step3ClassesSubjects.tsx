import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import { useWizard, computeMaxRequirements } from '../../WizardContext';
import { Loader2, AlertTriangle, CheckCircle2, Users, BookOpen, Calendar } from 'lucide-react';
import { ApiClass } from '../../types';

import { sortClasses } from '../../../../utils/classSorter';

export default function Step3ClassesSubjects({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  const { state } = useWizard();

  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/admin/classes/');
        setClasses(sortClasses(res.data));
      } catch {
        setError('Failed to load classes information.');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const selectedTeachers = useMemo(() => {
    return state._teachersCache.filter(t => state.selectedTeacherIds.includes(t.id));
  }, [state._teachersCache, state.selectedTeacherIds]);

  const ptSubjectName = useMemo(() => {
    return state._subjectsCache.find(s => s.id === state.ptSubjectId)?.subject_name ?? '—';
  }, [state._subjectsCache, state.ptSubjectId]);

  const selectedClasses = useMemo(() => {
    if (!state.selectedClassId) return [];
    return classes.filter(c => c.id === state.selectedClassId);
  }, [classes, state.selectedClassId]);

  const maxAllowedSlots = useMemo(() => {
    return computeMaxRequirements(state.schoolDays, state.periodsPerDay, state.lunchPeriod);
  }, [state.schoolDays, state.periodsPerDay, state.lunchPeriod]);

  const classUsage = useMemo(() => {
    const usage: Record<number, number> = {};
    if (state.selectedClassId) {
      const total = state.weeklyRequirements
        .filter(r => r.class_id === state.selectedClassId)
        .reduce((sum, r) => sum + r.periods_per_week, 0);
      usage[state.selectedClassId] = total;
    }
    return usage;
  }, [state.weeklyRequirements, state.selectedClassId]);

  return (
    <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border border-slate-200 dark:border-[#253044] overflow-hidden animate-in fade-in duration-300 text-slate-900 dark:text-slate-100 font-sans">
      <div className="px-8 py-6 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50">
        <h2 className="text-lg font-bold">Step 4: Review & Confirm</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Verify your configuration before generating the timetable.</p>
      </div>

      <div className="p-8 space-y-8">
        {/* School Settings Summary */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} /> School Settings
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Working Days" value={state.schoolDays.map(d => d.substring(0, 3)).join(', ')} />
            <SummaryCard label="Periods/Day" value={String(state.periodsPerDay)} />
            <SummaryCard label="School Hours" value="07:10 – 12:35" />
            <SummaryCard label="Lunch Period" value={state.lunchPeriod ? `Period ${state.lunchPeriod}` : 'None'} />
            {state.schoolDays.includes('Saturday') && (
              <SummaryCard label="Saturday Periods" value={String(state.saturdayPeriods)} />
            )}
            <SummaryCard label="PT Subject" value={ptSubjectName} />
          </div>
        </div>

        {/* Selected Classes & Usage */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} /> Selected Classes & Slot Usage
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedClasses.map(c => {
              const used = classUsage[c.id] || 0;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50 shadow-xs">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Class {c.class_name}-{c.division}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                    {used} / {maxAllowedSlots} slots used ✓
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Teachers */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} /> Selected Teachers ({selectedTeachers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedTeachers.map(t => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
              >
                <CheckCircle2 className="text-blue-500" size={12} />
                {t.name}
                <span className="text-blue-400 font-mono text-[10px]">{t.teacher_id || `#${t.id}`}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Weekly Requirements Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Weekly Requirements Details
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 mr-3" size={20} />
              <span className="text-slate-500 text-sm">Loading details…</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm font-medium px-4 py-3 rounded-lg">
              <AlertTriangle size={16} />
              {error}
            </div>
          ) : state.weeklyRequirements.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No weekly requirements configured.</p>
          ) : (
            <div className="border border-slate-200 dark:border-[#253044] rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-[#161D29] text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-[#253044] sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3 text-center">Periods/Week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#253044]">
                  {state.weeklyRequirements.map((req, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        Class {req.class_name}-{req.division}
                      </td>
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300">{req.subject_name ?? `Subject #${req.subject_id}`}</td>
                      <td className="px-5 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 text-xs">
                          {req.periods_per_week}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 dark:border-[#253044] bg-slate-50 dark:bg-[#161D29]">
        <button onClick={onPrev} className="bg-white dark:bg-[#10151F] border border-slate-200 dark:border-[#253044] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="px-6 py-2.5 rounded-lg text-sm font-bold shadow-xs transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-[#161D29] border border-slate-200 dark:border-[#253044] rounded-lg px-4 py-3">
      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{value}</div>
    </div>
  );
}
