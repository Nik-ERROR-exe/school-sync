import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../../api';
import { isAxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  Check,
  Loader2,
  School,
  Search,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

import { Teacher } from '../../api/teacher';

interface ClassRow {
  id: number;
  class_name: string;
  division: string;
  class_teacher_id: number | null;
}

interface ClearedClass {
  id?: number;
  class_name: string;
  division: string;
}

interface ClassTeacherResponse {
  success?: boolean;
  message?: string;
  cleared_classes?: ClearedClass[];
}

const ClassTeacherAssignment: React.FC = () => {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await api.get('/admin/classes/');
      setClasses(res.data);
    } catch (err) {
      toast.error(
        isAxiosError(err) && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to load classes'
      );
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoadingTeachers(true);
    try {
      const res = await api.get('/admin/teachers/');
      setTeachers(res.data);
    } catch (err) {
      toast.error(
        isAxiosError(err) && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to load teachers'
      );
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [fetchClasses, fetchTeachers]);

  // Teacher id -> display name, used for the badge on each class row.
  const teacherNameById = useMemo(() => {
    const map = new Map<number, string>();
    teachers.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [teachers]);

  const resolveTeacherName = useCallback(
    (teacherId: number | null) => {
      if (teacherId === null || teacherId === undefined) return null;
      return teacherNameById.get(teacherId) ?? `Teacher #${teacherId}`;
    },
    [teacherNameById]
  );

  const activeClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  // Selecting a class pre-selects its current class teacher.
  const handleSelectClass = useCallback(
    (row: ClassRow) => {
      setSelectedClassId(row.id);
      setSelectedTeacherId(row.class_teacher_id ?? null);
      setWarningMessage(null);
      setErrorMessage(null);
    },
    []
  );

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.teacher_id || '').toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const assignTeacher = useCallback(
    async (teacherId: number | null) => {
      if (selectedClassId === null) return;
      setActionLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      try {
        const res = await api.put(
          `/admin/classes/${selectedClassId}/class-teacher`,
          { teacher_id: teacherId }
        );
        const data: ClassTeacherResponse = res.data ?? {};

        const cleared = data.cleared_classes;
        if (Array.isArray(cleared) && cleared.length > 0) {
          setWarningMessage(
            cleared
              .map(
                (c) =>
                  `Class ${c.class_name}-${c.division} no longer has a class teacher.`
              )
              .join(' ')
          );
        }

        if (teacherId === null) {
          setSelectedTeacherId(null);
        }
        toast.success(data.message || 'Class teacher updated successfully.');
        await fetchClasses();
      } catch (err) {
        const detail =
          isAxiosError(err) && typeof err.response?.data?.detail === 'string'
            ? err.response.data.detail
            : 'Failed to update class teacher.';
        setErrorMessage(detail);
      } finally {
        setActionLoading(false);
      }
    },
    [selectedClassId, fetchClasses]
  );

  const canAssign = selectedClassId !== null && selectedTeacherId !== null;
  const canClear = activeClass !== null && activeClass.class_teacher_id !== null;

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter font-body">
      {/* ───────────────────────────────────────────────────────────────────────
          A. PAGE HEADER
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#253044] pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769FF] dark:text-[#3B82F6]">
            Administration · Class Teachers
          </span>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
            Class Teacher Assignment
          </h1>
          <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-medium mt-1">
            Assign one class teacher per class. The class teacher takes period 1
            on every school day.
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          B. BANNERS
          ─────────────────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <p className="text-xs md:text-sm text-rose-700 dark:text-rose-300 font-medium flex-1">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="p-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {warningMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="text-xs md:text-sm text-amber-700 dark:text-amber-300 font-medium flex-1">
            {warningMessage}
          </p>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            aria-label="Dismiss warning"
            className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          C. TWO-PANEL LAYOUT
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 items-start">
        {/* LEFT — CLASS LIST */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xs overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] dark:border-[#253044] px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/50">
              <School className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Classes
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                Select a class to assign its teacher
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0]/70 dark:divide-[#253044]/60 max-h-[32rem] overflow-y-auto">
            {loadingClasses ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-md w-28" />
                  <div className="h-3 bg-slate-100 dark:bg-[#161D29] rounded-md w-20 mt-2" />
                </div>
              ))
            ) : classes.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  No classes found
                </p>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                  Create a class before assigning a class teacher.
                </p>
              </div>
            ) : (
              classes.map((row) => {
                const isActive = row.id === selectedClassId;
                const name = resolveTeacherName(row.class_teacher_id);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => handleSelectClass(row)}
                    aria-pressed={isActive}
                    className={`w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-l-2 border-[#1769FF] dark:border-[#3B82F6]'
                        : 'hover:bg-slate-50/80 dark:hover:bg-[#161D29]/50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        {row.class_name}-{row.division}
                      </p>
                      {isActive && (
                        <Check className="w-4 h-4 text-[#1769FF] dark:text-[#3B82F6] shrink-0" />
                      )}
                    </div>
                    <div className="mt-1.5">
                      {name ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1769FF] dark:text-[#3B82F6] bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 px-2 py-0.5 rounded-md">
                          <UserCheck className="w-3 h-3" />
                          <span className="truncate">{name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" />
                          <span>No class teacher</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT — TEACHER SEARCH & ASSIGN */}
        <div className="lg:col-span-3 rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xs">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] dark:border-[#253044] px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/50">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {activeClass
                  ? `Assign teacher to ${activeClass.class_name}-${activeClass.division}`
                  : 'Assign teacher'}
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                {activeClass
                  ? `Current class teacher: ${
                      resolveTeacherName(activeClass.class_teacher_id) ??
                      'none'
                    }`
                  : 'Select a class on the left to begin'}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569] dark:text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, teacher ID, or email..."
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs md:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#475569] dark:placeholder-[#94A3B8] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Teacher results */}
            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#253044] overflow-hidden">
              <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8F0]/70 dark:divide-[#253044]/60">
                {loadingTeachers ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3.5 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-[#1E293B] rounded-md w-32" />
                      <div className="h-3 bg-slate-100 dark:bg-[#161D29] rounded-md w-44 mt-2" />
                    </div>
                  ))
                ) : filteredTeachers.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#161D29] text-[#64748B] dark:text-[#94A3B8] mx-auto mb-3">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      No teachers found
                    </p>
                    <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                      {search
                        ? 'Try adjusting your search query.'
                        : 'No teacher accounts exist yet.'}
                    </p>
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="mt-3 text-xs font-semibold text-[#1769FF] dark:text-[#3B82F6] hover:underline cursor-pointer"
                      >
                        Reset search
                      </button>
                    )}
                  </div>
                ) : (
                  filteredTeachers.map((t) => {
                    const isSelected = t.id === selectedTeacherId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTeacherId(t.id)}
                        aria-pressed={isSelected}
                        className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-950/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-[#161D29]/50'
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/50 font-heading text-xs font-bold shadow-2xs">
                          {(t.name.trim().charAt(0) || 'T').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-heading text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            {t.name}
                          </p>
                          <p className="text-xs text-[#475569] dark:text-[#94A3B8] truncate">
                            {t.teacher_id || 'Unassigned'} · {t.email}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#1769FF] dark:text-[#3B82F6] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => assignTeacher(selectedTeacherId)}
                disabled={!canAssign || actionLoading}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-heading text-xs font-semibold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] transition-all shadow-xs active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                <span>Assign as class teacher</span>
              </button>

              <button
                type="button"
                onClick={() => assignTeacher(null)}
                disabled={!canClear || actionLoading}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#161D29] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserX className="h-4 w-4" />
                <span>Clear class teacher</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassTeacherAssignment;
