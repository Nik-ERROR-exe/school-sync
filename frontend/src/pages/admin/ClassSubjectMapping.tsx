import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { isAxiosError } from 'axios';
import {
  BookOpen,
  CheckSquare,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { sortClasses } from '../../utils/classSorter';

interface Subject {
  id: number;
  subject_name: string;
  code: string;
}

interface Class {
  id: number;
  class_name: string;
  division: string;
  subjects?: Subject[];
}

const ClassSubjectMapping: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  // Multi-select modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');

  // Load classes with their subjects
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/admin/classes/');
        setClasses(sortClasses(response.data));
      } catch {
        toast.error('Failed to load classes');
      }
    };
    fetchClasses();
  }, []);

  // Load all available subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get('/admin/subjects/');
        setAllSubjects(response.data);
      } catch {
        toast.error('Failed to load subjects');
      }
    };
    fetchSubjects();
  }, []);

  // Reset selection to the class's current subjects when opening the modal
  const openEditModal = () => {
    if (selectedClass) {
      const currentClass = classes.find((c) => c.id === selectedClass);
      setSelectedSubjectIds(currentClass?.subjects?.map((s) => s.id) || []);
    }
    setShowEditModal(true);
  };

  const currentClass = classes.find((c) => c.id === selectedClass);
  const classSubjects = currentClass?.subjects || [];

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const saveSubjects = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const response = await api.put(`/admin/classes/${selectedClass}/subjects`, {
        subject_ids: selectedSubjectIds,
      });
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClass ? response.data : c))
      );
      toast.success('Subjects updated!');
      setShowEditModal(false);
    } catch (error) {
      toast.error(
        isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Failed to update subjects'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAddSubject = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }
    if (!newSubjectName.trim() || !newSubjectCode.trim()) {
      toast.error('Please enter subject name and code');
      return;
    }
    setLoading(true);
    try {
      const createResponse = await api.post('/admin/subjects/', {
        subject_name: newSubjectName.trim(),
        code: newSubjectCode.trim().toUpperCase(),
      });
      const createdSubject = createResponse.data;

      setAllSubjects((prev) => [...prev, createdSubject]);
      setSelectedSubjectIds((prev) => [...prev, createdSubject.id]);

      toast.success(`Subject "${newSubjectName}" created and selected.`);
      setNewSubjectName('');
      setNewSubjectCode('');
      setShowCreateSubject(false);
      // Keep the modal open so the admin can review and save the list
      setShowEditModal(true);
    } catch (error) {
      toast.error(
        isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Failed to create subject'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSingleSubject = async (subjectId: number) => {
    if (!selectedClass) return;
    if (!window.confirm('Remove this subject from the class?')) return;
    setLoading(true);
    try {
      const remainingIds = classSubjects
        .map((s) => s.id)
        .filter((id) => id !== subjectId);
      const response = await api.put(`/admin/classes/${selectedClass}/subjects`, {
        subject_ids: remainingIds,
      });
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClass ? response.data : c))
      );
      toast.success('Subject removed!');
    } catch (error) {
      toast.error(
        isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Failed to remove subject'
      );
    } finally {
      setLoading(false);
    }
  };

  const closeModals = () => {
    setShowEditModal(false);
    setShowCreateSubject(false);
  };

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter font-body">
      {/* Header + class selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#E2E8F0] dark:border-[#253044] pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769FF] dark:text-[#3B82F6]">
            Administration · Curriculum
          </span>
          <h1 className="mt-1 font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Class Subject Mapping
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-medium">
            Assign subjects to each class and update them anytime.
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
            Select class
          </span>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value ? Number(e.target.value) : '');
              setShowEditModal(false);
            }}
            className="h-10 w-full sm:w-64 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] px-3.5 text-xs md:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] shadow-2xs hover:border-blue-400/60 dark:hover:border-blue-500/60 focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all cursor-pointer"
          >
            <option value="">-- Select a Class --</option>
            {sortClasses(classes).map((c) => (
              <option key={c.id} value={c.id}>
                Standard {c.class_name} - {c.division}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedClass && currentClass && (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 sm:p-6 shadow-xs animate-card-enter">
          {/* Card header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] dark:border-[#253044] pb-4">
            <div>
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center">
                Standard {currentClass.class_name}
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-[#1769FF] dark:text-[#3B82F6]">
                  Division {currentClass.division}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-[#475569] dark:text-[#94A3B8] font-medium">
                {classSubjects.length} subject{classSubjects.length === 1 ? '' : 's'} assigned
              </p>
            </div>

            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-heading text-xs font-semibold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] active:bg-[#0C4EC7] transition-all duration-200 ease-out active:scale-[.98] hover:-translate-y-0.5 shadow-xs hover:shadow-md hover:shadow-blue-500/25 cursor-pointer self-start sm:self-auto"
            >
              <CheckSquare className="h-4 w-4 shrink-0" />
              <span>Manage Subjects</span>
            </button>
          </div>

          {/* Subject cards */}
          {classSubjects.length === 0 ? (
            <div className="mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] dark:border-[#253044] bg-[#F8FAFC]/50 dark:bg-[#121A27]/40 px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-[#1769FF] dark:text-[#3B82F6] shadow-2xs mx-auto mb-3">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                No subjects assigned yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-[#475569] dark:text-[#94A3B8]">
                Use Manage Subjects to pick subjects for this class.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="group flex items-center gap-3 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/50 p-3.5 transition-all duration-200 hover:border-blue-300/60 dark:hover:border-blue-700/50 hover:bg-white dark:hover:bg-[#161D29] hover:shadow-xs"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/50 font-heading text-sm font-bold shadow-2xs">
                    {(subject.subject_name.trim().charAt(0) || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {subject.subject_name}
                    </p>
                    <p className="text-[11px] font-mono font-semibold text-[#475569] dark:text-[#94A3B8]">
                      {subject.code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSingleSubject(subject.id)}
                    aria-label={`Remove ${subject.subject_name}`}
                    title={`Remove ${subject.subject_name}`}
                    className="rounded-lg p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-rose-200/80 dark:hover:border-rose-800/60 transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedClass && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] dark:border-[#253044] bg-white/60 dark:bg-[#10151F]/40 px-6 py-14 text-center animate-card-enter">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-[#1769FF] dark:text-[#3B82F6] shadow-2xs mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Pick a class to view its subjects
          </p>
          <p className="mt-1 max-w-sm text-xs md:text-sm text-[#475569] dark:text-[#94A3B8]">
            Select a class above to see and manage which subjects it offers.
          </p>
        </div>
      )}

      {/* Manage Subjects Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xl animate-dropdown-reveal">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/70 px-6 py-4">
              <div>
                <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Manage Subjects
                </h3>
                <p className="text-xs font-medium text-[#475569] dark:text-[#94A3B8] mt-0.5">
                  Standard {currentClass?.class_name} · Division {currentClass?.division}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModals}
                aria-label="Close"
                className="rounded-lg p-1 text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#161D29] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              {allSubjects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#253044] px-4 py-6 text-center text-xs text-[#475569] dark:text-[#94A3B8]">
                  No subjects exist yet. Create the first one below.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {allSubjects.map((subject) => {
                    const isChecked = selectedSubjectIds.includes(subject.id);
                    return (
                      <label
                        key={subject.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl p-3 border transition-all duration-150 select-none ${
                          isChecked
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/60'
                            : 'border-transparent hover:bg-[#F8FAFC] dark:hover:bg-[#161D29]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSubject(subject.id)}
                            className="h-4 w-4 rounded-md border-[#CBD5E1] dark:border-[#334155] text-[#1769FF] dark:text-[#3B82F6] focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 cursor-pointer accent-[#1769FF] dark:accent-[#3B82F6]"
                          />
                          <span className="text-xs md:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            {subject.subject_name}
                            <span className="ml-2 text-xs font-mono font-medium text-[#475569] dark:text-[#94A3B8]">
                              ({subject.code})
                            </span>
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Create new subject */}
              {!showCreateSubject ? (
                <button
                  type="button"
                  onClick={() => setShowCreateSubject(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#334155] px-3.5 py-2.5 text-xs font-heading font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:text-[#1769FF] dark:hover:text-[#3B82F6] transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>New subject</span>
                </button>
              ) : (
                <div className="rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/70 p-4 space-y-3">
                  <p className="text-xs font-heading font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Create a new subject
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      placeholder="Subject name, e.g. Physics"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#121A27] px-3.5 text-xs md:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#475569] dark:placeholder-[#94A3B8] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Code, e.g. PHY"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                      className="w-full sm:w-32 h-10 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#121A27] px-3.5 text-xs md:text-sm font-mono uppercase text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#475569] dark:placeholder-[#94A3B8] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:outline-hidden focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateAndAddSubject}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] px-3.5 py-2 text-xs font-heading font-semibold text-white shadow-xs transition hover:shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Create &amp; Add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateSubject(false)}
                      className="rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#161D29] px-3.5 py-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1f2937] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/70 px-6 py-4">
              <span className="text-xs font-medium text-[#475569] dark:text-[#94A3B8]">
                {selectedSubjectIds.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#161D29] px-4 py-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1f2937] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSubjects}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] px-4 py-2 text-xs font-heading font-semibold text-white shadow-xs hover:shadow-md hover:shadow-blue-500/25 transition active:scale-[.98] disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassSubjectMapping;