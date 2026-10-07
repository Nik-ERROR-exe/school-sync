import React, { useEffect, useState } from 'react';
import api from '../../../../api';
import { useWizard, ApiTeacher, ApiSubject } from '../../WizardContext';
import { AlertCircle } from 'lucide-react';
import { ApiClass } from '../../types';
import DiagnosticBanner from './DiagnosticBanner';

export default function Step2Teachers({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  const { state, updateState } = useWizard();

  const [teachers, setTeachers] = useState<ApiTeacher[]>(state._teachersCache);
  const [subjects, setSubjects] = useState<ApiSubject[]>(state._subjectsCache);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(state.selectedClassId);
  const [ptSubjectId, setPtSubjectId] = useState<number | null>(state.ptSubjectId);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generateMode, setGenerateMode] = useState<'single' | 'primary' | 'secondary'>(state.generateMode);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    try {
      const [teachersRes, subjectsRes, classesRes] = await Promise.all([
        api.get('/admin/teachers/'),
        api.get('/admin/subjects/'),
        api.get('/admin/classes/'),
      ]);
      const fetchedTeachers: ApiTeacher[] = teachersRes.data;
      const fetchedSubjects: ApiSubject[] = subjectsRes.data;
      const fetchedClasses: ApiClass[] = classesRes.data;

      const activeTeachers = fetchedTeachers.filter(
        t => t.status === 'ACTIVE' && t.role !== 'ADMIN'
      );
      setTeachers(activeTeachers);
      setSubjects(fetchedSubjects);
      setClasses(fetchedClasses);

      updateState({ _teachersCache: activeTeachers, _subjectsCache: fetchedSubjects });

      if (ptSubjectId === null) {
        const ptSub = fetchedSubjects.find(
          s => s.subject_name.toLowerCase() === 'pt' || s.code.toLowerCase() === 'pt'
        );
        if (ptSub) {
          setPtSubjectId(ptSub.id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load teachers and subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (state._teachersCache.length > 0 && state._subjectsCache.length > 0) {
        const cachedTeachers = state._teachersCache.filter(
          (t: ApiTeacher) => t.role !== 'ADMIN'
        );
        setTeachers(cachedTeachers);
        setSubjects(state._subjectsCache);
        try {
          const classesRes = await api.get('/admin/classes/');
          setClasses(classesRes.data);
          setLoading(false);
        } catch {
          setError('Failed to load classes.');
          setLoading(false);
        }
      } else {
        fetchData();
      }
    };
    initData();
  }, []);

  const selectClass = (id: number | null) => {
    setSelectedClassId(id);
    setValidationErrors([]);
  };

  const handleContinue = () => {
    const errors: string[] = [];
    if (generateMode === 'single' && selectedClassId === null) {
      errors.push('Please select one class for this timetable.');
    }
    if (ptSubjectId === null) {
      errors.push('PT Subject must be selected.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    updateState({
      generateMode,
      selectedClassId: generateMode === 'single' ? selectedClassId : null,
      ptSubjectId,
    });
    onNext();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border border-slate-200 dark:border-[#253044] overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50">
          <h2 className="text-lg font-bold">Step 2: Select Teachers & Classes</h2>
        </div>
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <AlertCircle className="text-rose-500 mb-4" size={40} />
          <p className="text-rose-600 dark:text-rose-400 font-semibold mb-2">Failed to load data</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-6">{error}</p>
          <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors">
            Retry
          </button>
        </div>
        <div className="flex justify-between px-8 py-4 border-t border-slate-100 dark:border-[#253044] bg-slate-50 dark:bg-[#161D29]">
          <button onClick={onPrev} className="bg-white dark:bg-[#10151F] border border-slate-200 dark:border-[#253044] text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border border-slate-200 dark:border-[#253044] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900 dark:text-slate-100">
      <div className="px-8 py-6 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50">
        <h2 className="text-lg font-bold">Step 2: Select Teachers & Classes</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose which teachers and class will participate in this timetable generation.</p>
      </div>

      <div className="px-8 pt-4">
        <DiagnosticBanner issues={state.diagnosticIssues} stepNumber={2} />
      </div>

      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Generation scope *
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'single', label: 'This class only' },
              { id: 'primary', label: 'Group 1–4 (all divisions)' },
              { id: 'secondary', label: 'Group 5–10 (all divisions)' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setGenerateMode(opt.id as any);
                  if (opt.id !== 'single') setSelectedClassId(null);
                  setValidationErrors([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  generateMode === opt.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Select Class for This Timetable *
          </label>
          <div className={`flex flex-wrap gap-2 ${generateMode !== 'single' ? 'opacity-40 pointer-events-none' : ''}`}>
            {classes.map(cls => {
              const isSelected = selectedClassId === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  disabled={generateMode !== 'single'}
                  onClick={() => selectClass(cls.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-[#161D29] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#253044] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {cls.class_name} - {cls.division}
                </button>
              );
            })}
          </div>
          {generateMode !== 'single' && (
            <p className="text-xs text-slate-500 -mt-1">
              Group mode: the whole group will be generated together. Individual
              class selection is disabled.
            </p>
          )}
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5 space-y-2">
          <label className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">PT (Physical Training) Subject *</label>
          <select
            value={ptSubjectId ?? ''}
            onChange={(e) => {
              setPtSubjectId(e.target.value ? Number(e.target.value) : null);
              setValidationErrors([]);
            }}
            className="w-full md:w-80 bg-white dark:bg-[#10151F] border border-amber-200 dark:border-amber-800 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          >
            <option value="">— Select PT Subject —</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.subject_name} ({s.code})</option>
            ))}
          </select>
          <p className="text-xs text-amber-700 dark:text-amber-400">The solver treats PT differently — multiple classes can share the ground period.</p>
        </div>

        {validationErrors.length > 0 && (
          <div className="space-y-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm font-medium px-4 py-3 rounded-lg">
            {validationErrors.map((err, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 dark:border-[#253044] bg-slate-50 dark:bg-[#161D29]">
        <button onClick={onPrev} className="bg-white dark:bg-[#10151F] border border-slate-200 dark:border-[#253044] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer">
          Back
        </button>
        <button onClick={handleContinue} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer">
          Save & Continue
        </button>
      </div>
    </div>
  );
}