import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../../api';
import { useWizard, computeMaxRequirements } from '../../WizardContext';
import { Loader2, AlertTriangle, CheckCircle2, Clock, Users, BookOpen, Calendar } from 'lucide-react';
import { ApiClass } from '../../types';

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
        setClasses(res.data);
      } catch (err: any) {
        setError('Failed to load classes information.');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Derive details
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

  // Compute used slots per class
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900 font-heading">Step 4: Review & Confirm</h2>
        <p className="text-sm text-slate-500 mt-1">Verify your configuration before generating the timetable.</p>
      </div>

      <div className="p-8 space-y-8">
        {/* School Settings Summary */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
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
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} /> Selected Classes & Slot Usage
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedClasses.map(c => {
              const used = classUsage[c.id] || 0;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-250 bg-slate-50/50 shadow-xs">
                  <span className="text-xs font-bold text-slate-800">
                    Class {c.class_name}-{c.division}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    {used} / {maxAllowedSlots} slots used ✓
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Teachers */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} /> Selected Teachers ({selectedTeachers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedTeachers.map(t => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100"
              >
                <CheckCircle2 className="text-blue-500 animate-pulse" size={12} />
                {t.name}
                <span className="text-blue-400 font-mono text-[10px]">{t.teacher_id || `#${t.id}`}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Weekly Requirements Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Weekly Requirements Details
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-600 mr-3" size={20} />
              <span className="text-slate-500 text-sm">Loading details…</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
              <AlertTriangle size={16} />
              {error}
            </div>
          ) : state.weeklyRequirements.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No weekly requirements configured.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3 text-center">Periods/Week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.weeklyRequirements.map((req, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-2.5 font-semibold text-slate-900">
                        Class {req.class_name}-{req.division}
                      </td>
                      <td className="px-5 py-2.5 text-slate-700">{req.subject_name ?? `Subject #${req.subject_id}`}</td>
                      <td className="px-5 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 border border-slate-200 font-bold text-slate-700 text-xs">
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

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
        <button onClick={onPrev} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all bg-slate-900 hover:bg-slate-800 text-white hover:shadow disabled:opacity-50"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}

/** Small reusable card for summary values */
function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}
