import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { Check, X, Clock, User, Mail, RefreshCw } from 'lucide-react';

interface PendingTeacher {
  id: number;
  name: string;
  email: string;
  status: string;
}

const PendingTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPendingTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teachers/pending');
      setTeachers(res.data);
    } catch (err) {
      toast.error('Failed to load pending teachers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingTeachers();
  }, [fetchPendingTeachers]);

  const handleApprove = async (id: number, name: string) => {
    setActionLoading(id);
    try {
      const res = await api.put(`/admin/teachers/${id}/approve`);
      toast.success(`✅ ${name} approved! Teacher ID: ${res.data.teacher_id}`);
      fetchPendingTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve teacher.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to reject ${name}'s registration?`)) return;
    setActionLoading(id);
    try {
      await api.put(`/admin/teachers/${id}/reject`);
      toast.error(`❌ ${name}'s registration was rejected.`);
      fetchPendingTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reject teacher.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pending Registrations</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading...' : `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''} awaiting approval`}
          </p>
        </div>
        <button
          onClick={fetchPendingTeachers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
          <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Pending Registrations</h3>
          <p className="text-sm text-slate-400">All teacher registrations have been reviewed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm border border-amber-200">
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{teacher.name}</h3>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                        <Mail className="h-3 w-3" />
                        <span>{teacher.email}</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    PENDING
                  </span>
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleApprove(teacher.id, teacher.name)}
                  disabled={actionLoading === teacher.id}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-semibold transition-colors border border-emerald-200 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {actionLoading === teacher.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(teacher.id, teacher.name)}
                  disabled={actionLoading === teacher.id}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors border border-red-200 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingTeachers;
