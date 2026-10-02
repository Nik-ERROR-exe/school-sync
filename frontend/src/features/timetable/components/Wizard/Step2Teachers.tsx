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
        } catch (err: any) {
          setError('Failed to load classes.');
          setLoading(false);
        }
      } else {
        fetchData();
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Step 2: Select Teachers</h2>
        </div>
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <AlertCircle className="text-red-500 mb-4" size={40} />
          <p className="text-red-600 font-semibold mb-2">Failed to load data</p>
          <p className="text-slate-500 text-sm max-w-md mb-6">{error}</p>
          <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors shadow">
            Retry
          </button>
        </div>
        <div className="flex justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onPrev} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 2: Select Teachers</h2>
        <p className="text-sm text-slate-500 mt-1">Choose which teachers and class will participate in this timetable generation.</p>
      </div>

      {/* Diagnostic Banner for Step 2 issues */}
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
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
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

        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-2">
          <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block">PT (Physical Training) Subject *</label>
          <select
            value={ptSubjectId ?? ''}
            onChange={(e) => {
              setPtSubjectId(e.target.value ? Number(e.target.value) : null);
              setValidationErrors([]);
            }}
            className="w-full md:w-80 bg-white border border-amber-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
          >
            <option value="">— Select PT Subject —</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.subject_name} ({s.code})</option>
            ))}
          </select>
          <p className="text-xs text-amber-700">The solver treats PT differently — multiple classes can share the ground period.</p>
        </div>

        {validationErrors.length > 0 && (
          <div className="space-y-1.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
            {validationErrors.map((err, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
        <button onClick={onPrev} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
          Back
        </button>
        <button onClick={handleContinue} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow">
          Save & Continue
        </button>
      </div>
    </div>
  );
}