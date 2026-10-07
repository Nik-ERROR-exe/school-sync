import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../api';
import { useWizard, WizardState, DiagnosticIssue, ApiTeacher } from '../../WizardContext';
import { Sparkles, Loader2, AlertCircle, X, ChevronRight, ArrowRight, AlertTriangle } from 'lucide-react';
import { ApiSlot } from '../../types';

interface Step4Props {
  onPrev: () => void;
  onGenerateComplete: (
    schedule: ApiSlot[],
    wizardState: WizardState,
    relaxations?: any[],
  ) => void;
}

interface TeacherChoice {
  subject_id: number;
  subject_name: string;
  teachers: ApiTeacher[];
  selectedTeacherId: number | null;
}

export default function Step4TeacherAssignment({ onPrev, onGenerateComplete }: Step4Props) {
  const { state, updateState } = useWizard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticIssues, setDiagnosticIssues] = useState<DiagnosticIssue[]>([]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherChoices, setTeacherChoices] = useState<TeacherChoice[]>([]);
  const [allTeachers, setAllTeachers] = useState<ApiTeacher[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [overflowWarning, setOverflowWarning] = useState<{
    code: string;
    message: string;
    teachers: Array<{
      teacher_id: number;
      teacher_name: string;
      demand: number;
      capacity?: number;
      soft_cap?: number;
    }>;
  } | null>(null);

  useEffect(() => {
    const fetchClassList = async () => {
      try {
        const res = await api.get('/admin/classes/');
        setAllClasses(res.data);
      } catch {
        // silent
      }
    };
    fetchClassList();
  }, []);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const [teachersRes, classesRes] = await Promise.all([
          api.get('/admin/teachers/'),
          api.get('/admin/classes/'),
        ]);
        const activeTeachers = (teachersRes.data as ApiTeacher[]).filter((t: ApiTeacher) => t.status === 'ACTIVE');
        setAllTeachers(activeTeachers);

        if (state.selectedClassId) {
          const allClasses = classesRes.data;
          const cls = allClasses.find((c: any) => c.id === state.selectedClassId);
          const classSubjects = cls?.subjects || [];

          let classTeacherMappings: Record<number, number[]> = {};
          try {
            const mapRes = await api.get(`/admin/classes/${state.selectedClassId}/subjects`);
            const mappings = mapRes.data;
            classTeacherMappings = {};
            for (const item of mappings) {
              const subjId = Number(item.subject_id);
              const teacherId = Number(item.teacher_id);
              if (!classTeacherMappings[subjId]) {
                classTeacherMappings[subjId] = [];
              }
              classTeacherMappings[subjId].push(teacherId);
            }
          } catch {
            for (const teacher of activeTeachers) {
              try {
                const csRes = await api.get(`/admin/teachers/${teacher.id}/class-subjects`);
                const classSubjs = csRes.data.filter((item: any) => item.class_id === state.selectedClassId);
                for (const item of classSubjs) {
                  const subjId = Number(item.subject_id);
                  if (!classTeacherMappings[subjId]) {
                    classTeacherMappings[subjId] = [];
                  }
                  if (!classTeacherMappings[subjId].includes(teacher.id)) {
                    classTeacherMappings[subjId].push(teacher.id);
                  }
                }
              } catch {
                // skip
              }
            }
          }

          const choices: TeacherChoice[] = [];
          for (const sub of classSubjects) {
            const subjId = Number(sub.id);
            const mappedTeacherIds = classTeacherMappings[subjId] || [];
            const qualifiedTeachers = activeTeachers.filter((t: ApiTeacher) =>
              mappedTeacherIds.includes(t.id)
            );
            if (qualifiedTeachers.length > 1) {
              choices.push({
                subject_id: subjId,
                subject_name: sub.subject_name,
                teachers: qualifiedTeachers,
                selectedTeacherId: qualifiedTeachers[0].id,
              });
            }
          }
          setTeacherChoices(choices);
        }
      } catch {
        // silent
      }
    };
    fetchTeacherData();
  }, [state.selectedClassId, allTeachers]);

  const classesForGeneration = useMemo(() => {
    if (state.generateMode === 'single') {
      const targetClass = allClasses.find((c: any) => c.id === state.selectedClassId);
      return targetClass ? [{
        id: targetClass.id,
        class_name: targetClass.class_name,
        division: targetClass.division,
      }] : [];
    }
    const range = state.generateMode === 'primary' ? [1, 2, 3, 4] : [5, 6, 7, 8, 9, 10];
    return allClasses
      .filter((c: any) => range.includes(Number(c.class_name)))
      .map((c: any) => ({
        id: c.id,
        class_name: c.class_name,
        division: c.division,
      }));
  }, [state.generateMode, allClasses, state.selectedClassId]);

  const handleGenerate = async (overrides?: {
    relax_teacher_caps?: boolean;
    allow_gaps?: boolean;
  }) => {
    if (!state.ptSubjectId) {
      setError("PT Subject is not selected. Go back to Step 2 and select the PT subject.");
      return;
    }
    if (state.generateMode === 'single' && !state.selectedClassId) {
      setError("No class selected. Go back to Step 2 and select a class.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setDiagnosticIssues([]);
    updateState({ diagnosticIssues: [] });

    try {
      if (state.generateMode === 'single') {
        const hasReq = state.weeklyRequirements.some(r => r.class_id === state.selectedClassId && r.periods_per_week > 0);
        if (!hasReq) {
          const cls = allClasses.find((c: any) => c.id === state.selectedClassId);
          const className = cls ? `${cls.class_name}-${cls.division}` : `#${state.selectedClassId}`;
          setError(`Class ${className} has no weekly requirements configured. Go back to Step 3.`);
          setIsGenerating(false);
          return;
        }
      }

      if (classesForGeneration.length === 0) {
        setError('No classes found for the selected group. Check that classes exist in Class Management.');
        setIsGenerating(false);
        return;
      }

      const body: any = {
        school_days: state.schoolDays,
        saturday_periods: state.saturdayPeriods,
        pt_subject_id: state.ptSubjectId,
        classes: classesForGeneration,
        periods_per_day: state.periodsPerDay,
        lunch_period: state.lunchPeriod,
        start_time: state.startTime,
        period_minutes: state.periodMinutes,
        lunch_minutes: state.lunchMinutes,
        ...(overrides || {}),
      };

      if (state.generateMode === 'single' && teacherChoices.length > 0) {
        body.subject_teacher_assignments = {};
        for (const choice of teacherChoices) {
          if (choice.selectedTeacherId) {
            body.subject_teacher_assignments[`${state.selectedClassId}_${choice.subject_id}`] = choice.selectedTeacherId;
          }
        }
      }

      const response = await api.post('/admin/timetable/generate', body, { timeout: 300000 });

      localStorage.setItem('school_days', JSON.stringify(state.schoolDays));
      localStorage.setItem('saturday_periods', String(state.saturdayPeriods));
      localStorage.setItem('pt_subject_id', state.ptSubjectId !== null ? String(state.ptSubjectId) : '');
      localStorage.setItem('selected_class_id', state.selectedClassId ? String(state.selectedClassId) : '');

      onGenerateComplete(
        response.data.schedule,
        state,
        response.data.relaxations || [],
      );
    } catch (err: any) {
      console.error('Generate error:', err.response?.data || err.message);
      if (err?.code === 'ECONNABORTED' && String(err?.message || '').includes('timeout')) {
        setError('Timetable generation is taking too long (over 5 minutes). This usually means the constraints are very tight or too many classes are being generated at once. Try a smaller group or resolve teacher overloading first.');
      } else {
        const detail = err.response?.data?.detail;

        if (
          detail &&
          typeof detail === 'object' &&
          !Array.isArray(detail) &&
          (detail.code === 'PHYSICAL_OVERFLOW' || detail.code === 'SOFT_OVERFLOW')
        ) {
          setOverflowWarning({
            code: detail.code,
            message:
              typeof detail.message === 'string'
                ? detail.message
                : 'Timetable requires relaxed constraints.',
            teachers: Array.isArray(detail.teachers) ? detail.teachers : [],
          });
          setError(null);
          setDiagnosticIssues([]);
        } else {
          let errorMessage =
            'Timetable generation failed. Please go back and adjust your settings.';
          let issues: DiagnosticIssue[] = [];

          if (typeof detail === 'string') {
            errorMessage = detail;
          } else if (detail && Array.isArray(detail.issues)) {
            errorMessage =
              typeof detail.message === 'string' ? detail.message : errorMessage;
            issues = detail.issues;
          } else if (Array.isArray(detail)) {
            errorMessage = detail.map((d: any) => d.msg || d).join('; ');
          } else if (
            detail &&
            typeof detail === 'object' &&
            typeof detail.message === 'string'
          ) {
            errorMessage = detail.message;
            if (Array.isArray(detail.issues)) {
              issues = detail.issues;
            }
          } else if (typeof err.message === 'string') {
            errorMessage = err.message;
          }

          setError(errorMessage);
          setDiagnosticIssues(issues);
          if (issues.length > 0) {
            updateState({ diagnosticIssues: issues });
          }
        }
      }
      setIsGenerating(false);
    }
  };

  const handleTeacherModalConfirm = () => {
    setShowTeacherModal(false);
    updateState({});
  };

  return (
    <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border border-slate-200 dark:border-[#253044] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900 dark:text-slate-100 font-sans">
      <div className="px-8 py-6 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50">
        <h2 className="text-lg font-bold">Step 5: Generate Timetable</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ready to run the automated scheduler engine.</p>
      </div>

      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center mb-6 border-8 border-blue-100/50 dark:border-blue-900/30">
          <Sparkles className="text-blue-600 dark:text-blue-400" size={32} />
        </div>

        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">All Set!</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4 leading-relaxed text-sm">
          The constraint-satisfaction solver will analyze all configured classes, teachers, and weekly requirements to generate the optimal timetable.
        </p>

        {/* Generation config summary */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-8">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">
            {state.schoolDays.length} days
          </span>
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">
            {state.periodsPerDay} periods/day
          </span>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.generateMode === 'single' ? '1 class selected' :
             state.generateMode === 'primary' ? `${classesForGeneration.length} classes (1–4)` :
             `${classesForGeneration.length} classes (5–10)`}
          </span>
          {state.lunchPeriod && (
            <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">
              Lunch: P{state.lunchPeriod}
            </span>
          )}
        </div>

        {/* Teacher assignment prompt */}
        {teacherChoices.length > 0 && !showTeacherModal && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 max-w-lg text-left">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Some subjects have multiple teachers assigned.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Click below to choose which teacher should teach each subject for this class.
            </p>
            <button
              onClick={() => setShowTeacherModal(true)}
              className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Choose Teachers
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-xl text-left mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-sm font-medium px-5 py-4 rounded-xl">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Generation Failed</p>
                <p>{error}</p>
              </div>
            </div>

            {diagnosticIssues.length > 0 && (() => {
              const stepNames: Record<number, string> = {
                1: 'School Settings',
                2: 'Teachers & Classes',
                3: 'Weekly Requirements',
              };
              const grouped: Record<number, DiagnosticIssue[]> = {};
              diagnosticIssues.forEach(issue => {
                if (!grouped[issue.step]) grouped[issue.step] = [];
                grouped[issue.step].push(issue);
              });
              const sortedSteps = Object.keys(grouped).map(Number).sort((a, b) => a - b);

              return (
                <div className="bg-white dark:bg-[#10151F] border border-rose-200 dark:border-rose-800/60 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                    <p className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                      {diagnosticIssues.length} Issue{diagnosticIssues.length !== 1 ? 's' : ''} Found — Fix to Continue
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-[#253044]">
                    {sortedSteps.map(stepNum => (
                      <div key={stepNum}>
                        <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-[#161D29]/70 flex items-center gap-2 border-b border-slate-100 dark:border-[#253044]">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {stepNum}
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Step {stepNum}: {stepNames[stepNum] || `Step ${stepNum}`}
                          </span>
                          <span className="ml-auto text-[10px] font-semibold text-slate-400">
                            {grouped[stepNum].length} issue{grouped[stepNum].length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {grouped[stepNum].map((issue, idx) => (
                          <div key={idx} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                              issue.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{issue.message}</p>
                              {issue.suggestion && (
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-1.5 flex items-start gap-1">
                                  <AlertTriangle size={11} className="shrink-0 mt-0.5 text-amber-500" />
                                  {issue.suggestion}
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  const goToStep = (window as any).__wizardGoToStep;
                                  if (goToStep) goToStep(issue.redirect_step || issue.step);
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                              >
                                Fix Now
                                <ArrowRight size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-base font-bold text-white shadow-md transition-all cursor-pointer ${
            isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          {isGenerating ? 'Generating Timetable…' : 'Generate Timetable'}
        </button>

        {isGenerating && (
          <p className="text-xs text-slate-400 mt-4 animate-pulse">
            This may take up to 3 minutes for large groups. Please do not close this tab.
          </p>
        )}
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 dark:border-[#253044] bg-slate-50 dark:bg-[#161D29]">
        <button
          onClick={onPrev}
          disabled={isGenerating}
          className="bg-white dark:bg-[#10151F] border border-slate-200 dark:border-[#253044] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          Back
        </button>
      </div>

      {/* Teacher Assignment Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col border border-slate-200 dark:border-[#253044] text-slate-900 dark:text-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Select Teachers per Subject</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose which teacher should teach each subject.</p>
              </div>
              <button onClick={() => setShowTeacherModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {teacherChoices.map((choice) => (
                <div key={choice.subject_id} className="border border-slate-200 dark:border-[#253044] rounded-xl p-4 bg-slate-50/50 dark:bg-[#161D29]/50">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                    {choice.subject_name}
                  </label>
                  <select
                    value={choice.selectedTeacherId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setTeacherChoices(prev => prev.map(c =>
                        c.subject_id === choice.subject_id ? { ...c, selectedTeacherId: val } : c
                      ));
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-[#253044] p-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#10151F] focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
                  >
                    {choice.teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.teacher_id || `#${teacher.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#253044] bg-slate-50 dark:bg-[#161D29] flex justify-end">
              <button
                onClick={handleTeacherModalConfirm}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 px-5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
              >
                Confirm
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {overflowWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-amber-200 bg-amber-50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-amber-900">
                    {overflowWarning.code === 'PHYSICAL_OVERFLOW'
                      ? 'Teacher capacity exceeded'
                      : 'Teacher daily cap exceeded'}
                  </h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {overflowWarning.code === 'PHYSICAL_OVERFLOW'
                      ? 'These teachers are scheduled for more weekly periods than slots exist. Proceeding will leave some periods unfilled.'
                      : 'These teachers exceed their configured daily soft cap. Proceeding will relax their caps.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOverflowWarning(null)}
                className="p-1 hover:bg-amber-100 rounded-lg transition-colors shrink-0"
              >
                <X size={18} className="text-amber-700" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-2">Teacher</th>
                    <th className="text-right pb-2">Demand/week</th>
                    <th className="text-right pb-2">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overflowWarning.teachers.map((t) => (
                    <tr key={t.teacher_id}>
                      <td className="py-2 font-semibold text-slate-800">
                        {t.teacher_name}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-700">
                        {t.demand}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-500">
                        {t.capacity ?? t.soft_cap ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  {overflowWarning.message}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setOverflowWarning(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setOverflowWarning(null);
                  handleGenerate({
                    allow_gaps: true,
                    relax_teacher_caps: true,
                  });
                }}
                className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}