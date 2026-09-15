import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw
} from 'lucide-react';

import { sortClasses } from '../utils/classSorter';

const Substitute: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Data
  const [teachers, setTeachers] = useState<{ id: number; name: string }[]>([]);
  const [subAssignments, setSubAssignments] = useState<SubstituteAssignment[]>([]);

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

  const loadInitialData = useCallback(async () => {
    try {
      const isAdmin = user?.role === 'ADMIN';
      const teacherPromise = isAdmin ? teacherApi.getTeachers().then((res: any) => res.data || res) : Promise.resolve([]);
      const assignmentsPromise = SubstituteService.getAssignments(user?.role);
      const [teacherData, assignments] = await Promise.all([
        teacherPromise,
        assignmentsPromise,
      ]);
      setTeachers(teacherData.map((t: any) => ({ id: t.id, name: t.name })));
      setSubAssignments(assignments);
    } catch {
      // silent fail
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
        toast('No affected periods found. All classes may already have substitutes assigned.');
      } else {
        toast.success(`Found ${periods.length} affected period(s)`);
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
        setAvailableTeachersMap(prev => ({
          ...prev,
          [periodNumber]: result.available_teachers || []
        }));
      } catch {
        setAvailableTeachersMap(prev => ({ ...prev, [periodNumber]: [] }));
        toast.error('Failed to load available teachers');
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
    const loadingToast = toast.loading('Assigning substitute teacher...');

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

      // Refresh assignments
      const assignments = await SubstituteService.getAssignments();
      setSubAssignments(assignments);

      // Remove this period from affected list
      setAffectedPeriods(prev => prev.filter(p => p.period_number !== periodNumber));
      setExpandedPeriods(prev => ({ ...prev, [periodNumber]: false }));
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const msg = err?.response?.data?.detail || 'Assignment failed';
      toast.error(msg);
    } finally {
      setAssigningPeriod(null);
    }
  };

  // Helpers
  const getTeacherName = (id: number) =>
    teachers.find(t => t.id === id)?.name || `Teacher #${id}`;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      notified: 'bg-blue-50 text-blue-700 border-blue-200',
      accepted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      declined: 'bg-red-50 text-red-700 border-red-200',
    };
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
          colors[status] || 'bg-slate-50 text-slate-600 border-slate-200'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 font-body">

      {/* Teacher View */}
      {!isAdmin && (
        <TeacherSubstitutionView
          assignments={subAssignments}
          getTeacherName={getTeacherName}
        />
      )}

      {/* Admin View */}
      {isAdmin && (
        <>
          {/* Step 1: Select Absent Teacher + Date */}
          <div className="grid gap-8 lg:grid-cols-3 animate-fade-in">
            {/* Left Panel: Absent Teacher Selection */}
            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-6 shadow-sm h-fit">
              <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-red-500" />
                <span>Report Absent Teacher</span>
              </h3>

              <form onSubmit={handleFindAffectedPeriods} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-2">
                    Absent Teacher
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
                    className="block w-full rounded-lg border border-[#E2E8F0] dark:border-[#253044] p-2.5 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-[#F8FAFC] dark:bg-[#121A27] shadow-sm"
                    required
                  >
                    <option value="">-- Select Absent Staff --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Absence Date
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
                    className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={periodsLoading}
                  className="w-full flex justify-center items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 py-3 px-4 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                >
                  {periodsLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>Find Affected Periods</span>
                </button>
              </form>
            </div>

            {/* Right Panel: Affected Periods + Substitutes */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
              <h3 className="font-heading text-base font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <span>Affected Periods</span>
                {affectedPeriods.length > 0 && (
                  <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {affectedPeriods.length} period{affectedPeriods.length > 1 ? 's' : ''}
                  </span>
                )}
              </h3>

              {/* No data state */}
              {!periodsFetched && (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle className="h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-xs font-semibold">Select an absent teacher and date, then click "Find Affected Periods"</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    The system will check the master timetable to find all classes affected.
                  </p>
                </div>
              )}

              {/* All periods already assigned */}
              {periodsFetched && affectedPeriods.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-3" />
                  <p className="text-xs font-semibold text-emerald-600">All periods are covered</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Every class for this teacher on this date already has a substitute assigned.
                  </p>
                </div>
              )}

              {/* Period Cards */}
              {affectedPeriods.length > 0 && (
                <div className="space-y-3">
                  {affectedPeriods.map((period) => (
                    <div
                      key={period.period_number}
                      className="rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition"
                    >
                      {/* Period Header */}
                      <button
                        onClick={() => togglePeriod(period.period_number)}
                        className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition text-left"
                      >
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
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {availableTeachersMap[period.period_number] && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {availableTeachersMap[period.period_number].length} available
                            </span>
                          )}
                          {expandedPeriods[period.period_number] ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded: Available Teachers */}
                      {expandedPeriods[period.period_number] && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                          {loadingTeachersMap[period.period_number] ? (
                            <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Finding available teachers...
                            </div>
                          ) : availableTeachersMap[period.period_number]?.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                                Available Substitute Teachers
                              </p>
                              {availableTeachersMap[period.period_number].map((teacher) => (
                                <div
                                  key={teacher.id}
                                  className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-3 shadow-sm"
                                >
                                  <div>
                                    <p className="text-xs font-bold text-slate-900">{teacher.name}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Load: {teacher.current_lectures_on_date}/{teacher.max_lectures_per_day} lectures
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleAssign(period.period_number, teacher.id)
                                    }
                                    disabled={assigningPeriod === period.period_number}
                                    className="flex items-center gap-1 rounded-lg bg-accent hover:bg-accent/90 px-3 py-2 text-[10px] font-bold text-white shadow-sm transition disabled:opacity-50"
                                  >
                                    {assigningPeriod === period.period_number ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <UserCheck className="h-3 w-3" />
                                    )}
                                    <span>Assign</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-4 text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                              No available teachers for this period
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* History Log */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm animate-fade-in">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-heading text-sm font-bold text-slate-950 flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                <span>Substitution Log History</span>
              </h3>
            </div>

            {subAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="h-6 w-6 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">No substitutions recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Absent Teacher</th>
                      <th className="px-6 py-3">Class</th>
                      <th className="px-6 py-3">Subject</th>
                      <th className="px-6 py-3">Period</th>
                      <th className="px-6 py-3">Substitute</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {subAssignments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-500">{a.date}</td>
                        <td className="px-6 py-4 font-bold">
                          {a.original_teacher_name || getTeacherName(a.original_teacher_id)}
                        </td>
                        <td className="px-6 py-4">
                          {a.class_name || `Class #${a.class_id}`}{a.division || ''}
                        </td>
                        <td className="px-6 py-4">{a.subject_name || `Subject #${a.subject_id}`}</td>
                        <td className="px-6 py-4 text-center font-bold">Period {a.period_number}</td>
                        <td className="px-6 py-4 font-bold text-accent">
                          {a.substitute_teacher_name || getTeacherName(a.substitute_teacher_id)}
                        </td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(a.status)}</td>
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

// Teacher Substitution View Component
const TeacherSubstitutionView: React.FC<{
  assignments: SubstituteAssignment[];
  getTeacherName: (id: number) => string;
}> = ({ assignments, getTeacherName }) => {
  const { user } = useAuth();
  const myDuties = assignments.filter(a => a.substitute_teacher_id === user?.id);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm animate-fade-in">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-accent animate-pulse" />
          <span>My Substitution Duties</span>
        </h3>
        <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
          Assigned substitution lectures
        </p>
      </div>

      {myDuties.length === 0 ? (
        <div className="rounded-lg bg-slate-50 border border-slate-250 p-8 text-center text-xs text-slate-500">
          No substitution assignments. Enjoy your free periods!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myDuties.map(duty => (
            <div
              key={duty.id}
              className="relative overflow-hidden rounded-xl border border-blue-150 bg-gradient-to-br from-white to-blue-50/20 p-5 shadow-sm"
            >
              <div className="absolute right-3 top-3 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                Active Duty
              </div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">
                {duty.date}
              </span>
              <h4 className="font-heading text-sm font-extrabold text-slate-900">
                {duty.class_name || `Class #${duty.class_id}`}{duty.division || ''}
              </h4>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Period <strong className="text-slate-900 font-bold">{duty.period_number}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                  <span>Subject: <strong className="text-slate-900 font-bold">{duty.subject_name || `Subject #${duty.subject_id}`}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <UserMinus className="h-3.5 w-3.5 text-slate-400" />
                  <span>Substitute for: <span className="text-slate-500 font-semibold">{getTeacherName(duty.original_teacher_id)}</span></span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Substitute;