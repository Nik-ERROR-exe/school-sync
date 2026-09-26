import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../../../api';
import { useWizard, WeeklyReqEntry, computeMaxRequirements, ApiTeacher, ApiSubject } from '../../WizardContext';
import { Loader2, AlertCircle, Trash2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiClass } from '../../types';
import { toast } from 'react-hot-toast';
import DiagnosticBanner from './DiagnosticBanner';

import { sortClasses } from '../../../../utils/classSorter';

interface WeeklyReqState {
  id?: number;
  class_id: number;
  subject_id: number;
  periods_per_week: number;
}

export default function Step3WeeklyRequirements({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  const { state, updateState } = useWizard();

  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [teachers, setTeachers] = useState<ApiTeacher[]>([]);
  const [initialDbReqs, setInitialDbReqs] = useState<WeeklyReqState[]>([]);
  const [localReqs, setLocalReqs] = useState<WeeklyReqState[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { schoolDays, periodsPerDay, lunchPeriod, selectedClassId, selectedTeacherIds } = state;

  const maxAllowedSlots = useMemo(() => {
    return computeMaxRequirements(schoolDays, periodsPerDay, lunchPeriod);
  }, [schoolDays, periodsPerDay, lunchPeriod]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [classesRes, teachersRes, dbReqsRes] = await Promise.all([
          api.get('/admin/classes/'),
          api.get('/admin/teachers/'),
          api.get('/admin/weekly-requirements/'),
        ]);

        setClasses(sortClasses(classesRes.data));
        setTeachers(teachersRes.data);

        const allDbReqs = dbReqsRes.data.map((r: any) => ({
          id: r.id,
          class_id: Number(r.class_id),
          subject_id: Number(r.subject_id),
          periods_per_week: Number(r.periods_per_week),
        }));
        
        const filteredDbReqs = selectedClassId
          ? allDbReqs.filter((r: WeeklyReqState) => r.class_id === selectedClassId)
          : allDbReqs;

        setInitialDbReqs(filteredDbReqs);

        if (state.weeklyRequirements && state.weeklyRequirements.length > 0) {
          const contextReqs = selectedClassId
            ? state.weeklyRequirements.filter(r => r.class_id === selectedClassId)
            : state.weeklyRequirements;

          setLocalReqs(contextReqs.map(r => ({
            id: r.id,
            class_id: r.class_id,
            subject_id: r.subject_id,
            periods_per_week: r.periods_per_week,
          })));
        } else {
          setLocalReqs(filteredDbReqs);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load requirement settings from server.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedClassId]);

  const selectedTeachers = useMemo(() => {
    return teachers.filter(t => selectedTeacherIds.includes(t.id));
  }, [teachers, selectedTeacherIds]);

  const teacherCapacityMap = useMemo(() => {
    const capacity: Record<number, number> = {};
    selectedTeachers.forEach(t => {
      if (t.subject_expertise) {
        t.subject_expertise.forEach(subId => {
          capacity[subId] = (capacity[subId] || 0) + (t.max_lectures_per_day * schoolDays.length);
        });
      }
    });
    return capacity;
  }, [selectedTeachers, schoolDays]);

  const getTeacherCapacity = useCallback((subjectId: number) => {
    return teacherCapacityMap[subjectId] || 0;
  }, [teacherCapacityMap]);

  const getClassDetail = useCallback((classId: number) => {
    return classes.find(c => c.id === classId);
  }, [classes]);

  const getSubjectDetail = useCallback((subjectId: number) => {
    return state._subjectsCache.find(s => s.id === subjectId);
  }, [state._subjectsCache]);

  const classStats = useMemo(() => {
    const stats: Record<number, { total: number; overLimit: boolean; overLimitBy: number }> = {};
    if (selectedClassId) {
      const total = localReqs
        .filter(r => r.class_id === selectedClassId)
        .reduce((sum, r) => sum + r.periods_per_week, 0);
      const overLimit = total > maxAllowedSlots;
      stats[selectedClassId] = {
        total,
        overLimit,
        overLimitBy: overLimit ? total - maxAllowedSlots : 0,
      };
    }
    return stats;
  }, [localReqs, selectedClassId, maxAllowedSlots]);

  const isFormValid = useMemo(() => {
    if (localReqs.length === 0) return false;
    for (const req of localReqs) {
      if (req.periods_per_week > schoolDays.length || req.periods_per_week < 1) {
        return false;
      }
    }
    if (selectedClassId && classStats[selectedClassId]?.overLimit) {
      return false;
    }
    return true;
  }, [localReqs, schoolDays, selectedClassId, classStats]);

  const subjectsWithNoTeacherCount = useMemo(() => {
    return localReqs.filter(r => getTeacherCapacity(r.subject_id) === 0).length;
  }, [localReqs, getTeacherCapacity]);

  const updatePeriods = (classId: number, subjectId: number, count: number) => {
    setSaved(false);
    const validCount = Math.max(1, count);
    setLocalReqs(prev => {
      const existingIdx = prev.findIndex(r => r.class_id === classId && r.subject_id === subjectId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], periods_per_week: validCount };
        return updated;
      } else {
        return [...prev, { class_id: classId, subject_id: subjectId, periods_per_week: validCount }];
      }
    });
  };

  const removeSubjectRequirement = (classId: number, subjectId: number) => {
    setSaved(false);
    setLocalReqs(prev => prev.filter(r => !(r.class_id === classId && r.subject_id === subjectId)));
  };

  const addSubjectRequirement = (classId: number, subjectId: number) => {
    setSaved(false);
    setLocalReqs(prev => {
      if (prev.some(r => r.class_id === classId && r.subject_id === subjectId)) {
        return prev;
      }
      return [...prev, { class_id: classId, subject_id: subjectId, periods_per_week: 1 }];
    });
  };

  const handleSaveAndContinue = async () => {
    if (!isFormValid) return;
    setSaving(true);

    try {
      const promises: Promise<any>[] = [];

      initialDbReqs.forEach(initial => {
        const stillExists = localReqs.some(l => l.class_id === initial.class_id && l.subject_id === initial.subject_id);
        if (!stillExists && initial.id) {
          promises.push(api.delete(`/admin/weekly-requirements/${initial.id}`));
        }
      });

      localReqs.forEach(local => {
        const dbMatch = initialDbReqs.find(i => i.class_id === local.class_id && i.subject_id === local.subject_id);
        if (dbMatch) {
          if (dbMatch.periods_per_week !== local.periods_per_week && dbMatch.id) {
            promises.push(api.put(`/admin/weekly-requirements/${dbMatch.id}`, {
              class_id: local.class_id,
              subject_id: local.subject_id,
              periods_per_week: local.periods_per_week
            }));
          }
        } else {
          promises.push(api.post('/admin/weekly-requirements/', {
            class_id: local.class_id,
            subject_id: local.subject_id,
            periods_per_week: local.periods_per_week
          }));
        }
      });

      await Promise.all(promises);
      
      const savedEntries: WeeklyReqEntry[] = localReqs.map(l => {
        const subj = getSubjectDetail(l.subject_id);
        const cls = getClassDetail(l.class_id);
        return {
          id: l.id,
          class_id: l.class_id,
          subject_id: l.subject_id,
          periods_per_week: l.periods_per_week,
          subject_name: subj ? subj.subject_name : null,
          class_name: cls ? cls.class_name : null,
          division: cls ? cls.division : null,
        };
      });

      updateState({ weeklyRequirements: savedEntries });
      setSaved(true);
      toast.success('Weekly requirements saved successfully!');
      setTimeout(() => {
        onNext();
      }, 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save weekly requirements to the database.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border border-slate-200 dark:border-[#253044] overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50">
          <h2 className="text-lg font-bold">Step 3: Weekly Requirements</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Loading class standard and subject information…</p>
        </div>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 mr-3" size={28} />
          <span className="text-slate-500 dark:text-slate-400 font-medium">Fetching requirement settings…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border border-slate-200 dark:border-[#253044] overflow-hidden p-8 text-center text-slate-900 dark:text-slate-100">
        <AlertCircle className="text-rose-500 mx-auto mb-4 animate-bounce" size={40} />
        <h3 className="text-lg font-bold mb-2">Error Loading Requirements</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors">
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Fixed Info Bar */}
      <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 shadow-xs sticky top-16 z-20 backdrop-blur-md">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <AlertCircle className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
          Configuration Parameters
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          School settings: <span className="font-bold text-slate-800 dark:text-slate-200">{schoolDays.length} days</span> × <span className="font-bold text-slate-800 dark:text-slate-200">{periodsPerDay} periods/day</span> = {schoolDays.length * periodsPerDay} slots per class. 
          {lunchPeriod !== null && ` Minus ${schoolDays.length} lunch break slots.`}
          <br />
          Maximum configurable periods: <span className="font-extrabold text-blue-700 dark:text-blue-400">{maxAllowedSlots} periods per class</span>.
        </p>
      </div>

      <DiagnosticBanner issues={state.diagnosticIssues} stepNumber={3} />

      {/* Selected Classes Cards */}
      <div className="space-y-8">
        {selectedClassId && (() => {
          const cls = getClassDetail(selectedClassId);
          if (!cls) return null;

          const stats = classStats[selectedClassId] || { total: 0, overLimit: false, overLimitBy: 0 };
          const classReqs = localReqs.filter(r => r.class_id === selectedClassId);
          
          const allClassSubjects = cls.subjects || [];
          const hasZeroSubjects = allClassSubjects.length === 0;
          const availableToConfigure = allClassSubjects.filter(
            sub => !classReqs.some(req => req.subject_id === sub.id)
          );

          const classHasNoTeacherSubject = classReqs.some(r => getTeacherCapacity(r.subject_id) === 0);
          const percent = Math.min(100, Math.round((stats.total / maxAllowedSlots) * 100));
          
          let progressColor = 'bg-emerald-500';
          if (stats.overLimit) progressColor = 'bg-rose-600 animate-pulse';
          else if (percent >= 90) progressColor = 'bg-rose-500';
          else if (percent >= 70) progressColor = 'bg-amber-500';

          return (
            <div
              key={selectedClassId}
              id={`class-card-${selectedClassId}`}
              className={`bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border transition-all duration-300 ${
                stats.overLimit 
                  ? 'border-rose-300 dark:border-rose-800/80 shadow-md ring-2 ring-rose-100 dark:ring-rose-900/30' 
                  : classHasNoTeacherSubject 
                    ? 'border-amber-300 dark:border-amber-800/60 shadow-xs'
                    : 'border-slate-200 dark:border-[#253044]'
              }`}
            >
              {/* Card Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">
                    Class {cls.class_name} - {cls.division}
                  </h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Weekly Lectures Requirements</span>
                </div>

                {!hasZeroSubjects && (
                  <div className="w-full md:w-72 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={stats.overLimit ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                        {stats.total} / {maxAllowedSlots} periods assigned
                      </span>
                      {stats.overLimit && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold animate-pulse">
                          ⚠ Over limit by {stats.overLimitBy}!
                        </span>
                      )}
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6">
                {hasZeroSubjects ? (
                  <div className="text-center py-10 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-dashed border-amber-200 dark:border-amber-800/40 flex flex-col items-center justify-center p-6">
                    <AlertTriangle className="text-amber-500 mb-2" size={32} />
                    <p className="text-amber-800 dark:text-amber-300 text-sm font-bold">
                      ⚠ No subjects assigned to Class {cls.class_name}-{cls.division}.
                    </p>
                    <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                      Go to Admin → Class Management to assign subjects first.
                    </p>
                  </div>
                ) : (
                  <>
                    {classHasNoTeacherSubject && (
                      <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                          ⚠ Some subjects have no teacher assigned. Assign teachers in Admin → All Teachers before generating.
                        </span>
                      </div>
                    )}

                    {classReqs.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 dark:bg-[#161D29] rounded-xl border border-dashed border-slate-200 dark:border-[#253044]">
                        <p className="text-slate-400 text-sm">No subject requirements configured.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-[#161D29] text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-[#253044]">
                            <tr>
                              <th className="px-4 py-3">Subject Name</th>
                              <th className="px-4 py-3 text-center">Periods/Week</th>
                              <th className="px-4 py-3 text-center">Max Allowed</th>
                              <th className="px-4 py-3">Teacher Capacity</th>
                              <th className="px-4 py-3 text-center">Status</th>
                              <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[#253044]">
                            {classReqs.map(req => {
                              const sub = getSubjectDetail(req.subject_id);
                              if (!sub) return null;
                              const capacity = getTeacherCapacity(req.subject_id);
                              const isNoTeacher = capacity === 0;
                              const maxVal = capacity > 0 ? Math.min(schoolDays.length, capacity) : schoolDays.length;

                              let statusIcon = (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                                  <CheckCircle2 size={11} className="text-emerald-500" />
                                  Valid
                                </span>
                              );
                              
                              const isInvalid = req.periods_per_week > schoolDays.length || req.periods_per_week < 1;

                              if (isInvalid) {
                                statusIcon = (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-xs">
                                    <AlertCircle size={11} className="text-rose-500 animate-pulse" />
                                    Invalid
                                  </span>
                                );
                              } else if (isNoTeacher) {
                                statusIcon = (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs animate-pulse">
                                    <AlertTriangle size={11} className="text-amber-500" />
                                    No Teacher
                                  </span>
                                );
                              } else if (capacity < 2 * req.periods_per_week) {
                                statusIcon = (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs">
                                    <AlertTriangle size={11} className="text-amber-500" />
                                    Tight
                                  </span>
                                );
                              }
      
                              return (
                                <tr 
                                  key={req.subject_id} 
                                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                                    isInvalid 
                                      ? 'border-l-4 border-l-rose-500 bg-rose-50/10 dark:bg-rose-950/10' 
                                      : isNoTeacher 
                                        ? 'border-l-4 border-l-amber-500 bg-amber-50/10 dark:bg-amber-950/10' 
                                        : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                                    {sub.subject_name}
                                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{sub.code}</span>
                                  </td>
                                  
                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => updatePeriods(selectedClassId, req.subject_id, req.periods_per_week - 1)}
                                        disabled={req.periods_per_week <= 1}
                                        className="w-7 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold rounded-lg flex items-center justify-center transition-colors outline-none disabled:opacity-50 cursor-pointer"
                                      >
                                        −
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        max={maxVal}
                                        value={req.periods_per_week}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                                          updatePeriods(selectedClassId, req.subject_id, val);
                                        }}
                                        className="w-12 h-7 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#253044] rounded-lg text-center font-bold text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updatePeriods(selectedClassId, req.subject_id, req.periods_per_week + 1)}
                                        disabled={req.periods_per_week >= maxVal}
                                        className="w-7 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold rounded-lg flex items-center justify-center transition-colors outline-none disabled:opacity-50 cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="text-[9px] text-slate-400 block mt-1">max: {maxVal}/week</span>
                                  </td>
      
                                  <td className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    ≤ {schoolDays.length}/week
                                  </td>
      
                                  <td className="px-4 py-3">
                                    {isNoTeacher ? (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                        ⚠ No teacher for this subject
                                      </span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <span className={`text-xs font-semibold ${
                                          capacity < req.periods_per_week ? 'text-rose-500 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                          {capacity} periods available
                                        </span>
                                        {capacity < req.periods_per_week && (
                                          <p className="text-[10px] text-rose-500 font-semibold leading-tight mt-0.5">
                                            Only {capacity} periods possible
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </td>
      
                                  <td className="px-4 py-3 text-center">
                                    {statusIcon}
                                  </td>
      
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeSubjectRequirement(selectedClassId, req.subject_id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                                      title="Remove subject"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Card Footer */}
              {!hasZeroSubjects && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50 flex items-center">
                  {availableToConfigure.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Add subject requirement:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addSubjectRequirement(selectedClassId, Number(e.target.value));
                            e.target.value = '';
                          }
                        }}
                        className="bg-white dark:bg-[#10151F] border border-slate-200 dark:border-[#253044] text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">— Choose Subject —</option>
                        {availableToConfigure.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.subject_name} ({sub.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      All subjects assigned to this class are configured.
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Save / Back Actions */}
      <div className="space-y-4">
        {subjectsWithNoTeacherCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Warning: Unassigned Teachers</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium leading-relaxed">
                Warning: {subjectsWithNoTeacherCount} subject{subjectsWithNoTeacherCount !== 1 ? 's have' : ' has'} no teacher assigned.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-8 py-5 bg-white dark:bg-[#10151F] border border-slate-200 dark:border-[#253044] rounded-2xl shadow-xs">
          <button
            onClick={onPrev}
            disabled={saving}
            className="bg-white dark:bg-[#10151F] border border-slate-200 dark:border-[#253044] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            Back
          </button>

          <button
            onClick={handleSaveAndContinue}
            disabled={!isFormValid || saving || saved}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-xs transition-all cursor-pointer ${
              !isFormValid || saving || saved
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                : saved
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <span className="text-white font-extrabold">✓</span>
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? 'Saving changes…' : saved ? 'Saved ✓' : 'Save & Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
