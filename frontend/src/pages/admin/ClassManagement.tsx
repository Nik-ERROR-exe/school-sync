import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { isAxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import {
  AlertCircle,
  GraduationCap,
  Loader2,
  Plus,
  School,
  Search,
  Trash2,
  X,
  Users,
  ChevronRight,
} from 'lucide-react';
import { ApiClass } from '../../features/timetable/types';
import { Link } from '@tanstack/react-router';

export default function ClassManagement() {
  const [classes, setClasses] = useState<ApiClass[]>([]);

  // Loading and action states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals / forms state
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDivision, setNewClassDivision] = useState('');

  const [classSearch, setClassSearch] = useState('');

  const fetchData = useCallback(async () => {
    const run = async () => {
      setLoading(true);
      try {
        const classesRes = await api.get('/admin/classes/');
        setClasses(classesRes.data);
      } catch (err) {
        toast.error(
          isAxiosError(err) && typeof err.response?.data?.detail === 'string'
            ? err.response.data.detail
            : 'Failed to load classes'
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Class Management Handlers
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassDivision.trim()) {
      toast.error('All fields are required');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/admin/classes/', {
        class_name: newClassName.trim(),
        division: newClassDivision.trim().toUpperCase(),
      });
      toast.success('Class created successfully!');
      setNewClassName('');
      setNewClassDivision('');
      setShowAddClass(false);
      await fetchData();
    } catch (err) {
      toast.error(
        isAxiosError(err) && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to create class'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClass = async (classId: number) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this class? This will fail if the class has a timetable.'
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      await api.delete(`/admin/classes/${classId}`);
      toast.success('Class deleted successfully!');
      await fetchData();
    } catch (err) {
      toast.error(
        isAxiosError(err) && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to delete class'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering
  const filteredClasses = classes.filter(
    (c) =>
      c.class_name.toLowerCase().includes(classSearch.toLowerCase()) ||
      c.division.toLowerCase().includes(classSearch.toLowerCase())
  );

  // Group filtered classes by standard name
  const grouped = filteredClasses.reduce<Record<string, ApiClass[]>>((acc, cls) => {
    (acc[cls.class_name] ||= []).push(cls);
    return acc;
  }, {});
  const standards = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter font-body">
      {/* ───────────────────────────────────────────────────────────────────────
          A. PAGE HEADER: Title, Breadcrumb & Prominent "+ Add Class" Button
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#253044] pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769FF] dark:text-[#3B82F6]">
            Administration · Academic Structure
          </span>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
            Class Management
          </h1>
          <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-medium mt-1">
            Configure standards, sections, and class divisions across the school
          </p>
        </div>

        {/* Prominent "+ Add Class" Primary Action Button (rounded-xl, hover lift, active scale) */}
        <button
          type="button"
          onClick={() => setShowAddClass(true)}
          aria-label="Add new class"
          className="group relative inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-heading text-xs font-semibold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] active:bg-[#0C4EC7] transition-all duration-200 ease-out active:scale-[.98] hover:-translate-y-0.5 shadow-xs hover:shadow-md hover:shadow-blue-500/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 shrink-0 transition-transform duration-200 ease-out group-hover:rotate-90" />
          <span>Add Class</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          E. LINK HOVER: Compact Context Link to Class-Subject Mapping
          ─────────────────────────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/admin/class-subject-mapping"
          className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 text-xs font-semibold text-[#1769FF] dark:text-[#3B82F6] transition-all hover:bg-blue-100/80 dark:hover:bg-blue-900/40"
        >
          <School className="w-3.5 h-3.5 shrink-0 text-[#1769FF] dark:text-[#3B82F6]" />
          <span>Assign subjects to a class in Class-Subject Mapping</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1" />
        </Link>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          C. STATISTIC HIGHLIGHT (Large 32px number in primary blue) & SEARCH BAR
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Prominent Stat Card */}
        <div className="sm:col-span-5 md:col-span-4 rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#161D29] p-4.5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/50 shadow-2xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                Total Classes
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-3xl font-extrabold text-[#1769FF] dark:text-[#3B82F6] leading-tight">
                  {classes.length}
                </span>
                <span className="text-xs font-medium text-[#475569] dark:text-[#94A3B8]">
                  ({standards.length} Standards)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar with high-contrast placeholder */}
        <div className="sm:col-span-7 md:col-span-8 relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569] dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search standard or division (e.g. 10, A)..."
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-medium placeholder-[#475569] dark:placeholder-[#94A3B8] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 focus:border-[#1769FF] dark:focus:border-[#3B82F6] transition-all"
          />
          {classSearch && (
            <button
              type="button"
              onClick={() => setClassSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          B. CARD STRUCTURE & G. RESPONSIVE GRID (Desktop 2 cols / Mobile 1 col)
          ─────────────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#161D29] py-16 text-center shadow-xs">
          <Loader2 className="mb-3 animate-spin text-[#1769FF] dark:text-[#3B82F6]" size={28} />
          <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Loading class directories...
          </p>
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
            Fetching registered standards and divisions
          </p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#253044] bg-white dark:bg-[#10151F] py-12 px-6 text-center animate-card-enter">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-3 shadow-2xs">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            No classes match your search
          </h3>
          <p className="mt-1 text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] max-w-sm mx-auto">
            Try adjusting your search term or click "Add Class" to register a new division.
          </p>
        </div>
      ) : (
        /* Staggered Responsive Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {standards.map((std, index) => {
            const stdClasses = grouped[std];
            return (
              <div
                key={std}
                style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                className="group/card flex flex-col justify-between rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#161D29] p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-250 animate-card-enter"
              >
                {/* Card Header: Standard name + Divisions badge */}
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] dark:border-[#253044]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/40 font-heading text-xs font-extrabold shadow-2xs">
                        <GraduationCap className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          Standard {std}
                        </h3>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-[#1769FF] dark:text-[#3B82F6]">
                      {stdClasses.length} {stdClasses.length === 1 ? 'Division' : 'Divisions'}
                    </span>
                  </div>

                  {/* Card Body: Interactive Division Rows / Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                    {stdClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="group/row min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#10151F] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-blue-300/80 dark:hover:border-blue-800/60 transition-all duration-200 cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Users className="w-3.5 h-3.5 shrink-0 text-[#475569] dark:text-[#94A3B8] group-hover/row:text-[#1769FF] dark:group-hover/row:text-[#3B82F6] transition-colors" />
                          <span className="font-semibold text-xs md:text-sm text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            Class {cls.class_name}–{cls.division}
                          </span>
                        </div>

                        {/* Delete action button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(cls.id);
                          }}
                          title={`Delete Class ${cls.class_name}–${cls.division}`}
                          aria-label={`Delete Class ${cls.class_name}–${cls.division}`}
                          className="p-1 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ADD CLASS MODAL (THEME-AWARE)
          ─────────────────────────────────────────────────────────────────────── */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleAddClass}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xl animate-dropdown-reveal"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#253044] px-5 py-4 bg-[#F8FAFC] dark:bg-[#161D29]/60">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/40">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Add New Class
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddClass(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#161D29] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 p-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                  Standard *
                </label>
                <input
                  type="text"
                  placeholder='e.g. "8", "10"'
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 focus:border-[#1769FF] dark:focus:border-[#3B82F6] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                  Division *
                </label>
                <input
                  type="text"
                  placeholder='e.g. "A", "B", "C"'
                  value={newClassDivision}
                  onChange={(e) => setNewClassDivision(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 focus:border-[#1769FF] dark:focus:border-[#3B82F6] transition-all uppercase"
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/60 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAddClass(false)}
                className="h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1f2937] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="h-10 px-5 rounded-xl bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white text-xs font-semibold shadow-xs transition-all active:scale-[.98] disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                <span>Create Class</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}