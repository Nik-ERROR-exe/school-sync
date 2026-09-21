import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import {
  Power,
  PowerOff,
  Trash2,
  Search,
  RefreshCw,
  School,
  X,
  AlertTriangle,
  Save,
  Check,
  Plus,
  UsersRound,
  UserPlus,
  CheckCircle2,
  Clock,
  UserX,
  Mail,
  Loader2,
  Shield,
  Layers,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface SubjectBasic {
  id: number;
  subject_name: string;
  code: string;
}

interface ClassSubjectAssignment {
  id: number;
  class_id: number;
  subject_id: number;
  class_name: string;
  division: string;
  subject_name: string;
  code: string;
}

interface Teacher {
  id: number;
  teacher_id: string | null;
  name: string;
  email: string;
  status: string;
  role: string;
  max_lectures_per_day: number;
  subjects: SubjectBasic[];
  classSubjects?: ClassSubjectAssignment[];
}

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'PENDING', 'INACTIVE'] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    ACTIVE:
      'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60',
    PENDING:
      'bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60',
    INACTIVE:
      'bg-rose-50/90 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
        styles[status] ||
        'bg-slate-100 dark:bg-[#161D29] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#253044]'
      }`}
    >
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   CLASS-SUBJECT EDIT PANEL (THEME-AWARE 3-WAY MAPPING)
   ───────────────────────────────────────────────────────────────────────────── */
interface ClassSubjectEditPanelProps {
  teacher: Teacher;
  allClasses: { id: number; class_name: string; division: string }[];
  allSubjects: SubjectBasic[];
  onSave: (
    teacherId: number,
    assignments: { class_id: number; subject_id: number }[]
  ) => Promise<void>;
  onClose: () => void;
}

const ClassSubjectEditPanel: React.FC<ClassSubjectEditPanelProps> = ({
  teacher,
  allClasses,
  allSubjects,
  onSave,
  onClose,
}) => {
  const [assignments, setAssignments] = useState<
    { class_id: number; subject_id: number }[]
  >(
    (teacher.classSubjects || []).map((cs) => ({
      class_id: cs.class_id,
      subject_id: cs.subject_id,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selClass, setSelClass] = useState<number>(0);
  const [selSubject, setSelSubject] = useState<number>(0);

  const addPair = () => {
    if (!selClass || !selSubject) return;
    const exists = assignments.some(
      (a) => a.class_id === selClass && a.subject_id === selSubject
    );
    if (exists) {
      toast.error('This class-subject pair is already assigned.');
      return;
    }
    setAssignments((prev) => [
      ...prev,
      { class_id: selClass, subject_id: selSubject },
    ]);
    setSaved(false);
  };

  const removePair = (classId: number, subjectId: number) => {
    setAssignments((prev) =>
      prev.filter(
        (a) => !(a.class_id === classId && a.subject_id === subjectId)
      )
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(teacher.id, assignments);
      setSaved(true);
      setTimeout(() => onClose(), 600);
    } catch {
      // Parent handles error
    } finally {
      setSaving(false);
    }
  };

  const initial = (teacher.classSubjects || []).map(
    (cs) => `${cs.class_id}-${cs.subject_id}`
  );
  const current = assignments.map((a) => `${a.class_id}-${a.subject_id}`);
  const hasChanges =
    initial.length !== current.length ||
    initial.some((k) => !current.includes(k)) ||
    current.some((k) => !initial.includes(k));

  const getClassName = (id: number) => {
    const c = allClasses.find((cls) => cls.id === id);
    return c ? `Std ${c.class_name}-${c.division}` : `Class #${id}`;
  };

  const getSubjectInfo = (id: number) => {
    const s = allSubjects.find((sub) => sub.id === id);
    return s ? `${s.subject_name} (${s.code})` : `Subject #${id}`;
  };

  return (
    <tr>
      <td colSpan={7} className="px-0 py-0">
        <div className="bg-[#F8FAFC] dark:bg-[#121A27]/90 border-y border-[#E2E8F0] dark:border-[#253044] p-4 sm:p-6 animate-fadeIn">
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 sm:p-6 shadow-sm max-w-4xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#253044] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/50">
                  <School className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Class-Subject Assignments for {teacher.name}
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Configure teaching periods and timetable assignment eligibility
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="p-1.5 text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#161D29] rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current assignments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-heading font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">
                  Assigned Pairs ({assignments.length})
                </p>
                {assignments.length > 0 && (
                  <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Click &times; to remove pair
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px] items-center p-3 rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/40">
                {assignments.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-3 py-1.5 rounded-lg">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    No class-subject pairs assigned yet
                  </span>
                ) : (
                  assignments.map((a) => (
                    <span
                      key={`${a.class_id}-${a.subject_id}`}
                      className="inline-flex items-center gap-2 bg-blue-50/90 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-200/80 dark:border-blue-900/60 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-2xs group hover:border-blue-300 dark:hover:border-blue-800"
                    >
                      <span>
                        <strong className="font-heading">{getClassName(a.class_id)}</strong>
                        <span className="mx-1.5 opacity-60">·</span>
                        <span>{getSubjectInfo(a.subject_id)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removePair(a.class_id, a.subject_id)}
                        className="p-0.5 rounded-md hover:bg-blue-200/70 dark:hover:bg-blue-900 text-[#1769FF] dark:text-[#3B82F6] transition-colors cursor-pointer"
                        title="Remove pair"
                        aria-label={`Remove ${getClassName(a.class_id)} - ${getSubjectInfo(a.subject_id)}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Add new pair section */}
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#253044]">
              <p className="text-[11px] font-heading font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider mb-2.5">
                Add Class-Subject Pair
              </p>
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <select
                  value={selClass}
                  onChange={(e) => setSelClass(Number(e.target.value))}
                  className="h-10 flex-1 min-w-[140px] rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] px-3.5 text-xs md:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all cursor-pointer"
                >
                  <option value={0}>-- Select Class --</option>
                  {allClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Standard {cls.class_name} - Division {cls.division}
                    </option>
                  ))}
                </select>

                <select
                  value={selSubject}
                  onChange={(e) => setSelSubject(Number(e.target.value))}
                  className="h-10 flex-1 min-w-[140px] rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] px-3.5 text-xs md:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all cursor-pointer"
                >
                  <option value={0}>-- Select Subject --</option>
                  {allSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.subject_name} ({sub.code})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addPair}
                  disabled={!selClass || !selSubject}
                  className="h-10 px-4 rounded-xl font-heading text-xs font-semibold inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-200/80 dark:border-blue-900/60 hover:bg-[#1769FF] hover:text-white dark:hover:bg-[#3B82F6] dark:hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-[#253044]">
              <div className="text-xs text-[#475569] dark:text-[#94A3B8]">
                {!hasChanges && !saved ? (
                  <span>No changes made yet</span>
                ) : hasChanges ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Unsaved changes pending
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#161D29] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || saved || !hasChanges}
                  className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl font-heading text-xs font-semibold text-white transition-all shadow-xs active:scale-[.98] cursor-pointer ${
                    saved
                      ? 'bg-emerald-600'
                      : 'bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : saved ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Saved ✓</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Assignments</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: ALL TEACHERS
   ───────────────────────────────────────────────────────────────────────────── */

const AllTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectBasic[]>([]);
  const [allClasses, setAllClasses] = useState<
    { id: number; class_name: string; division: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editingClassesTeacherId, setEditingClassesTeacherId] = useState<
    number | null
  >(null);
  const [deleteConfirmTeacher, setDeleteConfirmTeacher] = useState<Teacher | null>(
    null
  );

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teachers/');
      const teacherList: Teacher[] = res.data;
      const teachersWithCS = await Promise.all(
        teacherList.map(async (t) => {
          try {
            const csRes = await api.get(`/admin/teachers/${t.id}/class-subjects`);
            t.classSubjects = csRes.data;
          } catch {
            t.classSubjects = [];
          }
          return t;
        })
      );
      setTeachers(teachersWithCS);
    } catch {
      toast.error('Failed to load faculty directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get('/admin/subjects/');
      setAllSubjects(res.data);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/admin/classes/');
      setAllClasses(res.data);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchSubjects(), fetchClasses()]);
      fetchTeachers();
    };
    init();
  }, [fetchClasses, fetchSubjects, fetchTeachers]);

  const handleActivate = async (id: number, name: string) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/teachers/${id}/activate`);
      toast.success(`${name} activated successfully.`);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to activate teacher.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (id: number, name: string) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/teachers/${id}/deactivate`);
      toast.success(`${name} deactivated.`);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to deactivate teacher.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    setActionLoading(id);
    try {
      await api.delete(`/admin/teachers/${id}`);
      toast.success(`${name} has been removed.`);
      setDeleteConfirmTeacher(null);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete teacher.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveClassSubjects = async (
    teacherId: number,
    assignments: { class_id: number; subject_id: number }[]
  ) => {
    try {
      await api.post(`/admin/teachers/${teacherId}/class-subjects`, {
        assignments,
      });
      toast.success('Class-subject assignments updated.');
      fetchTeachers();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail || 'Failed to save class-subject assignments.'
      );
      throw err;
    }
  };

  // Metrics counts
  const counts = useMemo(() => {
    return {
      total: teachers.length,
      active: teachers.filter((t) => t.status === 'ACTIVE').length,
      pending: teachers.filter((t) => t.status === 'PENDING').length,
      inactive: teachers.filter((t) => t.status === 'INACTIVE').length,
    };
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchesStatus = filter === 'ALL' || t.status === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.teacher_id || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [teachers, filter, search]);

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter font-body">
      {/* ───────────────────────────────────────────────────────────────────────
          A. PAGE HEADER: Title, Breadcrumb & Actions
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#253044] pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769FF] dark:text-[#3B82F6]">
            Administration · Faculty Directory
          </span>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
            All Teachers
          </h1>
          <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-medium mt-1">
            Manage school faculty, status, credentials, and class-subject assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Link to Pending Approvals if any */}
          <Link
            to="/admin/teachers/pending"
            className="group relative inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:text-[#1769FF] dark:hover:text-[#3B82F6] font-heading text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#475569] dark:text-[#94A3B8] group-hover:text-[#1769FF] dark:group-hover:text-[#3B82F6]" />
            <span>Pending Approvals</span>
            {counts.pending > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-bold bg-amber-500 text-white animate-pulse">
                {counts.pending}
              </span>
            )}
          </Link>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchTeachers}
            disabled={loading}
            aria-label="Refresh faculty list"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#161D29] font-heading text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading ? 'animate-spin text-[#1769FF] dark:text-[#3B82F6]' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          B. INTERACTIVE METRIC STAT CARDS
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Faculty */}
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
            filter === 'ALL'
              ? 'border-[#1769FF] dark:border-[#3B82F6] bg-blue-50/40 dark:bg-blue-950/25 ring-2 ring-[#1769FF]/20 dark:ring-[#3B82F6]/25 shadow-xs'
              : 'border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              Total Faculty
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6]">
              <UsersRound className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            {loading ? '...' : counts.total}
          </p>
        </button>

        {/* Active Teachers */}
        <button
          type="button"
          onClick={() => setFilter('ACTIVE')}
          className={`text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
            filter === 'ACTIVE'
              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/25 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              Active
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            {loading ? '...' : counts.active}
          </p>
        </button>

        {/* Pending Approvals */}
        <button
          type="button"
          onClick={() => setFilter('PENDING')}
          className={`text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
            filter === 'PENDING'
              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/25 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              Pending Approval
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            {loading ? '...' : counts.pending}
          </p>
        </button>

        {/* Inactive Accounts */}
        <button
          type="button"
          onClick={() => setFilter('INACTIVE')}
          className={`text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
            filter === 'INACTIVE'
              ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/25 ring-2 ring-rose-500/20 shadow-xs'
              : 'border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              Inactive
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            {loading ? '...' : counts.inactive}
          </p>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          C. SEARCH & STATUS FILTER CONTROLS
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569] dark:text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or teacher ID (e.g. T001)..."
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs md:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#475569] dark:placeholder-[#94A3B8] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="sm:w-48">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
            className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs md:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all shadow-2xs cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'ALL' ? 'All Statuses' : `${opt.charAt(0) + opt.slice(1).toLowerCase()} Only`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          D. FACULTY DIRECTORY TABLE
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E2E8F0] dark:divide-[#253044]">
            <thead className="bg-[#F8FAFC] dark:bg-[#161D29]/60">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-[11px] font-heading font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
                >
                  Faculty ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-[11px] font-heading font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
                >
                  Teacher Info
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-[11px] font-heading font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-[11px] font-heading font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
                >
                  Class-Subject Assignments
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-[11px] font-heading font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-right text-[11px] font-heading font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70 dark:divide-[#253044]/60 bg-white dark:bg-[#10151F]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-5 bg-slate-200 dark:bg-[#1E293B] rounded-md w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-[#1E293B]" />
                        <div className="space-y-1.5">
                          <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-md w-32" />
                          <div className="h-3 bg-slate-100 dark:bg-[#161D29] rounded-md w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 bg-slate-100 dark:bg-[#161D29] rounded-md w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 bg-slate-100 dark:bg-[#161D29] rounded-md w-36" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 bg-slate-200 dark:bg-[#1E293B] rounded-md w-16" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-5 bg-slate-100 dark:bg-[#161D29] rounded-md w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#161D29] text-[#64748B] dark:text-[#94A3B8] mb-3">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        No teachers found
                      </p>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1 max-w-sm">
                        {search || filter !== 'ALL'
                          ? 'Try adjusting your search query or status filter to find matching faculty members.'
                          : 'No teacher accounts exist in the directory yet.'}
                      </p>
                      {(search || filter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setFilter('ALL');
                          }}
                          className="mt-3 text-xs font-semibold text-[#1769FF] dark:text-[#3B82F6] hover:underline cursor-pointer"
                        >
                          Reset filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const isEditingCS = editingClassesTeacherId === teacher.id;
                  const isActing = actionLoading === teacher.id;

                  return (
                    <React.Fragment key={teacher.id}>
                      <tr
                        className={`transition-colors ${
                          isEditingCS
                            ? 'bg-blue-50/40 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50/80 dark:hover:bg-[#161D29]/50'
                        }`}
                      >
                        {/* Faculty ID */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {teacher.teacher_id ? (
                            <span className="font-mono text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F1F5F9] dark:bg-[#161D29] px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#253044]">
                              {teacher.teacher_id}
                            </span>
                          ) : (
                            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] italic font-mono">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Teacher Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/50 font-heading text-xs font-bold shadow-2xs">
                              {(teacher.name.trim().charAt(0) || 'T').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-heading text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                                {teacher.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#94A3B8] truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{teacher.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F8FAFC] dark:bg-[#161D29] text-[#475569] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#253044]">
                            {teacher.role === 'ADMIN' && (
                              <Shield className="w-3 h-3 text-[#1769FF] dark:text-[#3B82F6]" />
                            )}
                            <span>{teacher.role}</span>
                          </span>
                        </td>

                        {/* Class-Subject Assignments */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                            {!teacher.classSubjects ||
                            teacher.classSubjects.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 px-2 py-0.5 rounded-md">
                                <AlertTriangle className="h-3 w-3" />
                                <span>No assignments</span>
                              </span>
                            ) : (
                              <>
                                {teacher.classSubjects.slice(0, 2).map((cs) => (
                                  <span
                                    key={`${cs.class_id}-${cs.subject_id}`}
                                    className="inline-flex items-center text-[11px] font-medium text-[#1769FF] dark:text-[#3B82F6] bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 px-2 py-0.5 rounded-md truncate"
                                    title={`${cs.class_name}-${cs.division}: ${cs.subject_name}`}
                                  >
                                    Std {cs.class_name}-{cs.division}: {cs.code}
                                  </span>
                                ))}
                                {teacher.classSubjects.length > 2 && (
                                  <span className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8] bg-[#F1F5F9] dark:bg-[#161D29] border border-[#E2E8F0] dark:border-[#253044] px-1.5 py-0.5 rounded-md">
                                    +{teacher.classSubjects.length - 2} more
                                  </span>
                                )}
                              </>
                            )}

                            {/* Button to toggle assignments editor */}
                            <button
                              type="button"
                              onClick={() =>
                                setEditingClassesTeacherId(
                                  isEditingCS ? null : teacher.id
                                )
                              }
                              title="Configure Class-Subject Assignments"
                              aria-label={`Configure subjects for ${teacher.name}`}
                              className={`p-1 rounded-lg border transition-all cursor-pointer ml-1 ${
                                isEditingCS
                                  ? 'bg-[#1769FF] text-white border-[#1769FF] dark:bg-[#3B82F6] dark:border-[#3B82F6]'
                                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#1769FF] dark:hover:text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/40 border-transparent hover:border-blue-200 dark:hover:border-blue-900/60'
                              }`}
                            >
                              <Layers className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={teacher.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activate button */}
                            {teacher.status === 'INACTIVE' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleActivate(teacher.id, teacher.name)
                                }
                                disabled={isActing}
                                title="Activate Faculty Account"
                                aria-label={`Activate ${teacher.name}`}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isActing ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {/* Deactivate button */}
                            {teacher.status === 'ACTIVE' &&
                              teacher.role !== 'ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeactivate(teacher.id, teacher.name)
                                  }
                                  disabled={isActing}
                                  title="Deactivate Account"
                                  aria-label={`Deactivate ${teacher.name}`}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {isActing ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                                  ) : (
                                    <PowerOff className="h-4 w-4" />
                                  )}
                                </button>
                              )}

                            {/* Delete button */}
                            {teacher.role !== 'ADMIN' && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmTeacher(teacher)}
                                disabled={isActing}
                                title="Delete Faculty Member"
                                aria-label={`Delete ${teacher.name}`}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Class-Subject Edit Expanded Panel */}
                      {isEditingCS && (
                        <ClassSubjectEditPanel
                          teacher={teacher}
                          allClasses={allClasses}
                          allSubjects={allSubjects}
                          onSave={handleSaveClassSubjects}
                          onClose={() => setEditingClassesTeacherId(null)}
                        />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          E. DELETE CONFIRMATION MODAL
          ─────────────────────────────────────────────────────────────────────── */}
      {deleteConfirmTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xl animate-dropdown-reveal p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Delete Faculty Member?
                </h3>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
                {deleteConfirmTeacher.name}
              </strong>{' '}
              ({deleteConfirmTeacher.email})? Any existing timetable references
              must be cleared first.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeacher(null)}
                className="h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#161D29] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    deleteConfirmTeacher.id,
                    deleteConfirmTeacher.name
                  )
                }
                disabled={actionLoading === deleteConfirmTeacher.id}
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-heading text-xs font-semibold shadow-xs transition active:scale-[.98] disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
              >
                {actionLoading === deleteConfirmTeacher.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllTeachers;