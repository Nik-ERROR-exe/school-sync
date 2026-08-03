import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../api';
import { useWizard, WizardState, DiagnosticIssue, ApiTeacher } from '../../WizardContext';
import { Sparkles, Loader2, AlertCircle, X, ChevronRight, ArrowRight, AlertTriangle } from 'lucide-react';
import { ApiSlot } from '../../types';

interface Step4Props {
  onPrev: () => void;
  onGenerateComplete: (schedule: ApiSlot[], wizardState: WizardState) => void;
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

          // Fetch teacher-class-subject mappings for this class
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
            // Fallback: use teacher_class_subjects endpoint
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

  const handleGenerate = async () => {
    if (!state.ptSubjectId) {
      setError("PT Subject is not selected. Go back to Step 2 and select the PT subject.");
      return;
    }
    if (!state.selectedClassId) {
      setError("No class selected. Go back to Step 1 and select a class.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setDiagnosticIssues([]);
    updateState({ diagnosticIssues: [] });

    try {
      const classesRes = await api.get('/admin/classes/');
      const allClasses = classesRes.data;

      const hasReq = state.weeklyRequirements.some(r => r.class_id === state.selectedClassId && r.periods_per_week > 0);
      if (!hasReq) {
        const cls = allClasses.find((c: any) => c.id === state.selectedClassId);
        const className = cls ? `${cls.class_name}-${cls.division}` : `#${state.selectedClassId}`;
        setError(`Class ${className} has no weekly requirements configured. Go back to Step 3.`);
        setIsGenerating(false);
        return;
      }

      const targetClass = allClasses.find((c: any) => c.id === state.selectedClassId);
      const targetClasses = targetClass ? [{
        id: targetClass.id,
        class_name: targetClass.class_name,
        division: targetClass.division
      }] : [];

      const body: any = {
        school_days: state.schoolDays,
        periods_per_day: state.periodsPerDay,
        lunch_period: state.lunchPeriod,
        pt_subject_id: state.ptSubjectId,
        classes: targetClasses,
      };

      if (teacherChoices.length > 0) {
        body.subject_teacher_assignments = {};
        for (const choice of teacherChoices) {
          if (choice.selectedTeacherId) {
            body.subject_teacher_assignments[`${state.selectedClassId}_${choice.subject_id}`] = choice.selectedTeacherId;
          }
        }
      }

      const response = await api.post('/admin/timetable/generate', body, { timeout: 25000 });

      localStorage.setItem('school_days', JSON.stringify(state.schoolDays));
      localStorage.setItem('periods_per_day', String(state.periodsPerDay));
      localStorage.setItem('saturday_periods', String(state.saturdayPeriods));
      localStorage.setItem('start_time', state.startTime);
      localStorage.setItem('period_duration', String(state.periodDuration));
      localStorage.setItem('lunch_period', state.lunchPeriod !== null ? String(state.lunchPeriod) : '');
      localStorage.setItem('pt_subject_id', state.ptSubjectId !== null ? String(state.ptSubjectId) : '');
      localStorage.setItem('selected_class_id', state.selectedClassId ? String(state.selectedClassId) : '');

      onGenerateComplete(response.data.schedule, state);
    } catch (err: any) {
      console.error('Generate error:', err.response?.data || err.message);
      if (err?.code === 'ECONNABORTED' && String(err?.message || '').includes('timeout')) {
        setError('Timetable generation timed out after 25 seconds. Try selecting fewer classes or loosening teacher/subject constraints.');
      } else {
        const detail = err.response?.data?.detail;
        let errorMessage = 'Timetable generation failed. Please go back and adjust your settings.';
        let issues: DiagnosticIssue[] = [];

        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (detail && Array.isArray(detail.issues)) {
          errorMessage = typeof detail.message === 'string' ? detail.message : errorMessage;
          issues = detail.issues;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg || d).join('; ');
        } else if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
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
      setIsGenerating(false);
    }
  };

  const handleTeacherModalConfirm = () => {
    setShowTeacherModal(false);
    updateState({});
  };

  const selectedClass = useMemo(() => {
    return state._teachersCache.length > 0 ? null : null;
  }, [state._teachersCache, state.selectedClassId]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 4: Generate Timetable</h2>
        <p className="text-sm text-slate-500 mt-1">Ready to run the automated scheduler engine.</p>
      </div>

      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 border-8 border-blue-100/50">
          <Sparkles className="text-blue-600" size={32} />
        </div>

        <h3 className="text-2xl font-extrabold text-slate-900 mb-3">All Set!</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
          The constraint-satisfaction solver will analyze all configured classes, teachers, and weekly requirements to generate the optimal timetable.
        </p>

        {/* Generation config summary */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.schoolDays.length} days
          </span>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.periodsPerDay} periods/day
          </span>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            1 class selected
          </span>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.selectedTeacherIds.length} teachers
          </span>
          {state.lunchPeriod && (
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Lunch: P{state.lunchPeriod}
            </span>
          )}
        </div>

        {/* Teacher assignment prompt */}
        {teacherChoices.length > 0 && !showTeacherModal && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-lg text-left">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Some subjects have multiple teachers assigned.
            </p>
            <p className="text-xs text-amber-700">
              Click below to choose which teacher should teach each subject for this class.
            </p>
            <button
              onClick={() => setShowTeacherModal(true)}
              className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              Choose Teachers
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-xl text-left mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-5 py-4 rounded-xl">
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
              // Group issues by step
              const grouped: Record<number, DiagnosticIssue[]> = {};
              diagnosticIssues.forEach(issue => {
                if (!grouped[issue.step]) grouped[issue.step] = [];
                grouped[issue.step].push(issue);
              });
              const sortedSteps = Object.keys(grouped).map(Number).sort((a, b) => a - b);

              return (
                <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider">
                      {diagnosticIssues.length} Issue{diagnosticIssues.length !== 1 ? 's' : ''} Found — Fix to Continue
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {sortedSteps.map(stepNum => (
                      <div key={stepNum}>
                        {/* Step group header */}
                        <div className="px-5 py-2.5 bg-slate-50/70 flex items-center gap-2 border-b border-slate-100">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {stepNum}
                          </div>
                          <span className="text-xs font-bold text-slate-700">
                            Step {stepNum}: {stepNames[stepNum] || `Step ${stepNum}`}
                          </span>
                          <span className="ml-auto text-[10px] font-semibold text-slate-400">
                            {grouped[stepNum].length} issue{grouped[stepNum].length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Issues in this step */}
                        {grouped[stepNum].map((issue, idx) => (
                          <div key={idx} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                            <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                              issue.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 leading-relaxed">{issue.message}</p>
                              {issue.suggestion && (
                                <p className="text-xs text-blue-700 font-semibold mt-1.5 flex items-start gap-1">
                                  <AlertTriangle size={11} className="shrink-0 mt-0.5 text-amber-500" />
                                  {issue.suggestion}
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  const goToStep = (window as any).__wizardGoToStep;
                                  if (goToStep) goToStep(issue.redirect_step || issue.step);
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-all hover:shadow"
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
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg shadow-blue-600/20 transition-all ${
            isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'
          }`}
        >
          {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
          {isGenerating ? 'Generating Timetable…' : 'Generate Timetable'}
        </button>

        {isGenerating && (
          <p className="text-xs text-slate-400 mt-4 animate-pulse">
            This may take up to 30 seconds depending on the number of classes and constraints…
          </p>
        )}
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
        <button
          onClick={onPrev}
          disabled={isGenerating}
          className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
        >
          Back
        </button>
      </div>

      {/* Teacher Assignment Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Teachers per Subject</h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose which teacher should teach each subject.</p>
              </div>
              <button onClick={() => setShowTeacherModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {teacherChoices.map((choice) => (
                <div key={choice.subject_id} className="border border-slate-200 rounded-xl p-4">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
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
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
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
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={handleTeacherModalConfirm}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 py-2.5 px-5 text-xs font-bold text-white shadow-sm transition"
              >
                Confirm
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}