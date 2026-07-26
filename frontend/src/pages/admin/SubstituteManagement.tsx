import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { SubstituteService } from '../../features/substitute/services';
import { teacherApi } from '../../api/teacher';
import { toast } from 'react-hot-toast';
import {
  UserCheck,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
  AlertCircle,
  UserMinus,
} from 'lucide-react';

interface Teacher {
  id: number;
  name: string;
  email: string;
  status: string;
}

interface SubjectBasic {
  id: number;
  subject_name: string;
  code: string;
}

interface ClassInfo {
  id: number;
  class_name: string;
  division: string;
}

interface FutureAssignment {
  period_number: number;
  class_id: number;
  subject_id: number;
  day_of_week: string;
  substitute_teacher_id: number | null;
  class_info?: ClassInfo;
  subject_info?: SubjectBasic;
  available_teachers: Teacher[];
  loading: boolean;
}

const SubstituteManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectBasic[]>([]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('');
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [affectedPeriods, setAffectedPeriods] = useState<{
    class_id: number;
    class_name: string;
    division: string;
    subject_id: number;
    subject_name: string | null;
    period_number: number;
    day_of_week: string;
  }[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  const [assignments, setAssignments] = useState<Map<string, FutureAssignment>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teacherData, classData, subjectData] = await Promise.all([
          teacherApi.getTeachers().then((res: any) => res.data || res),
        ]);

        const allTeachers: Teacher[] = teacherData.map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          status: t.status,
        }));
        setTeachers(allTeachers.filter((t: Teacher) => t.status === 'ACTIVE'));
      } catch {
        setTeachers([]);
      }
    };
    loadData();
  }, []);

  const handleFindPeriods = useCallback(async () => {
    if (!selectedTeacherId) {
      toast.error('Please select an absent teacher');
      return;
    }
    if (!selectedDayOfWeek) {
      toast.error('Please select a day of the week');
      return;
    }

    setPeriodsLoading(true);
    setAffectedPeriods([]);
    setAssignments(new Map());
    setSubmitted(false);

    try {
      const periods = await SubstituteService.getFutureAffectedPeriods(
        Number(selectedTeacherId),
        selectedDayOfWeek
      );
      setAffectedPeriods(periods);

      const initialAssignments = new Map<string, FutureAssignment>();
      periods.forEach((p) => {
        const key = `${p.class_id}-${p.day_of_week}-${p.period_number}`;
        initialAssignments.set(key, {
          period_number: p.period_number,
          class_id: p.class_id,
          subject_id: p.subject_id,
          day_of_week: p.day_of_week,
          substitute_teacher_id: null,
          class_info: { class_name: p.class_name, division: p.division },
          subject_info: { id: p.subject_id, subject_name: p.subject_name || '' },
          available_teachers: [],
          loading: false,
        });
      });
      setAssignments(initialAssignments);
    } catch (err) {
      const msg = err?.response?.data?.detail || String(err) || 'Failed to fetch affected periods';
      toast.error(msg);
    } finally {
      setPeriodsLoading(false);
    }
  }, [selectedTeacherId, selectedDayOfWeek]);

  const loadAvailableTeachers = useCallback(
    async (classId: number, dayOfWeek: string, period: number, subjectId: number) => {
      try {
        const result = await SubstituteService.getAvailableTeachersForFutureSlot(
          classId,
          dayOfWeek,
          period,
          subjectId,
          Number(selectedTeacherId)
        );
        return result.available_teachers || [];
      } catch (err) {
        toast.error(String(err));
        return [];
      }
    },
    [selectedTeacherId]
  );

  const handleSelectSubstitute = useCallback(
    async (key: string, substituteTeacherId: number) => {
      setAssignments((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(key);
        if (existing) {
          updated.set(key, { ...existing, substitute_teacher_id: substituteTeacherId });
        }
        return updated;
      });
    },
    []
  );

  const handleExpandPeriod = useCallback(
    async (key: string, periodNumber: number, classId: number, day: string, subjectId: number) => {
      setAssignments((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(key);
        if (existing && existing.available_teachers.length > 0) {
          return prev;
        }
        if (existing) {
          updated.set(key, { ...existing, loading: true });
        }
        return updated;
      });

      const available = await loadAvailableTeachers(classId, day, periodNumber, subjectId);

      setAssignments((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(key);
        if (existing) {
          updated.set(key, { ...existing, available_teachers: available, loading: false });
        }
        return updated;
      });
    },
    [loadAvailableTeachers]
  );

  const handleConfirmSubstitution = async () => {
    const activeAssignments = Array.from(assignments.values()).filter(
      (a) => a.substitute_teacher_id !== null
    );

    if (activeAssignments.length === 0) {
      toast.error('Please select at least one substitute teacher');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Saving substitutions...');

    try {
      await SubstituteService.assignFutureSubstitutes(
        Number(selectedTeacherId),
        activeAssignments.map((a) => ({
          class_id: a.class_id,
          subject_id: a.subject_id,
          day_of_week: a.day_of_week,
          period_number: a.period_number,
          substitute_teacher_id: a.substitute_teacher_id!,
        }))
      );

      toast.dismiss(loadingToast);
      toast.success('Substitutions confirmed successfully!');
      setSubmitted(true);

      window.dispatchEvent(new CustomEvent('reload-notifications'));
    } catch (err) {
      toast.dismiss(loadingToast);
      const msg = err?.response?.data?.detail || String(err) || 'Failed to save substitutions';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getTeacherName = (id: number) =>
    teachers.find((t) => t.id === id)?.name || `Teacher #${id}`;

  const getDayDisplayName = (day: string) => {
    const days: Record<string, string> = {
      Monday: 'Mon',
      Tuesday: 'Tue',
      Wednesday: 'Wed',
      Thursday: 'Thu',
      Friday: 'Fri',
      Saturday: 'Sat',
      Sunday: 'Sun',
    };
    return days[day] || day;
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-semibold">Access restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            Substitute Teacher Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Assign substitute teachers for future timetable slots of an absent teacher.
          </p>
        </div>
      </div>

      {/* Step 1: Select Absent Teacher */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <UserMinus className="h-5 w-5 text-red-500" />
          <span>Select Absent Teacher</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Absent Teacher
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value ? Number(e.target.value) : '');
              }}
              className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
            >
              <option value="">-- Select Absent Staff --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Day of Week
            </label>
            <select
              value={selectedDayOfWeek}
              onChange={(e) => {
                setSelectedDayOfWeek(e.target.value);
              }}
              className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
            >
              <option value="">-- Select Day --</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
            </select>
          </div>

          <button
            onClick={handleFindPeriods}
            disabled={periodsLoading || !selectedTeacherId || !selectedDayOfWeek}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 py-2.5 px-5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
          >
            {periodsLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Find Affected Slots
          </button>
        </div>
      </div>

      {/* Step 2: Affected Periods & Substitute Assignment */}
      {affectedPeriods.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              <span>Affected Future Slots</span>
            </h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {affectedPeriods.length} slot{affectedPeriods.length > 1 ? 's' : ''}
            </span>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
              <p className="text-sm font-semibold text-emerald-700">
                All substitutions have been confirmed!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Notifications have been sent to the assigned substitute teachers.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {affectedPeriods.map((period) => {
                const key = `${period.class_id}-${period.day_of_week}-${period.period_number}`;
                const assignment = assignments.get(key);

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 text-accent font-heading font-extrabold text-sm">
                          {period.period_number}
                        </div>
                        <div>
                          <p className="font-heading text-sm font-bold text-slate-900">
                            Period {period.period_number}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <BookOpen className="h-3 w-3 inline" />
                            {period.subject_name || `Subject #${period.subject_id}`}
                            <span className="text-slate-300">|</span>
                            <Users className="h-3 w-3 inline" />
                            Class {period.class_name}{period.division}
                            <span className="text-slate-300">|</span>
                            <Clock className="h-3 w-3 inline" />
                            {getDayDisplayName(period.day_of_week)}
                          </p>
                        </div>
                      </div>

                      {assignment?.substitute_teacher_id && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Assigned: {getTeacherName(assignment.substitute_teacher_id)}
                        </span>
                      )}
                    </div>

                    {assignment && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-3">
                          <select
                            value={assignment.substitute_teacher_id || ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              handleSelectSubstitute(key, val);
                            }}
                            className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                          >
                            <option value="">-- Select Substitute Teacher --</option>
                            {assignment.available_teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name}
                                {teacher.has_subject_expertise ? ' (Subject Match)' : ''}
                                {' — '}
                                Load: {teacher.current_lectures_on_date}/{teacher.max_lectures_per_day}
                              </option>
                            ))}
                          </select>

                          {!assignment.available_teachers.length && !assignment.loading && (
                            <button
                              onClick={() =>
                                handleExpandPeriod(
                                  key,
                                  period.period_number,
                                  period.class_id,
                                  period.day_of_week,
                                  period.subject_id
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent/90 px-3 py-2 text-[10px] font-bold text-white shadow-sm transition"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Load Available Teachers
                            </button>
                          )}

                          {assignment.loading && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Loading...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {periodsLoading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Finding affected periods...</span>
        </div>
      )}

      {!periodsLoading && affectedPeriods.length === 0 && selectedTeacherId && !submitted && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-3" />
          <p className="text-xs font-semibold text-emerald-600">
            No future slots found for this teacher
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            This teacher has no scheduled classes in the upcoming week or all slots already have substitutes.
          </p>
        </div>
      )}

      {/* Confirm Button */}
      {affectedPeriods.length > 0 && !submitted && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleConfirmSubstitution}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2.5 px-5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Confirm Substitution
          </button>
        </div>
      )}
    </div>
  );
};

export default SubstituteManagement;