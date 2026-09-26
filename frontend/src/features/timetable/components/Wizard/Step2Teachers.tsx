import React, { useEffect, useState } from 'react';
import api from '../../../../api';
import { useWizard, ApiTeacher, ApiSubject } from '../../WizardContext';
import { Loader2, AlertCircle, Search } from 'lucide-react';
import { ApiClass } from '../../types';
import DiagnosticBanner from './DiagnosticBanner';

export default function Step2Teachers({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  const { state, updateState } = useWizard();

  const [teachers, setTeachers] = useState<ApiTeacher[]>(state._teachersCache);
  const [subjects, setSubjects] = useState<ApiSubject[]>(state._subjectsCache);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(state.selectedTeacherIds));
  const [selectedClassId, setSelectedClassId] = useState<number | null>(state.selectedClassId);
  const [ptSubjectId, setPtSubjectId] = useState<number | null>(state.ptSubjectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [teacherClassMap, setTeacherClassMap] = useState<Record<number, Set<number>>>({});

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

      const activeTeachers = fetchedTeachers.filter(t => t.status === 'ACTIVE');
      setTeachers(activeTeachers);
      setSubjects(fetchedSubjects);
      setClasses(fetchedClasses);

      const map: Record<number, Set<number>> = {};
      await Promise.all(activeTeachers.map(async (t) => {
        try {
          const res = await api.get(`/admin/teachers/${t.id}/class-subjects`);
          const classIds = res.data.map((item: any) => item.class_id);
          map[t.id] = new Set(classIds);
        } catch { map[t.id] = new Set(); }
      }));
      setTeacherClassMap(map);

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
        setTeachers(state._teachersCache);
        setSubjects(state._subjectsCache);
        try {
          const classesRes = await api.get('/admin/classes/');
          setClasses(classesRes.data);
          const map: Record<number, Set<number>> = {};
          await Promise.all(state._teachersCache.map(async (t: ApiTeacher) => {
            try {
              const res = await api.get(`/admin/teachers/${t.id}/class-subjects`);
              const classIds = res.data.map((item: any) => item.class_id);
              map[t.id] = new Set(classIds);
            } catch { map[t.id] = new Set(); }
          }));
          setTeacherClassMap(map);
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

  const toggleTeacher = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setValidationErrors([]);
  };

  const selectClass = (id: number | null) => {
    setSelectedClassId(id);
    setValidationErrors([]);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredTeachers.map(t => t.id)));
    setValidationErrors([]);
  };
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const getSubjectName = (subjectId: number) => {
    return subjects.find(s => s.id === subjectId)?.subject_name ?? `#${subjectId}`;
  };

  const teachersVisible = teachers.filter(t => {
    const matchesSearch = !searchQuery || (
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.teacher_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!selectedClassId) return matchesSearch;

    const teacherClasses = teacherClassMap[t.id];
    if (!teacherClasses || teacherClasses.size === 0) return false;

    return matchesSearch && teacherClasses.has(selectedClassId);
  });

  const filteredTeachers = teachersVisible;

  const handleContinue = () => {
    const errors: string[] = [];
    if (selectedClassId === null) {
      errors.push('Please select one class for this timetable.');
    }
    if (selectedIds.size === 0) {
      errors.push('At least 1 teacher must be selected.');
    }
    if (ptSubjectId === null) {
      errors.push('PT Subject must be selected.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    updateState({
      selectedClassId,
      selectedTeacherIds: Array.from(selectedIds),
      ptSubjectId,
    });
    onNext();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#10151F] rounded-2xl shadow-sm border border-slate-200 dark:border-[#253044] overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-[#253044] bg-slate-50/50 dark:bg-[#161D29]/50">
          <h2 className="text-lg font-bold">Step 2: Select Teachers & Classes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Loading teachers and subjects from the database…</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-center py-12 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span className="text-sm font-medium">Fetching active teachers...</span>
          </div>
        </div>
      </div>
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

  const hasTeachersWithNoSubjects = teachers.some(t => !t.subject_expertise || t.subject_expertise.length === 0);

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
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Select Class for This Timetable *
          </label>
          <div className="flex flex-wrap gap-2">
            {classes.map(cls => {
              const isSelected = selectedClassId === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
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

        {hasTeachersWithNoSubjects && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-sm px-4 py-3 rounded-lg">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
            <div>
              Some teachers have no subjects assigned. Go to <a href="/admin/teachers" className="underline font-bold text-blue-600 dark:text-blue-400">Admin → Teachers</a> to assign subjects.
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search teachers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#161D29] border border-slate-200 dark:border-[#253044] text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button onClick={selectAll} className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-2 rounded-lg transition-colors cursor-pointer">
            Select All
          </button>
          <button onClick={deselectAll} className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#161D29] hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors cursor-pointer">
            Deselect All
          </button>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-auto">
            {selectedIds.size} of {filteredTeachers.length} selected
          </span>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {filteredTeachers.length === 0 && (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
              {selectedClassId ? 'No teachers assigned to the selected class.' : 'No teachers match your search.'}
            </p>
          )}
          {filteredTeachers.map(teacher => {
            const isSelected = selectedIds.has(teacher.id);
            return (
              <label
                key={teacher.id}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 shadow-sm'
                    : 'bg-white dark:bg-[#10151F] border-slate-200 dark:border-[#253044] hover:bg-slate-50 dark:hover:bg-[#161D29]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTeacher(teacher.id)}
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{teacher.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{teacher.teacher_id || `ID:${teacher.id}`}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {teacher.subject_expertise && teacher.subject_expertise.length > 0 ? (
                      teacher.subject_expertise.map(subId => (
                        <span key={subId} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {getSubjectName(subId)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No subjects assigned</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Max/Day</div>
                  <div className="text-lg font-extrabold text-slate-700 dark:text-slate-200">{teacher.max_lectures_per_day}</div>
                </div>
              </label>
            );
          })}
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