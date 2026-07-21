import React, { useState, useEffect, useCallback } from 'react';
import { WizardLayout } from '../features/timetable/components/Wizard/WizardLayout';
import TimetableGrid from '../features/timetable/components/View/TimetableGrid';
import TimetableToolbar from '../features/timetable/components/View/TimetableToolbar';
import { ApiSlot, ApiClass, ApiSubject, ApiTeacher } from '../features/timetable/types';
import { WizardState } from '../features/timetable/WizardContext';
import api from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Timetable() {
  const [mode, setMode] = useState<'wizard' | 'grid'>('wizard');
  const [schedule, setSchedule] = useState<ApiSlot[]>([]);
  const [wizardSettings, setWizardSettings] = useState<WizardState | null>(() => {
    const savedDays = localStorage.getItem('school_days');
    const savedPeriods = localStorage.getItem('periods_per_day');
    const savedSatPeriods = localStorage.getItem('saturday_periods');
    const savedStart = localStorage.getItem('start_time');
    const savedDuration = localStorage.getItem('period_duration');
    const savedLunch = localStorage.getItem('lunch_period');
    const savedPt = localStorage.getItem('pt_subject_id');
    const savedClassId = localStorage.getItem('selected_class_id');
    const savedClassIds = localStorage.getItem('selected_class_ids');

    if (savedDays && savedPeriods) {
      return {
        schoolDays: JSON.parse(savedDays),
        periodsPerDay: Number(savedPeriods),
        saturdayPeriods: savedSatPeriods ? Number(savedSatPeriods) : 4,
        startTime: savedStart || '08:00',
        endTime: '14:30',
        periodDuration: savedDuration ? Number(savedDuration) : 40,
        lunchPeriod: savedLunch ? Number(savedLunch) : null,
        selectedTeacherIds: [],
        ptSubjectId: savedPt ? Number(savedPt) : null,
        selectedClassId: savedClassId ? Number(savedClassId) : null,
        selectedClassIds: savedClassIds ? JSON.parse(savedClassIds) : [],
        weeklyRequirements: [],
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

  // Fetch classes, subjects, teachers, and saved timetable on mount
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
        api.get('/admin/timetable/'),
        api.get('/admin/classes/'),
        api.get('/admin/subjects/'),
        api.get('/admin/teachers/'),
      ]);

      const loadedSchedule = scheduleRes.data.schedule || [];
      setSchedule(loadedSchedule);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);

      if (loadedSchedule.length > 0) {
        setMode('grid');
      } else {
        setMode('wizard');
      }
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
          startTime: prev?.startTime ?? '08:00',
          endTime: prev?.endTime ?? '14:30',
          periodDuration: prev?.periodDuration ?? 40,
          lunchPeriod: prev?.lunchPeriod ?? 4,
          selectedTeacherIds: prev?.selectedTeacherIds ?? [],
          ptSubjectId: ptSub.id,
          selectedClassId: prev?.selectedClassId ?? null,
          selectedClassIds: prev?.selectedClassIds ?? [],
          _teachersCache: prev?._teachersCache ?? [],
          _subjectsCache: prev?._subjectsCache ?? [],
          weeklyRequirements: prev?.weeklyRequirements ?? [],
        }));
      }
    }
  }, [subjects, wizardSettings]);

  const handleGenerateComplete = (responseSchedule: ApiSlot[], wizardState: WizardState) => {
    setSchedule(responseSchedule);
    setWizardSettings(wizardState);
    setMode('grid');
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

  if (mode === 'wizard') {
    return <WizardLayout onGenerateComplete={handleGenerateComplete} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <TimetableToolbar 
        onSave={handleSave}
        onRegenerate={handleRegenerate}
        isSaving={isSaving}
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
            startTime={wizardSettings?.startTime ?? '08:00'}
            periodDuration={wizardSettings?.periodDuration ?? 40}
            lunchPeriod={wizardSettings?.lunchPeriod ?? null}
            onSave={handleSaveSlotEdit}
          />
        </div>
      </div>
    </div>
  );
}
