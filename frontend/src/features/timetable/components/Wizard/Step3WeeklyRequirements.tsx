import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../../../api';
import { useWizard, WeeklyReqEntry, computeMaxRequirements, ApiTeacher, ApiSubject } from '../../WizardContext';
import { Loader2, AlertCircle, Trash2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiClass } from '../../types';
import { toast } from 'react-hot-toast';

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

  // Load configuration from WizardContext
  const { schoolDays, periodsPerDay, lunchPeriod, selectedClassIds, selectedTeacherIds } = state;

  const maxAllowedSlots = useMemo(() => {
    return computeMaxRequirements(schoolDays, periodsPerDay, lunchPeriod);
  }, [schoolDays, periodsPerDay, lunchPeriod]);

  // Fetch all necessary data on mount
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

        setClasses(classesRes.data);
        setTeachers(teachersRes.data);

        const allDbReqs = dbReqsRes.data.map((r: any) => ({
          id: r.id,
          class_id: Number(r.class_id),
          subject_id: Number(r.subject_id),
          periods_per_week: Number(r.periods_per_week),
        }));
        
        // Filter DB requirements to only those belonging to selectedClassIds
        // Use Number() on both sides to prevent string/number mismatch
        const filteredDbReqs = allDbReqs.filter((r: WeeklyReqState) =>
          selectedClassIds.some(id => Number(id) === Number(r.class_id))
        );
        setInitialDbReqs(filteredDbReqs);

        // Initialize localReqs state
        const initialLocalReqs: WeeklyReqState[] = [];

        // For each selected class standard
        selectedClassIds.forEach(classId => {
          const numClassId = Number(classId);
          const classData = (classesRes.data as ApiClass[]).find((c: ApiClass) => Number(c.id) === numClassId);
          const classSubjects = classData?.subjects || [];
          const classDbReqs = filteredDbReqs.filter((r: WeeklyReqState) => Number(r.class_id) === numClassId);

          classSubjects.forEach((sub: ApiSubject) => {
            const numSubId = Number(sub.id);
            const dbReq = classDbReqs.find((r: WeeklyReqState) => Number(r.subject_id) === numSubId);
            if (dbReq) {
              initialLocalReqs.push({
                id: dbReq.id,
                class_id: numClassId,
                subject_id: numSubId,
                periods_per_week: dbReq.periods_per_week,
              });
            } else {
              initialLocalReqs.push({
                class_id: numClassId,
                subject_id: numSubId,
                periods_per_week: 1, // Pre-fill with default 1 period
              });
            }
          });
        });

        setLocalReqs(initialLocalReqs);
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(err.response?.data?.detail || 'Failed to load weekly requirements and configurations.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedClassIds]);

  // Derive unique subjects from all classes to use for lookup
  const subjects = useMemo(() => {
    const map = new Map<number, ApiSubject>();
    classes.forEach(c => {
      (c.subjects || []).forEach(s => {
        map.set(s.id, s);
      });
    });
    return Array.from(map.values());
  }, [classes]);

  // Derived selected teachers
  const selectedTeachers = useMemo(() => {
    return teachers.filter(t => selectedTeacherIds.includes(t.id));
  }, [teachers, selectedTeacherIds]);

  // Build a map: subject_id → total weekly capacity from selected teachers
  const teacherCapacityMap = useMemo(() => {
    const map: Record<number, number> = {};
    selectedTeachers.forEach(teacher => {
      (teacher.subjects || []).forEach(subject => {
        const weeklyCapacity = teacher.max_lectures_per_day * schoolDays.length;
        map[subject.id] = (map[subject.id] || 0) + weeklyCapacity;
      });
    });
    return map;
  }, [selectedTeachers, schoolDays.length]);

  // Calculate teacher capacity for a given subject ID
  const getTeacherCapacity = useCallback((subjectId: number): number => {
    return teacherCapacityMap[subjectId] || 0;
  }, [teacherCapacityMap]);

  // Find class details
  const getClassDetail = (classId: number) => {
    return classes.find(c => c.id === classId);
  };

  // Find subject details
  const getSubjectDetail = (subjectId: number) => {
    return subjects.find(s => s.id === subjectId);
  };

  // Update periods_per_week for a class subject
  const updatePeriods = (classId: number, subjectId: number, value: number) => {
    const capacity = getTeacherCapacity(subjectId);
    const maxVal = capacity > 0 ? Math.min(schoolDays.length, capacity) : schoolDays.length;

    let clampedValue = value;
    clampedValue = Math.max(1, Math.min(maxVal, clampedValue));

    setLocalReqs(prev => prev.map(req => {
      if (req.class_id === classId && req.subject_id === subjectId) {
        return { ...req, periods_per_week: clampedValue };
      }
      return req;
    }));
  };

  // Remove a subject from a class requirement
  const removeSubjectRequirement = (classId: number, subjectId: number) => {
    setLocalReqs(prev => prev.filter(req => !(req.class_id === classId && req.subject_id === subjectId)));
  };

  // Add a subject requirement to a class
  const addSubjectRequirement = (classId: number, subjectId: number) => {
    // Check if already exists
    if (localReqs.some(req => req.class_id === classId && req.subject_id === subjectId)) {
      return;
    }
    setLocalReqs(prev => [...prev, {
      class_id: classId,
      subject_id: subjectId,
      periods_per_week: 1
    }]);
  };

  // Calculate stats per class
  const classStats = useMemo(() => {
    const stats: Record<number, { total: number; overLimit: boolean; overLimitBy: number }> = {};
    selectedClassIds.forEach(classId => {
      const reqs = localReqs.filter(r => r.class_id === classId);
      const total = reqs.reduce((sum, r) => sum + r.periods_per_week, 0);
      const overLimit = total > maxAllowedSlots;
      const overLimitBy = total - maxAllowedSlots;

      stats[classId] = { total, overLimit, overLimitBy };
    });
    return stats;
  }, [localReqs, selectedClassIds, maxAllowedSlots]);

  // Overall check if Save & Continue can be clicked (Only block if total slots exceed maxAllowedSlots)
  const isFormValid = useMemo(() => {
    return Object.values(classStats).every(stat => !stat.overLimit);
  }, [classStats]);

  // Count how many subjects have no teacher assigned
  const subjectsWithNoTeacherCount = useMemo(() => {
    return localReqs.filter(r => getTeacherCapacity(r.subject_id) === 0).length;
  }, [localReqs, getTeacherCapacity]);

  const handleSaveAndContinue = async () => {
    // Double check blocking validations
    for (const classId of selectedClassIds) {
      const stat = classStats[classId];
      const cls = getClassDetail(classId);
      const className = cls ? `${cls.class_name}-${cls.division}` : `Class #${classId}`;

      if (stat.overLimit) {
        toast.error(`Class ${className} is over the slot limit by ${stat.overLimitBy} periods!`);
        document.getElementById(`class-card-${classId}`)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Warn if all requirements are suspiciously set to 1 but DB had higher values
    const allAreOne = localReqs.length > 0 && localReqs.every(r => r.periods_per_week === 1);
    const dbHadHigherValues = initialDbReqs.some(r => r.periods_per_week > 1);
    if (allAreOne && dbHadHigherValues) {
      const confirmed = window.confirm(
        'Warning: All subjects show 1 period/week, but your saved configuration had higher values.\n\n'
        + 'This could mean the requirements were not loaded correctly.\n'
        + 'Click OK to save anyway, or Cancel to review your settings.'
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      // Find deleted entries
      initialDbReqs.forEach(initial => {
        const stillExists = localReqs.some(l => l.class_id === initial.class_id && l.subject_id === initial.subject_id);
        if (!stillExists && initial.id) {
          promises.push(api.delete(`/admin/weekly-requirements/${initial.id}`));
        }
      });

      // Find created or updated entries
      localReqs.forEach(local => {
        const initial = initialDbReqs.find(i => i.class_id === local.class_id && i.subject_id === local.subject_id);
        if (initial) {
          if (initial.periods_per_week !== local.periods_per_week && initial.id) {
            promises.push(api.put(`/admin/weekly-requirements/${initial.id}`, {
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
      
      // Save state to context
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
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(err.response?.data?.detail || 'Failed to save weekly requirements to the database.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Step 3: Weekly Requirements</h2>
          <p className="text-sm text-slate-500 mt-1">Loading class standard and subject information…</p>
        </div>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="animate-spin text-blue-600 mr-3" size={28} />
          <span className="text-slate-500 font-medium">Fetching requirement settings…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8 text-center animate-in fade-in duration-300">
        <AlertCircle className="text-red-500 mx-auto mb-4 animate-bounce" size={40} />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Requirements</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors shadow">
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Fixed Info Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-150 rounded-2xl p-5 shadow-sm sticky top-16 z-20 backdrop-blur-md">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <AlertCircle className="text-blue-600 shrink-0" size={18} />
          Configuration Parameters
        </h3>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          School settings: <span className="font-bold text-slate-800">{schoolDays.length} days</span> × <span className="font-bold text-slate-800">{periodsPerDay} periods/day</span> = {schoolDays.length * periodsPerDay} slots per class. 
          {lunchPeriod !== null && ` Minus ${schoolDays.length} lunch break slots.`}
          <br />
          Maximum configurable periods: <span className="font-extrabold text-blue-700">{maxAllowedSlots} periods per class</span> (with 1 free slot reserved for scheduling algorithm flexibility).
        </p>
      </div>

      {/* Selected Classes Cards */}
      <div className="space-y-8">
        {selectedClassIds.map(classId => {
          const cls = getClassDetail(classId);
          if (!cls) return null;

          const stats = classStats[classId] || { total: 0, overLimit: false, overLimitBy: 0 };
          const classReqs = localReqs.filter(r => r.class_id === classId);
          
          // Available subjects assigned to class that aren't configured yet
          const allClassSubjects = cls.subjects || [];
          const hasZeroSubjects = allClassSubjects.length === 0;
          const availableToConfigure = allClassSubjects.filter(
            sub => !classReqs.some(req => req.subject_id === sub.id)
          );

          // Check if this class has any subject with no teacher assigned
          const classHasNoTeacherSubject = classReqs.some(r => getTeacherCapacity(r.subject_id) === 0);

          // Progress bar percentage
          const percent = Math.min(100, Math.round((stats.total / maxAllowedSlots) * 100));
          
          let progressColor = 'bg-green-500';
          if (stats.overLimit) progressColor = 'bg-red-600 animate-pulse';
          else if (percent >= 90) progressColor = 'bg-red-500';
          else if (percent >= 70) progressColor = 'bg-amber-500';

          return (
            <div
              key={classId}
              id={`class-card-${classId}`}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${
                stats.overLimit 
                  ? 'border-red-300 shadow-md ring-2 ring-red-100' 
                  : classHasNoTeacherSubject 
                    ? 'border-amber-350 shadow-xs'
                    : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-md font-bold text-slate-800">
                    Class {cls.class_name} - {cls.division}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Weekly Lectures Requirements</span>
                </div>

                {/* Progress Bar Display */}
                {!hasZeroSubjects && (
                  <div className="w-full md:w-72 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={stats.overLimit ? 'text-red-600 font-bold' : 'text-slate-600'}>
                        {stats.total} / {maxAllowedSlots} periods assigned
                      </span>
                      {stats.overLimit && (
                        <span className="text-red-600 font-bold animate-pulse">
                          ⚠ Over limit by {stats.overLimitBy}!
                        </span>
                      )}
                    </div>
                    <div className="w-full h-3 bg-slate-150 rounded-full overflow-hidden">
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
                  <div className="text-center py-10 bg-amber-50/50 rounded-xl border border-dashed border-amber-200 flex flex-col items-center justify-center p-6">
                    <AlertTriangle className="text-amber-500 mb-2" size={32} />
                    <p className="text-amber-800 text-sm font-bold">
                      ⚠ No subjects assigned to Class {cls.class_name}-{cls.division}.
                    </p>
                    <p className="text-amber-605 text-xs mt-1">
                      Go to Admin → Class Management to assign subjects first.
                    </p>
                  </div>
                ) : (
                  <>
                    {classHasNoTeacherSubject && (
                      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 animate-in fade-in">
                        <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                        <span className="text-xs font-semibold text-amber-700">
                          ⚠ Some subjects have no teacher assigned. Assign teachers in Admin → All Teachers before generating.
                        </span>
                      </div>
                    )}

                    {classReqs.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm">No subject requirements configured.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-150">
                            <tr>
                              <th className="px-4 py-3">Subject Name</th>
                              <th className="px-4 py-3 text-center">Periods/Week</th>
                              <th className="px-4 py-3 text-center">Max Allowed</th>
                              <th className="px-4 py-3">Teacher Capacity</th>
                              <th className="px-4 py-3 text-center">Status</th>
                              <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {classReqs.map(req => {
                              const sub = getSubjectDetail(req.subject_id);
                              if (!sub) return null;
                              const capacity = getTeacherCapacity(req.subject_id);
                              const isNoTeacher = capacity === 0;
                               
                              // Stepper max constraint
                              const maxVal = capacity > 0 ? Math.min(schoolDays.length, capacity) : schoolDays.length;
      
                              // Determine Status Icon
                              let statusIcon = (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                                  <CheckCircle2 size={11} className="text-emerald-500" />
                                  Valid
                                </span>
                              );
                              
                              const isInvalid = req.periods_per_week > schoolDays.length || req.periods_per_week < 1;

                              if (isInvalid) {
                                statusIcon = (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200 shadow-xs">
                                    <AlertCircle size={11} className="text-red-500 animate-pulse" />
                                    Invalid
                                  </span>
                                );
                              } else if (isNoTeacher) {
                                statusIcon = (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs animate-pulse">
                                    <AlertTriangle size={11} className="text-amber-500" />
                                    No Teacher
                                  </span>
                                );
                              } else if (capacity < 2 * req.periods_per_week) {
                                statusIcon = (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                                    <AlertTriangle size={11} className="text-amber-500" />
                                    Tight
                                  </span>
                                );
                              }
      
                              return (
                                <tr 
                                  key={req.subject_id} 
                                  className={`hover:bg-slate-50/40 transition-colors ${
                                    isInvalid 
                                      ? 'border-l-4 border-l-red-500 bg-red-50/10' 
                                      : isNoTeacher 
                                        ? 'border-l-4 border-l-amber-500 bg-amber-50/10' 
                                        : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 font-semibold text-slate-800">
                                    {sub.subject_name}
                                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{sub.code}</span>
                                  </td>
                                  
                                  {/* Periods Input with Stepper */}
                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => updatePeriods(classId, req.subject_id, req.periods_per_week - 1)}
                                        disabled={req.periods_per_week <= 1}
                                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg flex items-center justify-center transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                                          updatePeriods(classId, req.subject_id, val);
                                        }}
                                        className="w-12 h-7 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updatePeriods(classId, req.subject_id, req.periods_per_week + 1)}
                                        disabled={req.periods_per_week >= maxVal}
                                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg flex items-center justify-center transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="text-[9px] text-slate-400 block mt-1">max: {maxVal}/week</span>
                                  </td>
      
                                  <td className="px-4 py-3 text-center text-xs font-semibold text-slate-500">
                                    ≤ {schoolDays.length}/week
                                  </td>
      
                                  {/* Teacher Capacity Info */}
                                  <td className="px-4 py-3">
                                    {isNoTeacher ? (
                                      <span className="text-xs text-amber-650 font-bold flex items-center gap-1">
                                        ⚠ No teacher for this subject
                                      </span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <span className={`text-xs font-semibold ${
                                          capacity < req.periods_per_week ? 'text-red-500 font-bold' : 'text-green-600'
                                        }`}>
                                          {capacity} periods available
                                        </span>
                                        {capacity < req.periods_per_week && (
                                          <p className="text-[10px] text-red-500 font-semibold leading-tight mt-0.5">
                                            Only {capacity} periods possible with available teachers
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </td>
      
                                  {/* Status Badge */}
                                  <td className="px-4 py-3 text-center">
                                    {statusIcon}
                                  </td>
      
                                  {/* Row delete */}
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeSubjectRequirement(classId, req.subject_id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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

              {/* Card Footer: Add Subject Dropdown */}
              {!hasZeroSubjects && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center animate-in fade-in">
                  {availableToConfigure.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Add subject requirement:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addSubjectRequirement(classId, Number(e.target.value));
                            e.target.value = ''; // Reset select
                          }
                        }}
                        className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
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
                      All subjects assigned to this class are already configured in requirements.
                  </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save / Back Actions */}
      <div className="space-y-4">
        {subjectsWithNoTeacherCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in slide-in-from-bottom-2">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-amber-800">Warning: Unassigned Teachers</h4>
              <p className="text-xs text-amber-700 mt-0.5 font-medium leading-relaxed">
                Warning: {subjectsWithNoTeacherCount} subject{subjectsWithNoTeacherCount !== 1 ? 's have' : ' has'} no teacher assigned. 
                The solver may fail. Assign teachers first for best results.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-8 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <button
            onClick={onPrev}
            disabled={saving}
            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
          >
            Back
          </button>

          <button
            onClick={handleSaveAndContinue}
            disabled={!isFormValid || saving || saved}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all ${
              !isFormValid || saving || saved
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                : saved
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow'
            }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <span className="text-white font-extrabold font-sans">✓</span>
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
