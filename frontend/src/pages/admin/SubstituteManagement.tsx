import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { SubstituteService } from '../../features/substitute/services';
import { AvailableTeacher, SubstituteAssignment } from '../../features/substitute/types';
import { teacherApi } from '../../api/teacher';
import { toast } from 'react-hot-toast';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  RefreshCw,
  Send,
  AlertCircle,
  UserMinus,
  Layers,
  GraduationCap,
  Info,
  CalendarDays,
  X,
  Filter,
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
  available_teachers: AvailableTeacher[];
  loading: boolean;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const SubstituteManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('Monday');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Affected Periods
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
  const [periodsFetched, setPeriodsFetched] = useState(false);

  // Assignments Map
  const [assignments, setAssignments] = useState<Map<string, FutureAssignment>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // History Log
  const [historyAssignments, setHistoryAssignments] = useState<SubstituteAssignment[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

  // Load Initial Teachers and History Log
  const loadData = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true);
      const [teacherData, assignmentsData] = await Promise.all([
        teacherApi.getTeachers().then((res: any) => res.data || res),
        SubstituteService.getAssignments('ADMIN').catch(() => []),
      ]);

      const allTeachers: Teacher[] = (teacherData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        status: t.status,
      }));
      setTeachers(allTeachers.filter((t: Teacher) => t.status === 'ACTIVE'));
      setHistoryAssignments(assignmentsData || []);

      if (showToast) {
        toast.success('Records updated');
      }
    } catch {
      if (showToast) {
        toast.error('Failed to update records');
      }
      setTeachers([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load available teachers for slot
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
        const teachersList = result.available_teachers || [];
        teachersList.sort((a, b) => {
          if (a.has_subject_expertise && !b.has_subject_expertise) return -1;
          if (!a.has_subject_expertise && b.has_subject_expertise) return 1;
          return a.current_lectures_on_date - b.current_lectures_on_date;
        });
        return teachersList;
      } catch (err) {
        toast.error(String(err));
        return [];
      }
    },
    [selectedTeacherId]
  );

  // Fetch Affected Periods
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
    setPeriodsFetched(false);
    setAffectedPeriods([]);
    setAssignments(new Map());
    setSubmitted(false);

    try {
      const periods = await SubstituteService.getFutureAffectedPeriods(
        Number(selectedTeacherId),
        selectedDayOfWeek
      );
      setAffectedPeriods(periods);
      setPeriodsFetched(true);

      const initialAssignments = new Map<string, FutureAssignment>();
      periods.forEach((p) => {
        const key = `${p.class_id}-${p.day_of_week}-${p.period_number}`;
        initialAssignments.set(key, {
          period_number: p.period_number,
          class_id: p.class_id,
          subject_id: p.subject_id,
          day_of_week: p.day_of_week,
          substitute_teacher_id: null,
          class_info: { id: p.class_id, class_name: p.class_name, division: p.division },
          subject_info: { id: p.subject_id, subject_name: p.subject_name || '', code: '' },
          available_teachers: [],
          loading: false,
        });
      });
      setAssignments(initialAssignments);

      if (periods.length === 0) {
        toast('No affected timetable slots found for this day.', { icon: 'ℹ️' });
      } else {
        toast.success(`Found ${periods.length} affected slot${periods.length > 1 ? 's' : ''}`);

        periods.forEach(async (p) => {
          const key = `${p.class_id}-${p.day_of_week}-${p.period_number}`;
          setAssignments((prev) => {
            const updated = new Map(prev);
            const item = updated.get(key);
            if (item) {
              updated.set(key, { ...item, loading: true });
            }
            return updated;
          });

          const available = await loadAvailableTeachers(
            p.class_id,
            p.day_of_week,
            p.period_number,
            p.subject_id
          );

          setAssignments((prev) => {
            const updated = new Map(prev);
            const item = updated.get(key);
            if (item) {
              updated.set(key, { ...item, available_teachers: available, loading: false });
            }
            return updated;
          });
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || String(err) || 'Failed to fetch affected periods';
      toast.error(msg);
      setPeriodsFetched(true);
    } finally {
      setPeriodsLoading(false);
    }
  }, [selectedTeacherId, selectedDayOfWeek, loadAvailableTeachers]);

  const handleSelectSubstitute = useCallback(
    (key: string, substituteTeacherId: number | null) => {
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

  const handleConfirmSubstitution = async () => {
    const activeAssignments = Array.from(assignments.values()).filter(
      (a) => a.substitute_teacher_id !== null
    );

    if (activeAssignments.length === 0) {
      toast.error('Please assign at least one substitute teacher');
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
      toast.success('Substitutions confirmed!');
      setSubmitted(true);
      loadData();
    } catch (err: any) {
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; dot: string }> = {
      pending: {
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dot: 'bg-amber-500',
      },
      notified: {
        bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        dot: 'bg-blue-500',
      },
      accepted: {
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500',
      },
      declined: {
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dot: 'bg-rose-500',
      },
    };

    const style = config[status.toLowerCase()] || {
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      dot: 'bg-slate-400',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  // Metrics
  const assignedCount = useMemo(() => {
    return Array.from(assignments.values()).filter((a) => a.substitute_teacher_id !== null).length;
  }, [assignments]);

  const totalAffectedCount = affectedPeriods.length;

  const filteredHistory = useMemo(() => {
    return historyAssignments.filter((item) => {
      if (historyStatusFilter !== 'all' && item.status !== historyStatusFilter) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const absent = (item.original_teacher_name || getTeacherName(item.original_teacher_id)).toLowerCase();
        const sub = (item.substitute_teacher_name || getTeacherName(item.substitute_teacher_id)).toLowerCase();
        const cls = (item.class_name || '').toLowerCase();
        const subj = (item.subject_name || '').toLowerCase();
        const day = (item.day_of_week || '').toLowerCase();
        return absent.includes(q) || sub.includes(q) || cls.includes(q) || subj.includes(q) || day.includes(q);
      }
      return true;
    });
  }, [historyAssignments, historyStatusFilter, historySearch, teachers]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <div className="text-center p-8 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-sm max-w-md">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Restricted Access
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access to administrative substitution control is restricted to administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Substitute Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Identify affected slots for absent staff and assign qualified cover teachers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Records</span>
          </button>
        </div>
      </div>

      {/* ── Overview Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Staff</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{teachers.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Target Day</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{getDayDisplayName(selectedDayOfWeek)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Affected Slots</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{totalAffectedCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Audit Entries</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{historyAssignments.length}</p>
          </div>
        </div>
      </div>

      {/* ── Main Operations Grid ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Select Absent Teacher & Day */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-4">
              <UserMinus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Select Absent Staff
              </h2>
            </div>

            <div className="space-y-4">
              {/* Absent Teacher */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Absent Teacher <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setSelectedTeacherId(e.target.value ? Number(e.target.value) : '');
                    setPeriodsFetched(false);
                    setAffectedPeriods([]);
                    setAssignments(new Map());
                    setSubmitted(false);
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Choose Absent Faculty --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Day of Week <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDayOfWeek}
                  onChange={(e) => {
                    setSelectedDayOfWeek(e.target.value);
                    setPeriodsFetched(false);
                    setAffectedPeriods([]);
                    setAssignments(new Map());
                    setSubmitted(false);
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleFindPeriods}
                disabled={periodsLoading || !selectedTeacherId || !selectedDayOfWeek}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white h-9 px-4 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {periodsLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Querying Timetable...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    <span>Find Affected Slots</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Affected Slots */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-5 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Affected Slots ({selectedDayOfWeek})
                  </h2>
                </div>

                {affectedPeriods.length > 0 && !submitted && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {assignedCount} of {affectedPeriods.length} assigned
                  </span>
                )}
              </div>

              {/* Prompt State */}
              {!periodsFetched && !periodsLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
                  <Search className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Select an absent staff member and weekday to view affected periods.
                  </p>
                </div>
              )}

              {/* Loading State */}
              {periodsLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Checking timetable slots...</p>
                </div>
              )}

              {/* Empty State */}
              {periodsFetched && affectedPeriods.length === 0 && !periodsLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    No affected slots found on {selectedDayOfWeek}.
                  </p>
                </div>
              )}

              {/* Success State */}
              {submitted && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Substitutions Saved Successfully
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setAffectedPeriods([]);
                      setPeriodsFetched(false);
                      setAssignments(new Map());
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Assign Another Faculty
                  </button>
                </div>
              )}

              {/* Affected List */}
              {affectedPeriods.length > 0 && !submitted && (
                <div className="space-y-3">
                  {affectedPeriods.map((period) => {
                    const key = `${period.class_id}-${period.day_of_week}-${period.period_number}`;
                    const assignment = assignments.get(key);
                    const isAssigned = !!assignment?.substitute_teacher_id;
                    const availableTeachers = assignment?.available_teachers || [];
                    const isLoading = assignment?.loading;

                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-3.5 transition-colors ${
                          isAssigned
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs shrink-0">
                              P{period.period_number}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  Class {period.class_name} {period.division}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  • {period.subject_name || `Subject #${period.subject_id}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 max-w-xs">
                            <select
                              value={assignment?.substitute_teacher_id || ''}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                handleSelectSubstitute(key, val);
                              }}
                              disabled={isLoading}
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">-- Choose Substitute --</option>
                              {availableTeachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.name}
                                  {teacher.has_subject_expertise ? ' ★ (Specialist)' : ''}
                                  {` [Load: ${teacher.current_lectures_on_date}/${teacher.max_lectures_per_day}]`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Footer */}
            {affectedPeriods.length > 0 && !submitted && (
              <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {assignedCount} of {affectedPeriods.length} cover periods assigned
                </span>
                <button
                  type="button"
                  onClick={handleConfirmSubstitution}
                  disabled={submitting || assignedCount === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Confirm Allocations</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Substitution Audit History ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Substitution Audit Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              History of all recorded substitute assignments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-8 pl-8 pr-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500 w-44 sm:w-56"
              />
            </div>

            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="notified">Notified</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No history records match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-4 py-3 font-medium">Date / Day</th>
                  <th className="px-4 py-3 font-medium">Absent Staff</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium text-center">Period</th>
                  <th className="px-4 py-3 font-medium">Substitute</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.date || item.day_of_week || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {item.original_teacher_name || getTeacherName(item.original_teacher_id)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {item.class_name || `Class #${item.class_id}`}{item.division || ''}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {item.subject_name || `Subject #${item.subject_id}`}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      P{item.period_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">
                      {item.substitute_teacher_name || getTeacherName(item.substitute_teacher_id)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubstituteManagement;