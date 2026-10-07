import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { SubstituteService } from '../features/substitute/services';
import { teacherApi } from '../api/teacher';
import { SubstituteAssignment, AffectedPeriod, AvailableTeacher } from '../features/substitute/types';
import { toast } from 'react-hot-toast';
import {
  UserCheck,
  AlertCircle,
  Calendar,
  Clock,
  UserMinus,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  RefreshCw,
  Layers,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

import { sortClasses } from '../utils/classSorter';

const Substitute: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Data
  const [teachers, setTeachers] = useState<{ id: number; name: string; email?: string }[]>([]);
  const [subAssignments, setSubAssignments] = useState<SubstituteAssignment[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Step 1: Select absent teacher + date
  const [absentTeacherId, setAbsentTeacherId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Step 2: Affected periods
  const [affectedPeriods, setAffectedPeriods] = useState<AffectedPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsFetched, setPeriodsFetched] = useState(false);

  // Step 3: Per-period expand & available teachers
  const [expandedPeriods, setExpandedPeriods] = useState<Record<number, boolean>>({});
  const [availableTeachersMap, setAvailableTeachersMap] = useState<Record<number, AvailableTeacher[]>>({});
  const [loadingTeachersMap, setLoadingTeachersMap] = useState<Record<number, boolean>>({});

  // Assign state
  const [assigningPeriod, setAssigningPeriod] = useState<number | null>(null);

  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today'>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadInitialData = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true);
      const isUserAdmin = user?.role === 'ADMIN';
      const teacherPromise = isUserAdmin
        ? teacherApi.getTeachers().then((res: any) => res.data || res)
        : Promise.resolve([]);
      const assignmentsPromise = SubstituteService.getAssignments(user?.role);
      const [teacherData, assignments] = await Promise.all([
        teacherPromise,
        assignmentsPromise,
      ]);
      setTeachers(teacherData.map((t: any) => ({ id: t.id, name: t.name, email: t.email })));
      setSubAssignments(assignments);
      if (showToast) {
        toast.success('Records updated');
      }
    } catch {
      if (showToast) {
        toast.error('Failed to update data');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Step 1 -> 2: Fetch affected periods
  const handleFindAffectedPeriods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absentTeacherId || !selectedDate) {
      toast.error('Please select an absent teacher and date');
      return;
    }

    setPeriodsLoading(true);
    setPeriodsFetched(false);
    setAffectedPeriods([]);
    setExpandedPeriods({});
    setAvailableTeachersMap({});

    try {
      const periods = await SubstituteService.getAffectedPeriods(
        selectedDate,
        Number(absentTeacherId)
      );
      setAffectedPeriods(sortClasses(periods, p => `${p.class_name} ${p.division}`));
      setPeriodsFetched(true);
      if (periods.length === 0) {
        toast('No affected periods found.', { icon: 'ℹ️' });
      } else {
        toast.success(`Found ${periods.length} affected period${periods.length > 1 ? 's' : ''}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to fetch affected periods';
      toast.error(msg);
      setPeriodsFetched(true);
    } finally {
      setPeriodsLoading(false);
    }
  };

  // Step 2->3: Toggle period expand & load available teachers
  const togglePeriod = async (periodNumber: number) => {
    const isExpanding = !expandedPeriods[periodNumber];

    setExpandedPeriods(prev => ({ ...prev, [periodNumber]: isExpanding }));

    if (isExpanding && !availableTeachersMap[periodNumber]) {
      setLoadingTeachersMap(prev => ({ ...prev, [periodNumber]: true }));
      try {
        const result = await SubstituteService.getAvailableTeachers(
          selectedDate,
          periodNumber,
          Number(absentTeacherId)
        );
        const teachersList = result.available_teachers || [];
        teachersList.sort((a, b) => {
          if (a.has_subject_expertise && !b.has_subject_expertise) return -1;
          if (!a.has_subject_expertise && b.has_subject_expertise) return 1;
          return a.current_lectures_on_date - b.current_lectures_on_date;
        });

        setAvailableTeachersMap(prev => ({
          ...prev,
          [periodNumber]: teachersList,
        }));
      } catch {
        setAvailableTeachersMap(prev => ({ ...prev, [periodNumber]: [] }));
        toast.error('Failed to load available teachers for this period');
      } finally {
        setLoadingTeachersMap(prev => ({ ...prev, [periodNumber]: false }));
      }
    }
  };

  // Assign substitute
  const handleAssign = async (
    periodNumber: number,
    substituteTeacherId: number
  ) => {
    if (!absentTeacherId || !selectedDate) return;
    const period = affectedPeriods.find(p => p.period_number === periodNumber);
    if (!period) return;

    setAssigningPeriod(periodNumber);
    const loadingToast = toast.loading('Assigning substitute...');

    try {
      await SubstituteService.assignSubstitute(
        selectedDate,
        periodNumber,
        period.class_id,
        period.subject_id,
        Number(absentTeacherId),
        substituteTeacherId
      );

      toast.dismiss(loadingToast);
      toast.success('Substitute assigned successfully!');

      const assignments = await SubstituteService.getAssignments(user?.role);
      setSubAssignments(assignments);

      setAffectedPeriods(prev => prev.filter(p => p.period_number !== periodNumber));
      setExpandedPeriods(prev => {
        const updated = { ...prev };
        delete updated[periodNumber];
        return updated;
      });
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const msg = err?.response?.data?.detail || 'Assignment failed';
      toast.error(msg);
    } finally {
      setAssigningPeriod(null);
    }
  };

  const getTeacherName = (id: number) =>
    teachers.find(t => t.id === id)?.name || `Teacher #${id}`;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; dot: string }> = {
      pending: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
      notified: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
      accepted: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
      declined: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
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

  const adminMetrics = useMemo(() => {
    const totalAssignments = subAssignments.length;
    const todayAssignments = subAssignments.filter(a => a.date === todayStr).length;
    const pendingCount = subAssignments.filter(a => a.status === 'pending' || a.status === 'notified').length;
    const activeStaffCount = teachers.length;

    return {
      totalAssignments,
      todayAssignments,
      pendingCount,
      activeStaffCount,
    };
  }, [subAssignments, todayStr, teachers]);

  const filteredHistory = useMemo(() => {
    return subAssignments.filter(item => {
      if (historyDateFilter === 'today' && item.date !== todayStr) {
        return false;
      }
      if (historyStatusFilter !== 'all' && item.status !== historyStatusFilter) {
        return false;
      }
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase();
        const absentName = (item.original_teacher_name || getTeacherName(item.original_teacher_id)).toLowerCase();
        const subName = (item.substitute_teacher_name || getTeacherName(item.substitute_teacher_id)).toLowerCase();
        const className = (item.class_name || '').toLowerCase();
        const subjectName = (item.subject_name || '').toLowerCase();
        const dateStr = (item.date || '').toLowerCase();

        return (
          absentName.includes(query) ||
          subName.includes(query) ||
          className.includes(query) ||
          subjectName.includes(query) ||
          dateStr.includes(query)
        );
      }
      return true;
    });
  }, [subAssignments, historyDateFilter, historyStatusFilter, historySearch, todayStr, teachers]);

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAdmin ? 'Substitute Management' : 'My Substitution Schedule'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Detect affected class periods for absent staff and assign cover teachers.'
              : 'Track your assigned substitute lectures and cover periods.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => loadInitialData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Records</span>
          </button>
        </div>
      </div>

      {/* ── Teacher View ── */}
      {!isAdmin && (
        <TeacherSubstitutionView
          assignments={subAssignments}
          getTeacherName={getTeacherName}
          onRefresh={() => loadInitialData(true)}
          isRefreshing={isRefreshing}
        />
      )}

      {/* ── Admin View ── */}
      {isAdmin && (
        <>
          {/* Executive Metrics Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Staff</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{adminMetrics.activeStaffCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Today's Duties</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{adminMetrics.todayAssignments}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Duties</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{adminMetrics.pendingCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Logged</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{adminMetrics.totalAssignments}</p>
              </div>
            </div>
          </div>

          {/* ── Main Operations Section ── */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-5 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <UserMinus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Report Absence
                  </h2>
                </div>

                <form onSubmit={handleFindAffectedPeriods} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Absent Teacher <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={absentTeacherId}
                      onChange={(e) => {
                        setAbsentTeacherId(e.target.value ? Number(e.target.value) : '');
                        setPeriodsFetched(false);
                        setAffectedPeriods([]);
                        setExpandedPeriods({});
                        setAvailableTeachersMap({});
                      }}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Absent Faculty --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Absence Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setPeriodsFetched(false);
                        setAffectedPeriods([]);
                        setExpandedPeriods({});
                        setAvailableTeachersMap({});
                      }}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={periodsLoading || !absentTeacherId}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white h-9 px-4 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {periodsLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        <span>Find Affected Periods</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-8">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-5 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-4">
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Affected Periods
                      </h2>
                    </div>

                    {affectedPeriods.length > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {affectedPeriods.length} unassigned
                      </span>
                    )}
                  </div>

                  {!periodsFetched && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <Search className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Select absent faculty and date to scan timetable.
                      </p>
                    </div>
                  )}

                  {periodsFetched && affectedPeriods.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        All periods fully covered for this date.
                      </p>
                    </div>
                  )}

                  {affectedPeriods.length > 0 && (
                    <div className="space-y-3">
                      {affectedPeriods.map((period) => {
                        const isExpanded = !!expandedPeriods[period.period_number];
                        const availableTeachers = availableTeachersMap[period.period_number] || [];
                        const isLoadingTeachers = !!loadingTeachersMap[period.period_number];

                        return (
                          <div
                            key={period.period_number}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => togglePeriod(period.period_number)}
                              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs shrink-0">
                                  P{period.period_number}
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    Class {period.class_name} {period.division}
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                                    • {period.subject_name || `Subject #${period.subject_id}`}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-[#121824]">
                                {isLoadingTeachers ? (
                                  <div className="flex items-center justify-center py-4 text-xs text-slate-500">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2 text-blue-600" />
                                    Finding available faculty...
                                  </div>
                                ) : availableTeachers.length > 0 ? (
                                  <div className="space-y-2">
                                    {availableTeachers.map((teacher) => (
                                      <div
                                        key={teacher.id}
                                        className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17]"
                                      >
                                        <div>
                                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                            {teacher.name}
                                          </span>
                                          {teacher.has_subject_expertise && (
                                            <span className="ml-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                              Subject Specialist
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleAssign(period.period_number, teacher.id)}
                                          disabled={assigningPeriod === period.period_number}
                                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                          Assign
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-xs text-slate-500">
                                    No available teachers found for this slot.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* History Log */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Substitution Audit Log
              </h2>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search history..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />

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
              <div className="p-8 text-center text-xs text-slate-500">
                No history records match the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
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
                          {item.date}
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
        </>
      )}
    </div>
  );
};

// ── Teacher Substitution View Component ──
const TeacherSubstitutionView: React.FC<{
  assignments: SubstituteAssignment[];
  getTeacherName: (id: number) => string;
  onRefresh: () => void;
  isRefreshing: boolean;
}> = ({ assignments, getTeacherName, onRefresh, isRefreshing }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const myDuties = useMemo(() => {
    return assignments.filter(a => a.substitute_teacher_id === user?.id);
  }, [assignments, user]);

  const filteredDuties = useMemo(() => {
    return myDuties.filter(duty => {
      if (filter === 'today' && duty.date !== todayStr) return false;
      if (filter === 'upcoming' && (duty.date && duty.date < todayStr)) return false;
      return true;
    });
  }, [myDuties, filter, todayStr]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            <span>My Assigned Substitutions</span>
          </h2>

          <div className="flex gap-1 bg-slate-100 dark:bg-[#0B0F17] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filter === 'all' ? 'bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500'
              }`}
            >
              All ({myDuties.length})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filter === 'today' ? 'bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {filteredDuties.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No substitution lectures assigned.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDuties.map((duty) => (
              <div
                key={duty.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50 p-4"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    Period {duty.period_number}
                  </span>
                  <span className="text-slate-500">{duty.date}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {duty.class_name || `Class #${duty.class_id}`}{duty.division ? ` - ${duty.division}` : ''}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {duty.subject_name || `Subject #${duty.subject_id}`}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                  Covering for: <strong className="text-slate-700 dark:text-slate-300">{getTeacherName(duty.original_teacher_id)}</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Substitute;