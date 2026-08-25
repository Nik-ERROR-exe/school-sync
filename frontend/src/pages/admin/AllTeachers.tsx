import React, { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';

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
  subjects: SubjectBasic[];          // still loaded but not shown
  classSubjects?: ClassSubjectAssignment[];
}

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'PENDING', 'INACTIVE'];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    INACTIVE: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
};

/* ─── Class-Subject Edit Panel (3-way mapping) ────────────── */
interface ClassSubjectEditPanelProps {
  teacher: Teacher;
  allClasses: { id: number; class_name: string; division: string }[];
  allSubjects: SubjectBasic[];
  onSave: (teacherId: number, assignments: { class_id: number; subject_id: number }[]) => Promise<void>;
  onClose: () => void;
}

const ClassSubjectEditPanel: React.FC<ClassSubjectEditPanelProps> = ({
  teacher,
  allClasses,
  allSubjects,
  onSave,
  onClose,
}) => {
  const [assignments, setAssignments] = useState<{ class_id: number; subject_id: number }[]>(
    (teacher.classSubjects || []).map((cs) => ({ class_id: cs.class_id, subject_id: cs.subject_id }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selClass, setSelClass] = useState<number>(0);
  const [selSubject, setSelSubject] = useState<number>(0);

  const addPair = () => {
    if (!selClass || !selSubject) return;
    const exists = assignments.some((a) => a.class_id === selClass && a.subject_id === selSubject);
    if (exists) {
      toast.error('This class-subject pair already exists.');
      return;
    }
    setAssignments((prev) => [...prev, { class_id: selClass, subject_id: selSubject }]);
    setSaved(false);
  };

  const removePair = (classId: number, subjectId: number) => {
    setAssignments((prev) => prev.filter((a) => !(a.class_id === classId && a.subject_id === subjectId)));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(teacher.id, assignments);
      setSaved(true);
      setTimeout(() => onClose(), 800);
    } catch {
      // parent handles error
    } finally {
      setSaving(false);
    }
  };

  const initial = (teacher.classSubjects || []).map((cs) => `${cs.class_id}-${cs.subject_id}`);
  const current = assignments.map((a) => `${a.class_id}-${a.subject_id}`);
  const hasChanges = initial.length !== current.length || initial.some((k) => !current.includes(k)) || current.some((k) => !initial.includes(k));

  const getClassName = (id: number) => {
    const c = allClasses.find((cls) => cls.id === id);
    return c ? `${c.class_name}-${c.division}` : `Class #${id}`;
  };
  const getSubjectName = (id: number) => {
    const s = allSubjects.find((sub) => sub.id === id);
    return s ? s.subject_name : `Subject #${id}`;
  };

  return (
    <tr>
      <td colSpan={7} className="px-0 py-0">
        <div className="bg-gradient-to-b from-green-50/70 to-white border-t border-green-100 px-6 py-5 animate-in slide-in-from-top-2">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-green-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Class-Subject Assignments for {teacher.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current assignments */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Assigned Pairs ({assignments.length})
              </p>
              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {assignments.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    No class-subject assignments
                  </span>
                ) : (
                  assignments.map((a) => (
                    <span
                      key={`${a.class_id}-${a.subject_id}`}
                      className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full group hover:bg-green-200 transition-colors"
                    >
                      {getClassName(a.class_id)} — {getSubjectName(a.subject_id)}
                      <button
                        onClick={() => removePair(a.class_id, a.subject_id)}
                        className="p-0.5 rounded-full hover:bg-green-300 text-green-600 hover:text-green-900 transition-colors"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Add new pair */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Add Class-Subject Pair
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selClass}
                  onChange={(e) => setSelClass(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 py-2 px-3 text-sm text-slate-900 focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none shadow-sm bg-white"
                >
                  <option value={0}>Select Class…</option>
                  {allClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}-{cls.division}
                    </option>
                  ))}
                </select>
                <select
                  value={selSubject}
                  onChange={(e) => setSelSubject(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 py-2 px-3 text-sm text-slate-900 focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none shadow-sm bg-white"
                >
                  <option value={0}>Select Subject…</option>
                  {allSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.subject_name} ({sub.code})
                    </option>
                  ))}
                </select>
                <button
                  onClick={addPair}
                  disabled={!selClass || !selSubject}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || saved || !hasChanges}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                  saved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved ✓
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Assignments
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              {!hasChanges && !saved && (
                <span className="text-xs text-slate-400 ml-2">No changes to save</span>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

/* ─── Main Component ────────────────────────────────────────── */

const AllTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectBasic[]>([]);
  const [allClasses, setAllClasses] = useState<{ id: number; class_name: string; division: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editingClassesTeacherId, setEditingClassesTeacherId] = useState<number | null>(null);

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
          } catch { t.classSubjects = []; }
          return t;
        })
      );
      setTeachers(teachersWithCS);
    } catch {
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get('/admin/subjects/');
      setAllSubjects(res.data);
    } catch {}
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/admin/classes/');
      setAllClasses(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchSubjects(), fetchClasses()]);
      fetchTeachers();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActivate = async (id: number, name: string) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/teachers/${id}/activate`);
      toast.success(`${name} activated.`);
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
    if (!confirm(`⚠️ Delete ${name}? This cannot be undone.`)) return;
    setActionLoading(id);
    try {
      await api.delete(`/admin/teachers/${id}`);
      toast.success(`${name} deleted.`);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete teacher.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveClassSubjects = async (teacherId: number, assignments: { class_id: number; subject_id: number }[]) => {
    try {
      await api.post(`/admin/teachers/${teacherId}/class-subjects`, {
        assignments,
      });
      toast.success('Class-subject assignments updated successfully.');
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save class-subject assignments.');
      throw err;
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesStatus = filter === 'ALL' || t.status === filter;
    const matchesSearch = !search || 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.teacher_id || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Teachers</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading...' : `${filteredTeachers.length} teacher${filteredTeachers.length !== 1 ? 's' : ''} shown`}
          </p>
        </div>
        <button
          onClick={fetchTeachers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none shadow-sm"
          />
        </div>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2.5 px-4 text-sm text-slate-700 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none shadow-sm bg-white"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt === 'ALL' ? 'All Status' : opt}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Class-Subject Assignments</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-sm">
                    No teachers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <React.Fragment key={teacher.id}>
                    <tr
                      className={`hover:bg-slate-50 transition-colors ${
                        editingClassesTeacherId === teacher.id ? 'bg-green-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {teacher.teacher_id || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                            {teacher.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{teacher.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{teacher.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {(!teacher.classSubjects || teacher.classSubjects.length === 0) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              No assignments
                            </span>
                          ) : (
                            <>
                              {teacher.classSubjects.slice(0, 3).map((cs) => (
                                <span
                                  key={`${cs.class_id}-${cs.subject_id}`}
                                  className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full"
                                  title={`${cs.class_name}-${cs.division} — ${cs.subject_name}`}
                                >
                                  {cs.class_name}-{cs.division}: {cs.code}
                                </span>
                              ))}
                              {teacher.classSubjects.length > 3 && (
                                <span className="text-xs text-slate-400 font-medium">
                                  +{teacher.classSubjects.length - 3}
                                </span>
                              )}
                            </>
                          )}
                          <button
                            onClick={() =>
                              setEditingClassesTeacherId(
                                editingClassesTeacherId === teacher.id ? null : teacher.id
                              )
                            }
                            title="Manage Class-Subject Assignments"
                            className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors ml-1"
                          >
                            <School className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {teacher.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={teacher.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {teacher.status === 'INACTIVE' && (
                            <button
                              onClick={() => handleActivate(teacher.id, teacher.name)}
                              disabled={actionLoading === teacher.id}
                              title="Activate"
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          )}
                          {teacher.status === 'ACTIVE' && teacher.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleDeactivate(teacher.id, teacher.name)}
                              disabled={actionLoading === teacher.id}
                              title="Deactivate"
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <PowerOff className="h-4 w-4" />
                            </button>
                          )}
                          {teacher.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleDelete(teacher.id, teacher.name)}
                              disabled={actionLoading === teacher.id}
                              title="Delete"
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Class-Subject Edit Panel */}
                    {editingClassesTeacherId === teacher.id && (
                      <ClassSubjectEditPanel
                        teacher={teacher}
                        allClasses={allClasses}
                        allSubjects={allSubjects}
                        onSave={handleSaveClassSubjects}
                        onClose={() => setEditingClassesTeacherId(null)}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllTeachers;