import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { Power, PowerOff, Trash2, Search, RefreshCw } from 'lucide-react';

interface Teacher {
  id: number;
  teacher_id: string | null;
  name: string;
  email: string;
  status: string;
  role: string;
  max_lectures_per_day: number;
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

const AllTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teachers');
      setTeachers(res.data);
    } catch (err) {
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleActivate = async (id: number, name: string) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/teachers/${id}/activate`);
      toast.success(`${name} activated.`);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to activate teacher.');
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
      toast.error(err.response?.data?.detail || 'Failed to deactivate teacher.');
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
      toast.error(err.response?.data?.detail || 'Failed to delete teacher.');
    } finally {
      setActionLoading(null);
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
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm">
                    No teachers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
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
