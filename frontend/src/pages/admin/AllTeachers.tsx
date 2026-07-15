import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import {
  Power,
  PowerOff,
  Trash2,
  Search,
  RefreshCw,
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Save,
  Check,
} from 'lucide-react';

interface SubjectBasic {
  id: number;
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

/* ─── Subject Edit Panel ────────────────────────────────────── */
interface SubjectEditPanelProps {
  teacher: Teacher;
  allSubjects: SubjectBasic[];
  onSave: (teacherId: number, subjectIds: number[]) => Promise<void>;
  onClose: () => void;
}

const SubjectEditPanel: React.FC<SubjectEditPanelProps> = ({
  teacher,
  allSubjects,
  onSave,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(
    teacher.subjects.map((s) => s.id)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  const selectedSubjects = allSubjects.filter((s) => selectedIds.includes(s.id));
  const availableSubjects = allSubjects.filter(
    (s) =>
      !selectedIds.includes(s.id) &&
      (s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(subjectSearch.toLowerCase()))
  );

  const addSubject = (id: number) => {
    setSelectedIds((prev) => [...prev, id]);
    setSubjectSearch('');
    setDropdownOpen(false);
    setSaved(false);
  };

  const removeSubject = (id: number) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(teacher.id, selectedIds);
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    selectedIds.length !== teacher.subjects.length ||
    selectedIds.some((id) => !teacher.subjects.find((s) => s.id === id));

  return (
    <tr>
      <td colSpan={7} className="px-0 py-0">
        <div className="bg-gradient-to-b from-blue-50/70 to-white border-t border-blue-100 px-6 py-5 animate-in slide-in-from-top-2">
          <div className="max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Subjects taught by {teacher.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Subject Chips */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Assigned Subjects ({selectedSubjects.length})
              </p>
              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {selectedSubjects.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    No subjects assigned
                  </span>
                ) : (
                  selectedSubjects.map((subj) => (
                    <span
                      key={subj.id}
                      className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full group hover:bg-blue-200 transition-colors"
                    >
                      {subj.subject_name}
                      <button
                        onClick={() => removeSubject(subj.id)}
                        className="p-0.5 rounded-full hover:bg-blue-300 text-blue-600 hover:text-blue-900 transition-colors"
                        title={`Remove ${subj.subject_name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Add Subject Dropdown */}
            <div className="mb-4 relative">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Add Subject
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => {
                    setSubjectSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search subjects to add..."
                  className="w-full max-w-md rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none shadow-sm"
                />
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {dropdownOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              {dropdownOpen && (
                <div className="absolute z-20 mt-1 w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {availableSubjects.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      {allSubjects.length === selectedIds.length
                        ? 'All subjects already assigned'
                        : 'No matching subjects'}
                    </div>
                  ) : (
                    availableSubjects.map((subj) => (
                      <button
                        key={subj.id}
                        onClick={() => addSubject(subj.id)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium">{subj.subject_name}</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {subj.code}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
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
                    Save Subjects
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teachers/');
      setTeachers(res.data);
    } catch {
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all subjects once on mount
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get('/admin/subjects/');
      setAllSubjects(res.data);
    } catch {
      // non-critical — panel will show empty dropdown
    }
  }, []);

  useEffect(() => {
    fetchTeachers(); // eslint-disable-line react-hooks/set-state-in-effect
    fetchSubjects();
  }, [fetchTeachers, fetchSubjects]);

  const handleActivate = async (id: number, name: string) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/teachers/${id}/activate`);
      toast.success(`${name} activated.`);
      fetchTeachers();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Failed to activate teacher.'; // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(msg);
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
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Failed to deactivate teacher.'; // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(msg);
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
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Failed to delete teacher.'; // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSubjects = async (teacherId: number, subjectIds: number[]) => {
    try {
      await api.post(`/admin/teachers/${teacherId}/subjects`, {
        subject_ids: subjectIds,
      });
      toast.success('Subjects updated successfully.');
      fetchTeachers();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Failed to save subjects.'; // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(msg);
      throw err; // re-throw so panel knows save failed
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
      {/* Page Header */}
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

      {/* Filters */}
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Subjects</th>
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
                        editingTeacherId === teacher.id ? 'bg-blue-50/50' : ''
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
                      {/* Subjects Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {(!teacher.subjects || teacher.subjects.length === 0) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              No subjects
                            </span>
                          ) : (
                            <>
                              {teacher.subjects.slice(0, 3).map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"
                                  title={s.subject_name}
                                >
                                  {s.code}
                                </span>
                              ))}
                              {teacher.subjects.length > 3 && (
                                <span className="text-xs text-slate-400 font-medium">
                                  +{teacher.subjects.length - 3}
                                </span>
                              )}
                            </>
                          )}
                          <button
                            onClick={() =>
                              setEditingTeacherId(
                                editingTeacherId === teacher.id ? null : teacher.id
                              )
                            }
                            title="Edit Subjects"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-1"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
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
                    {/* Expandable Subject Edit Panel */}
                    {editingTeacherId === teacher.id && (
                      <SubjectEditPanel
                        teacher={teacher}
                        allSubjects={allSubjects}
                        onSave={handleSaveSubjects}
                        onClose={() => setEditingTeacherId(null)}
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
