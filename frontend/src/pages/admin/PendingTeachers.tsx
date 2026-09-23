import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import {
  Check,
  X,
  Clock,
  Mail,
  RefreshCw,
  UsersRound,
  CheckCircle2,
  AlertTriangle,
  Search,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface PendingTeacher {
  id: number;
  name: string;
  email: string;
  status: string;
  role?: string;
  created_at?: string;
}

const PendingTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectConfirmId, setRejectConfirmId] = useState<number | null>(null);

  const fetchPendingTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teachers/pending');
      setTeachers(res.data);
    } catch {
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
    setActionType('approve');
    try {
      const res = await api.put(`/admin/teachers/${id}/approve`);
      toast.success(`Faculty approved! Assigned ID: ${res.data.teacher_id || 'Active'}`);
      fetchPendingTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve teacher.');
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  };

  const handleReject = async (id: number, name: string) => {
    setActionLoading(id);
    setActionType('reject');
    try {
      await api.put(`/admin/teachers/${id}/reject`);
      toast.success(`${name}'s registration has been declined.`);
      setRejectConfirmId(null);
      fetchPendingTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reject teacher.');
    } finally {
      setActionLoading(null);
      setActionType(null);
    }
  };

  // Filtered teachers by search
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter font-body">
      {/* ───────────────────────────────────────────────────────────────────────
          A. PAGE HEADER: Title, Breadcrumb & Action Buttons
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#253044] pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769FF] dark:text-[#3B82F6]">
            Administration · Verification Queue
          </span>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
            Pending Approvals
          </h1>
          <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-medium mt-1">
            Review and verify teacher registrations before granting portal access
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Link to All Teachers */}
          <Link
            to="/admin/teachers"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:text-[#1769FF] dark:hover:text-[#3B82F6] font-heading text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <UsersRound className="w-4 h-4 text-[#475569] dark:text-[#94A3B8]" />
            <span>All Teachers</span>
          </Link>

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchPendingTeachers}
            disabled={loading}
            aria-label="Refresh pending registrations"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#161D29] font-heading text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1769FF] dark:text-[#3B82F6]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          B. HIGHLIGHT STAT CARDS & QUICK NOTICE
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat Card 1: Count of pending */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                Awaiting Review
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-heading text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  {loading ? '...' : teachers.length}
                </span>
                <span className="text-xs text-[#475569] dark:text-[#94A3B8] font-medium">
                  {teachers.length === 1 ? 'applicant' : 'applicants'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Informative Card 2: Automatic Faculty ID */}
        <div className="md:col-span-2 rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 dark:bg-blue-900/60 text-[#1769FF] dark:text-[#3B82F6] mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <span>Automatic ID Generation &amp; Instant Onboarding</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h2>
            <p className="mt-1 text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
              When you approve an applicant, SchoolSync automatically generates a unique Teacher ID (e.g. <span className="font-mono font-semibold text-[#1769FF] dark:text-[#3B82F6]">T001</span>), activates their credentials, and allows assigning them to class timetables.
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          C. SEARCH / FILTER BAR (when there are entries)
          ─────────────────────────────────────────────────────────────────────── */}
      {teachers.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569] dark:text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pending applicants by name or email..."
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs md:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#475569] dark:placeholder-[#94A3B8] focus:outline-hidden focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          D. MAIN CONTENT (CARDS / SKELETON / EMPTY STATE)
          ─────────────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 sm:p-6 space-y-4 animate-pulse shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-[#1E293B]" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-[#161D29] rounded-md w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-slate-100 dark:bg-[#161D29] rounded-xl" />
            </div>
          ))}
        </div>
      ) : teachers.length === 0 ? (
        /* Empty State: No Pending */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] dark:border-[#253044] bg-white/60 dark:bg-[#10151F]/40 px-6 py-16 text-center animate-card-enter">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-2xs mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="font-heading text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            All Caught Up!
          </h2>
          <p className="mt-1.5 max-w-md text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            There are no teacher registrations waiting for approval. New applicant submissions will automatically appear here.
          </p>
          <div className="mt-6">
            <Link
              to="/admin/teachers"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-heading text-xs font-semibold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] shadow-xs hover:shadow-md hover:shadow-blue-500/25 transition-all active:scale-[.98]"
            >
              <UsersRound className="w-4 h-4" />
              <span>View Faculty Directory</span>
            </Link>
          </div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        /* Empty search state */
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
          <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            No applicants found matching &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-semibold text-[#1769FF] dark:text-[#3B82F6] hover:underline cursor-pointer"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        /* Teacher Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((teacher) => {
            const isProcessing = actionLoading === teacher.id;
            const isConfirmingReject = rejectConfirmId === teacher.id;

            return (
              <div
                key={teacher.id}
                className="group flex flex-col justify-between rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-400/40 dark:hover:border-blue-500/40 transition-all duration-200 animate-card-enter"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50 font-heading text-base font-bold shadow-2xs">
                        {(teacher.name.trim().charAt(0) || 'T').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          {teacher.name}
                        </h2>
                        <div className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5 truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-[#64748B] dark:text-[#94A3B8]" />
                          <span className="truncate">{teacher.email}</span>
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60">
                      <Clock className="w-3 h-3" />
                      <span>Pending</span>
                    </span>
                  </div>

                  {/* Additional info chip */}
                  <div className="mt-4 pt-3.5 border-t border-[#E2E8F0]/80 dark:border-[#253044]/80 flex items-center justify-between text-xs">
                    <span className="text-[#475569] dark:text-[#94A3B8] font-medium">Requested Role</span>
                    <span className="font-heading font-semibold text-[#0F172A] dark:text-[#F8FAFC] px-2 py-0.5 rounded-md bg-[#F8FAFC] dark:bg-[#161D29] border border-[#E2E8F0] dark:border-[#253044]">
                      {teacher.role || 'TEACHER'}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3.5 border-t border-[#E2E8F0]/80 dark:border-[#253044]/80">
                  {isConfirmingReject ? (
                    <div className="space-y-2 animate-fade-in">
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Decline this teacher&apos;s registration?</span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(teacher.id, teacher.name)}
                          disabled={isProcessing}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl font-heading text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[.98] transition cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing && actionType === 'reject' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>Confirm Decline</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectConfirmId(null)}
                          disabled={isProcessing}
                          className="px-3 h-9 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#161D29] transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      {/* Approve Button */}
                      <button
                        type="button"
                        onClick={() => handleApprove(teacher.id, teacher.name)}
                        disabled={isProcessing}
                        aria-label={`Approve ${teacher.name}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl font-heading text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-[.98] shadow-xs hover:shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing && actionType === 'approve' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{isProcessing && actionType === 'approve' ? 'Approving...' : 'Approve'}</span>
                      </button>

                      {/* Reject Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setRejectConfirmId(teacher.id)}
                        disabled={isProcessing}
                        aria-label={`Reject ${teacher.name}`}
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl font-heading text-xs font-semibold border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-300 dark:hover:border-rose-800 active:scale-[.98] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingTeachers;
