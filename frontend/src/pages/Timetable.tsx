import React, { useState, useEffect, useCallback } from 'react';
import { WizardLayout } from '../features/timetable/components/Wizard/WizardLayout';
import TimetableGrid from '../features/timetable/components/View/TimetableGrid';
import TimetableToolbar from '../features/timetable/components/View/TimetableToolbar';
import TeacherTimetableGrid from '../features/timetable/components/View/TeacherTimetableGrid';
import { ApiSlot, ApiClass, ApiSubject, ApiTeacher } from '../features/timetable/types';
import { WizardState } from '../features/timetable/WizardContext';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Loader2, AlertCircle, Sparkles, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Admin Landing Page ─────────────────────────────────────────────────────
interface LandingPageProps {
  hasSavedTimetable: boolean;
  onStartWizard: () => void;
  onViewTimetable: () => void;
}

function AdminLandingPage({ hasSavedTimetable, onStartWizard, onViewTimetable }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      {/* Heading */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Timetable Management</h1>
        <p className="text-slate-500 mt-2 text-sm font-medium max-w-md mx-auto">
          Generate a new timetable using the wizard or view the currently saved master timetable.
        </p>
      </div>

      {/* Status Badge */}
      <div className="mb-8">
        {hasSavedTimetable ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold shadow-sm">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>✓ Timetable saved</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold">
            <Clock size={16} className="text-slate-400" />
            <span>No timetable generated yet</span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {/* Card 1: Generate */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 p-8 flex flex-col items-center text-center group">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Sparkles size={26} className="text-white" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">Generate New Timetable</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6 max-w-[260px]">
            Create a new timetable using the wizard. Configure school settings, select teachers, set weekly requirements and generate.
          </p>
          <button
            onClick={onStartWizard}
            className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
          >
            Start Wizard →
          </button>
        </div>

        {/* Card 2: View */}
        <div className={`bg-white rounded-2xl border shadow-sm p-8 flex flex-col items-center text-center transition-all duration-200 ${
          hasSavedTimetable 
            ? 'border-slate-200 hover:shadow-md hover:border-emerald-200 group' 
            : 'border-slate-100 opacity-60'
        }`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg transition-transform duration-200 ${
            hasSavedTimetable 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20 group-hover:scale-105' 
              : 'bg-slate-200 shadow-none'
          }`}>
            <CalendarDays size={26} className="text-white" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">View Saved Timetable</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6 max-w-[260px]">
            {hasSavedTimetable 
              ? 'View the currently saved master timetable. Select a class to see its schedule.'
              : 'No timetable saved yet. Generate one using the wizard first.'
            }
          </p>
          <button
            onClick={onViewTimetable}
            disabled={!hasSavedTimetable}
            className={`w-full px-5 py-2.5 font-bold text-sm rounded-xl shadow-sm transition-colors ${
              hasSavedTimetable
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {hasSavedTimetable ? 'View Timetable →' : 'No timetable saved yet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Teacher Personal View ──────────────────────────────────────────────────
interface TeacherViewProps {
  teacherName: string;
}

function TeacherTimetableView({ teacherName }: TeacherViewProps) {
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [schoolDays, setSchoolDays] = useState<string[]>(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [saturdayPeriods, setSaturdayPeriods] = useState(4);
  const [lunchPeriod, setLunchPeriod] = useState<number | null>(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeacherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slotsRes, settingsRes, subjectsRes, classesRes] = await Promise.all([
        api.get('/teacher/timetable/master'),
        api.get('/timetable/settings').catch(() => ({ data: null })),
        api.get('/teacher/subjects/').catch(() => ({ data: [] })),
        api.get('/teacher/classes/').catch(() => ({ data: [] })),
      ]);

      setSlots(slotsRes.data || []);
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);

      if (settingsRes.data) {
        const s = settingsRes.data.data || settingsRes.data;
        if (s.school_days) {
          const days = Array.isArray(s.school_days) ? s.school_days : JSON.parse(s.school_days);
          setSchoolDays(days);
          setPeriodsPerDay(s.periods_per_day ?? 8);
          setSaturdayPeriods(s.saturday_periods ?? 4);
          setLunchPeriod(s.lunch_period ?? 4);
        }
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(err);
      setError('Failed to load your timetable. Please try again or contact the admin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
        <span className="text-slate-600 font-medium">Loading Your Timetable…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Failed to Load Timetable</h2>
        <p className="text-slate-500 text-sm mb-6">{error}</p>
        <button 
          onClick={fetchTeacherData}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg text-sm shadow transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
        <CalendarDays className="text-slate-300 mb-4" size={56} />
        <h2 className="text-lg font-bold text-slate-900 mb-2">No Timetable Assigned</h2>
        <p className="text-slate-500 text-sm">
          Your timetable has not been assigned yet. Please contact the admin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <TeacherTimetableGrid
        schedule={slots}
        classes={classes}
        subjects={subjects}
        teacherName={teacherName}
        schoolDays={schoolDays}
        periodsPerDay={periodsPerDay}
        saturdayPeriods={saturdayPeriods}
        lunchPeriod={lunchPeriod}
      />
    </div>
  );
}

// ─── Main Timetable Page ────────────────────────────────────────────────────
export default function Timetable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  // ── Teacher shortcut: render teacher view directly ──
  if (isTeacher) {
    return <TeacherTimetableView teacherName={user?.name ?? 'Teacher'} />;
  }

  // ── Admin flow below ──
  return <AdminTimetableFlow />;
}

function AdminTimetableFlow() {
  const [mode, setMode] = useState<'landing' | 'wizard' | 'grid'>('landing');
  const [schedule, setSchedule] = useState<ApiSlot[]>([]);
  const [hasSavedTimetable, setHasSavedTimetable] = useState(false);
  const [wizardSettings, setWizardSettings] = useState<WizardState | null>(() => {
    const savedDays = localStorage.getItem('school_days');
    const savedSatPeriods = localStorage.getItem('saturday_periods');
    const savedPt = localStorage.getItem('pt_subject_id');
    const savedClassId = localStorage.getItem('selected_class_id');

    if (savedDays) {
      return {
        schoolDays: JSON.parse(savedDays),
        periodsPerDay: 8,
        saturdayPeriods: savedSatPeriods ? Number(savedSatPeriods) : 4,
        lunchPeriod: 4,
        selectedTeacherIds: [],
        ptSubjectId: savedPt ? Number(savedPt) : null,
        selectedClassId: savedClassId ? Number(savedClassId) : null,
        weeklyRequirements: [],
        diagnosticIssues: [],
        _teachersCache: [],
        _subjectsCache: [],
      };
    }
    return null;
  });

  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [teachers, setTeachers] = useState<ApiTeacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewClassId, setViewClassId] = useState<number | null>(null);

  // Fetch classes, subjects, teachers, and saved timetable on mount
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleRes, classesRes, subjectsRes, teachersRes, settingsRes] = await Promise.all([
        api.get('/admin/timetable/'),
        api.get('/admin/classes/'),
        api.get('/admin/subjects/'),
        api.get('/admin/teachers/'),
        api.get('/admin/timetable/settings').catch(() => ({ data: null })), // don't fail if no settings yet
      ]);

      const loadedSchedule = scheduleRes.data.schedule || [];
      setSchedule(loadedSchedule);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);

      // If settings exist in DB, use them (overrides localStorage)
      if (settingsRes.data && settingsRes.data.school_days) {
        const s = settingsRes.data;
        setWizardSettings(prev => ({
          ...(prev ?? {}),
          schoolDays: Array.isArray(s.school_days) ? s.school_days : JSON.parse(s.school_days),
          periodsPerDay: s.periods_per_day ?? 8,
          saturdayPeriods: s.saturday_periods ?? 4,
          lunchPeriod: s.lunch_period ?? 4,
          ptSubjectId: s.pt_subject_id,
          selectedTeacherIds: prev?.selectedTeacherIds ?? [],
          selectedClassId: prev?.selectedClassId ?? null,
          weeklyRequirements: prev?.weeklyRequirements ?? [],
          diagnosticIssues: prev?.diagnosticIssues ?? [],
          _teachersCache: prev?._teachersCache ?? [],
          _subjectsCache: prev?._subjectsCache ?? [],
        }));
      }

      if (loadedSchedule.length > 0) {
        setHasSavedTimetable(true);
      } else {
        setHasSavedTimetable(false);
      }
      // Always start at landing — user chooses what to do
      setMode('landing');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(err);
      setError('Failed to load school timetable data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchAllData]);

  // Set default PT subject ID fallback if lookups load and localStorage doesn't have it
  useEffect(() => {
    if (subjects.length > 0 && (!wizardSettings || wizardSettings.ptSubjectId === null)) {
      const ptSub = subjects.find(
        s => s.subject_name.toLowerCase() === 'pt' || s.code.toLowerCase() === 'pt'
      );
      if (ptSub) {
        setWizardSettings(prev => ({ // eslint-disable-line react-hooks/set-state-in-effect
          schoolDays: prev?.schoolDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          periodsPerDay: prev?.periodsPerDay ?? 8,
          saturdayPeriods: prev?.saturdayPeriods ?? 4,
          lunchPeriod: prev?.lunchPeriod ?? 4,
          selectedTeacherIds: prev?.selectedTeacherIds ?? [],
          ptSubjectId: ptSub.id,
          selectedClassId: prev?.selectedClassId ?? null,
          _teachersCache: prev?._teachersCache ?? [],
          _subjectsCache: prev?._subjectsCache ?? [],
          weeklyRequirements: prev?.weeklyRequirements ?? [],
          diagnosticIssues: prev?.diagnosticIssues ?? [],
        }));
      }
    }
  }, [subjects, wizardSettings]);

  const handleGenerateComplete = (responseSchedule: ApiSlot[], wizardState: WizardState) => {
    setSchedule(responseSchedule);
    setWizardSettings(wizardState);
    setHasSavedTimetable(true);
    setMode('grid');

    api.post('/admin/timetable/settings', {
      school_days: wizardState.schoolDays,
      saturday_periods: wizardState.saturdayPeriods,
      pt_subject_id: wizardState.ptSubjectId,
    }).catch(err => console.error('Failed to save timetable settings:', err));
  };

  const handleSave = async () => {
    const ptId = wizardSettings?.ptSubjectId ?? 9; // Fallback default ptSubjectId
    setIsSaving(true);

    try {
      // Only send valid slots to backend (filter out subject_id = 0)
      const slotsToSave = schedule
        .filter(s => s.subject_id > 0 && s.teacher_id > 0)
        .map(s => ({
          class_id: s.class_id,
          day_of_week: s.day_of_week,
          period_number: s.period_number,
          subject_id: s.subject_id,
          teacher_id: s.teacher_id,
        }));

      await api.put(`/admin/timetable/?pt_subject_id=${ptId}`, { slots: slotsToSave });
      toast.success('Timetable saved successfully');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to save timetable');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = () => {
    setMode('wizard');
    setSchedule([]);
  };

  const handleDownload = async (format: 'pdf' | 'excel') => {
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    try {
      const response = await api.get('/admin/timetable/export', {
        params: {
          format,
          class_id: viewClassId ?? wizardSettings?.selectedClassId ?? undefined,
        },
        responseType: 'blob',
      });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `master_timetable.${ext}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Timetable downloaded: ${filename}`);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Timetable download error:', err);
      // responseType: 'blob' hides JSON errors, so read the blob body for the detail
      let message = 'Failed to download timetable';
      try {
        const blob = err.response?.data;
        if (blob && blob instanceof Blob) {
          const parsed = JSON.parse(await blob.text());
          if (typeof parsed?.detail === 'string') {
            message = parsed.detail;
          } else if (Array.isArray(parsed?.detail) && parsed.detail.length > 0) {
            message = parsed.detail.map((d: any) => d?.msg ?? 'Invalid field').join('; '); // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        }
      } catch {
        // not JSON — keep fallback message
      }
      toast.error(message);
    }
  };

  const handleSaveSlotEdit = (updatedSchedule: ApiSlot[]) => {
    setSchedule(updatedSchedule);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
        <span className="text-slate-600 font-medium">Loading School Timetable…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Failed to Load Timetable</h2>
        <p className="text-slate-500 text-sm mb-6">{error}</p>
        <button 
          onClick={fetchAllData}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg text-sm shadow transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Landing Mode ──
  if (mode === 'landing') {
    return (
      <AdminLandingPage
        hasSavedTimetable={hasSavedTimetable}
        onStartWizard={() => setMode('wizard')}
        onViewTimetable={() => setMode('grid')}
      />
    );
  }

  // ── Wizard Mode ──
  if (mode === 'wizard') {
    return (
      <div className="space-y-4">
        {hasSavedTimetable && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-blue-600 shrink-0" size={18} />
              <span className="text-sm font-semibold text-blue-800">A saved timetable exists.</span>
            </div>
            <button
              onClick={() => setMode('grid')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors self-start sm:self-auto shrink-0 animate-pulse"
            >
              View Saved Timetable →
            </button>
          </div>
        )}
        <WizardLayout onGenerateComplete={handleGenerateComplete} />
      </div>
    );
  }

  // ── Grid Mode ──
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <TimetableToolbar
        onSave={handleSave}
        onRegenerate={handleRegenerate}
        isSaving={isSaving}
        onBack={() => setMode('landing')}
        onDownload={handleDownload}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TimetableGrid 
            schedule={schedule}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            schoolDays={wizardSettings?.schoolDays ?? ['Monday','Tuesday','Wednesday','Thursday','Friday']}
            periodsPerDay={wizardSettings?.periodsPerDay ?? 8}
            saturdayPeriods={wizardSettings?.saturdayPeriods ?? 4}
            lunchPeriod={wizardSettings?.lunchPeriod ?? 4}
            onSave={handleSaveSlotEdit}
            onClassChange={setViewClassId}
          />
        </div>
      </div>
    </div>
  );
}
