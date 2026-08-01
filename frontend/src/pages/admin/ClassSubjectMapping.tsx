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
        setClasses(response.data);
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
        subject_ids: selectedSubjectIds
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
        code: newSubjectCode.trim().toUpperCase()
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
        subject_ids: remainingIds
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
    <div className="mx-auto max-w-3xl space-y-6 font-body">
      {/* Header + class selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
            Administration
          </p>
          <h1 className="mt-1 font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Class Subject Mapping
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign subjects to each class and update them anytime.
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Select class
          </span>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value ? Number(e.target.value) : '');
              setShowEditModal(false);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-64"
          >
            <option value="">-- Select a Class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Standard {c.class_name} - {c.division}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedClass && currentClass && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          {/* Card header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900">
                Standard {currentClass.class_name}
                <span className="ml-1.5 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                  Division {currentClass.division}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {classSubjects.length} subject{classSubjects.length === 1 ? '' : 's'} assigned
              </p>
            </div>

            <button
              onClick={openEditModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md"
            >
              <CheckSquare className="h-4 w-4" />
              Manage Subjects
            </button>
          </div>

          {/* Subject cards */}
          {classSubjects.length === 0 ? (
            <div className="mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
              <div className="rounded-xl bg-white p-3 text-slate-400 shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="mt-3 font-heading text-sm font-bold text-slate-800">
                No subjects assigned yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Use Manage Subjects to pick subjects for this class.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 font-heading text-sm font-bold text-white shadow-sm">
                    {(subject.subject_name.trim().charAt(0) || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {subject.subject_name}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">{subject.code}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveSingleSubject(subject.id)}
                    aria-label={`Remove ${subject.subject_name}`}
                    className="rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
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
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="mt-3 font-heading text-sm font-bold text-slate-800">
            Pick a class to view its subjects
          </p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Select a class above to see and manage which subjects it offers.
          </p>
        </div>
      )}

      {/* Manage Subjects Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-secondary px-5 py-4">
              <div>
                <h3 className="font-heading text-sm font-bold text-white">
                  Manage Subjects
                </h3>
                <p className="text-[11px] font-semibold text-blue-200">
                  Standard {currentClass?.class_name} · Division {currentClass?.division}
                </p>
              </div>
              <button
                onClick={closeModals}
                aria-label="Close"
                className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {allSubjects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">
                  No subjects exist yet. Create the first one below.
                </p>
              ) : (
                <div className="space-y-1">
                  {allSubjects.map((subject) => (
                    <label
                      key={subject.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(subject.id)}
                        onChange={() => toggleSubject(subject.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-accent/40"
                      />
                      <span className="text-sm font-semibold text-slate-700">
                        {subject.subject_name}
                        <span className="ml-1.5 text-xs font-medium text-slate-400">
                          ({subject.code})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Create new subject */}
              {!showCreateSubject ? (
                <button
                  onClick={() => setShowCreateSubject(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-accent hover:text-accent"
                >
                  <Plus className="h-4 w-4" />
                  New subject
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <p className="text-xs font-bold text-slate-700">Create a new subject</p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      placeholder="Subject name, e.g. Physics"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <input
                      type="text"
                      placeholder="Code, e.g. PHY"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-32"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateAndAddSubject}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Create &amp; Add
                    </button>
                    <button
                      onClick={() => setShowCreateSubject(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">
              <span className="text-[11px] font-semibold text-slate-500">
                {selectedSubjectIds.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={closeModals}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSubjects}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {loading ? 'Saving...' : 'Save Changes'}
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
