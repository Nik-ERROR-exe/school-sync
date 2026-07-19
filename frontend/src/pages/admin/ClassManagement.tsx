import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { Loader2, GraduationCap, Trash2, Plus, X, AlertCircle, Info } from 'lucide-react';
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
    setLoading(true);
    try {
      const classesRes = await api.get('/admin/classes/');
      setClasses(classesRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
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
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create class');
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
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete class');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering
  const filteredClasses = classes.filter(c =>
    c.class_name.toLowerCase().includes(classSearch.toLowerCase()) ||
    c.division.toLowerCase().includes(classSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-blue-600" /> Class Management
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            View, create, and manage school classes.
          </p>
        </div>
      </div>

      {/* Info box: navigate to Class-Subject Mapping */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <span className="font-semibold">To assign subjects to a class, go to </span>
          <Link
            to="/admin/class-subject-mapping"
            className="font-bold text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors"
          >
            Class-Subject Mapping
          </Link>
          <span className="font-semibold"> in the sidebar.</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
          <span className="text-sm font-semibold">Loading data…</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Classes</h2>
            <button
              onClick={() => setShowAddClass(true)}
              className="flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> Add Class
            </button>
          </div>

          {/* Inline Add Class Modal overlay */}
          {showAddClass && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex items-center justify-center p-4">
              <form onSubmit={handleAddClass} className="bg-white rounded-xl p-5 w-full max-w-xs shadow-xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Add New Class</h3>
                  <button type="button" onClick={() => setShowAddClass(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Class Name / Standard *</label>
                    <input
                      type="text"
                      placeholder='e.g., "8", "10"'
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Division / Section *</label>
                    <input
                      type="text"
                      placeholder='e.g., "A", "B"'
                      value={newClassDivision}
                      onChange={(e) => setNewClassDivision(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddClass(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 size={12} className="animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search classes */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-white">
            <input
              type="text"
              placeholder="Search classes…"
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Classes list container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-400">
                <AlertCircle size={24} className="mb-1 text-slate-300" />
                <span className="text-xs font-semibold">No classes match search.</span>
              </div>
            ) : (
              filteredClasses.map(cls => (
                <div
                  key={cls.id}
                  className="group w-full rounded-xl transition-all flex items-center justify-between p-2.5 hover:bg-slate-50 border border-transparent"
                >
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-600">
                      {cls.class_name}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800">Class {cls.class_name} - {cls.division}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClass(cls.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete Class"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
