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
        division: newClassDivision.trim(),
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
    if (!window.confirm('Are you sure you want to delete this class? This will fail if the class has a timetable.')) {
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
  const filteredClasses = classes.filter(c =>
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
    <div className="mx-auto max-w-5xl space-y-5 font-body">
      {/* Page Header — title, hint, and primary action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Administration</p>
          <h1 className="mt-1 flex items-center gap-2 font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Class Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View, create, and manage school classes.
          </p>
        </div>
        <button
          onClick={() => setShowAddClass(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Add Class
        </button>
      </div>

      {/* Compact inline hint to Class-Subject Mapping */}
      <div className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
        <School className="h-3.5 w-3.5 text-blue-500" />
        Assign subjects to a class in
        <Link
          to="/admin/class-subject-mapping"
          className="font-bold text-blue-600 underline underline-offset-2 transition hover:text-blue-800"
        >
          Class-Subject Mapping
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500 shadow-sm">
          <Loader2 className="mb-3 animate-spin text-blue-600" size={28} />
          <span className="text-sm font-semibold">Loading data…</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Toolbar: title + count + search */}
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Classes</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                {filteredClasses.length}
              </span>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search standard or division…"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Bounded, scrollable list window so the page never grows to a long scroll */}
          <div className="max-h-[60vh] overflow-y-auto p-5">
            {filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-xl bg-slate-100 p-3 text-slate-400">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <p className="mt-3 font-heading text-sm font-bold text-slate-800">No classes match</p>
                <p className="mt-1 text-xs text-slate-500">Try a different search term.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {standards.map(std => {
                  const stdClasses = grouped[std];
                  return (
                    <div key={std}>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-7 w-9 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 font-heading text-xs font-extrabold text-white shadow-sm">
                          {std}
                        </div>
                        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-500">
                          Standard {std}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">
                          · {stdClasses.length} division{stdClasses.length === 1 ? '' : 's'}
                        </span>
                        <div className="ml-1 flex-1 border-t border-slate-100" />
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {stdClasses.map(cls => (
                          <div
                            key={cls.id}
                            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 transition hover:border-slate-300 hover:bg-white"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white font-heading text-sm font-extrabold text-slate-700">
                                {cls.division}
                              </div>
                              <span className="text-sm font-bold text-slate-800">
                                Class {cls.class_name}–{cls.division}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteClass(cls.id)}
                              title="Delete Class"
                              className="rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddClass}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium animate-fade-in"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-secondary px-5 py-4">
              <h3 className="font-heading text-sm font-bold text-white">Add New Class</h3>
              <button
                type="button"
                onClick={() => setShowAddClass(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Standard *
                </span>
                <input
                  type="text"
                  placeholder='e.g. "8", "10"'
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Division *
                </span>
                <input
                  type="text"
                  placeholder='e.g. "A", "B"'
                  value={newClassDivision}
                  onChange={(e) => setNewClassDivision(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  required
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAddClass(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
