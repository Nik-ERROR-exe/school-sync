import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { resultApi, subjectMaxMarksApi, ExamType, Subject, SubjectMaxMarks } from '../../api/results';
import {
  SlidersHorizontal,
  Save,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import api from '../../api';

const STANDARDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const SubjectMaxMarksConfig: React.FC = () => {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('10');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');

  const [configuredItems, setConfiguredItems] = useState<SubjectMaxMarks[]>([]);
  const [missingSubjects, setMissingSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Editable state for existing configurations
  const [editValues, setEditValues] = useState<{ [key: number]: string }>({});
  // Track which rows have been changed (dirty)
  const [dirtyItems, setDirtyItems] = useState<Set<number>>(new Set());
  // Input state for missing subjects to add
  const [newValues, setNewValues] = useState<{ [key: number]: string }>({});

  // Copy from another exam type
  const [copyFromExam, setCopyFromExam] = useState<number | ''>('');
  const [copying, setCopying] = useState<boolean>(false);

  // Fetch exam types on mount
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const exams = await resultApi.getExamTypes();
        setExamTypes(exams);
        if (exams.length > 0) {
          setSelectedExam(exams[0].id);
        }
      } catch (error) {
        console.error('Failed to load exam types:', error);
        toast.error('Failed to load exam types');
      }
    };
    fetchExams();
  }, []);

  // Fetch configs and missing subjects when standard or exam type changes
  useEffect(() => {
    if (!selectedStandard || !selectedExam) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [configs, missing] = await Promise.all([
          subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
          subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam)),
        ]);

        setConfiguredItems(configs);
        setMissingSubjects(missing);

        // Initialize edit values from fetched configs
        const initialEdits: { [key: number]: string } = {};
        configs.forEach((c) => {
          initialEdits[c.id] = String(c.max_marks);
        });
        setEditValues(initialEdits);
        setDirtyItems(new Set()); // reset dirty tracking
        setNewValues({});
      } catch (error: any) {
        console.error('Failed to load subject max marks configuration:', error);
        const status = error.response?.status;
        const detail = error.response?.data?.detail;
        if (status === 500) {
          toast.error(`Server error (500) – check backend logs. Detail: ${detail || 'unknown'}`);
        } else if (status === 404) {
          toast.error('API endpoint not found. Check backend routing.');
        } else {
          toast.error(`Failed to load configurations: ${detail || error.message || 'unknown error'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStandard, selectedExam]);

  // Handle local edit change: mark as dirty if value differs from original
  const handleEditChange = (id: number, value: string) => {
    setEditValues((prev) => ({ ...prev, [id]: value }));

    // Find original value
    const original = configuredItems.find((c) => c.id === id)?.max_marks;
    const currentVal = parseFloat(value);
    if (original !== undefined && !isNaN(currentVal) && currentVal !== original) {
      setDirtyItems((prev) => new Set(prev).add(id));
    } else {
      // If value is empty or same as original, remove from dirty set
      if (value === '' || (original !== undefined && currentVal === original)) {
        setDirtyItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  // Handle Save All: batch update only dirty items
  const handleSaveAll = async () => {
    if (dirtyItems.size === 0) {
      toast('No changes to save');
      return;
    }

    // Prepare updates list
    const updates: { id: number; max_marks: number }[] = [];
    let hasError = false;
    dirtyItems.forEach((id) => {
      const val = parseFloat(editValues[id]);
      if (isNaN(val) || val <= 0) {
        toast.error(`Invalid max marks for record #${id}`);
        hasError = true;
        return;
      }
      updates.push({ id, max_marks: val });
    });

    if (hasError || updates.length === 0) return;

    setSaving(true);
    const toastId = toast.loading('Saving max marks changes...');
    try {
      const response = await api.put('/admin/subject-max-marks/batch', { updates });
      setConfiguredItems(response.data);
      const newEdits: { [key: number]: string } = {};
      response.data.forEach((item: any) => {
        newEdits[item.id] = String(item.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
      toast.dismiss(toastId);
      toast.success(`Successfully updated ${updates.length} configuration(s)!`);
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Batch update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this max marks configuration?')) return;

    try {
      await subjectMaxMarksApi.delete(id);
      toast.success('Max marks configuration deleted');
      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam)),
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const newEdits: { [key: number]: string } = {};
      configs.forEach((c) => {
        newEdits[c.id] = String(c.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete configuration');
    }
  };

  // Individual create for missing subject
  const handleCreate = async (subjectId: number) => {
    const rawVal = newValues[subjectId];
    const val = parseFloat(rawVal);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid max marks greater than 0');
      return;
    }

    try {
      await subjectMaxMarksApi.create({
        class_name: selectedStandard,
        subject_id: subjectId,
        exam_type_id: Number(selectedExam),
        max_marks: val,
      });
      toast.success('Subject max marks configured successfully!');

      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam)),
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const newEdits: { [key: number]: string } = {};
      configs.forEach((c) => {
        newEdits[c.id] = String(c.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
      setNewValues((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail || 'Failed to configure max marks');
    }
  };

  const selectedExamName = examTypes.find((e) => e.id === selectedExam)?.name || '';

  const handleCopyFromExamType = async () => {
    if (!copyFromExam || copyFromExam === Number(selectedExam)) {
      toast.error('Please select a different exam type to copy from');
      return;
    }

    const sourceName = examTypes.find((e) => e.id === copyFromExam)?.name || '';
    if (
      !window.confirm(
        `Copy max marks from "${sourceName}" to "${selectedExamName}" for Standard ${selectedStandard}?\n\nExisting configurations will be skipped.`
      )
    ) {
      return;
    }

    setCopying(true);
    const toastId = toast.loading(`Copying max marks from ${sourceName}...`);
    try {
      const result = await subjectMaxMarksApi.copy(
        Number(copyFromExam),
        Number(selectedExam),
        selectedStandard
      );
      toast.dismiss(toastId);
      toast.success(`Copied ${result.length} max marks configuration(s) from "${sourceName}"`);

      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam)),
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const newEdits: { [key: number]: string } = {};
      configs.forEach((c) => {
        newEdits[c.id] = String(c.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
      setNewValues({});
      setCopyFromExam('');
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Copy error:', error);
      toast.error(error.response?.data?.detail || 'Failed to copy configurations');
    } finally {
      setCopying(false);
    }
  };

  const availableSourceExams = examTypes.filter((e) => e.id !== selectedExam);

  return (
    <div className="space-y-6 font-body text-[#0F172A] dark:text-[#F8FAFC]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#253044] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <span>Admin Portal</span>
            <span>/</span>
            <span>Academic Setup</span>
            <span>/</span>
            <span className="text-[#1769FF] dark:text-[#3B82F6]">Subject Max Marks</span>
          </div>
          <h1 className="mt-1 font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2.5">
            <SlidersHorizontal className="w-7 h-7 text-[#1769FF] dark:text-[#3B82F6]" />
            Subject Max Marks Configuration
          </h1>
          <p className="text-xs md:text-sm text-[#64748B] dark:text-[#94A3B8] font-medium mt-1">
            Configure examination maximum marks per curriculum standard and assessment type according to the school official grading scheme.
          </p>
        </div>

        {/* Academic Context Badges & Primary Save All */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#10151F] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#253044] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#1769FF] dark:text-[#3B82F6]" />
            <span>AY 2026–27</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#1769FF] dark:text-[#3B82F6] border border-blue-200 dark:border-blue-800/60 shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Standard {selectedStandard}</span>
          </div>

          {configuredItems.length > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={saving || dirtyItems.size === 0}
              className={`
                group relative inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl
                font-heading text-xs font-bold text-white select-none cursor-pointer
                bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] active:bg-[#0C4EC7]
                transition-all duration-200 ease-out active:scale-[.98]
                shadow-xs hover:shadow-md hover:shadow-blue-500/25
                disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
              `}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes {dirtyItems.size > 0 ? `(${dirtyItems.size})` : ''}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Selection Parameters Card ── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 sm:p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Standard Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Standard (Class Level)
            </label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 cursor-pointer"
            >
              {STANDARDS.map((std) => (
                <option key={std} value={std}>
                  Standard {std}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Examination Assessment Type
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(Number(e.target.value))}
              className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 cursor-pointer"
            >
              {examTypes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.weightage}% weightage)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Copy from Another Exam Type Banner ── */}
      {availableSourceExams.length > 0 && (
        <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100/80 dark:bg-blue-900/40 text-[#1769FF] dark:text-[#3B82F6] shrink-0">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading text-xs md:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Reuse Max Marks from Another Exam Type
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  Quickly copy marks configured from another assessment into Standard {selectedStandard} ({selectedExamName}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={copyFromExam}
                onChange={(e) => setCopyFromExam(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 sm:w-56 h-9 px-3 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-white dark:bg-[#10151F] text-xs text-[#0F172A] dark:text-[#F8FAFC] font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20"
              >
                <option value="">Select source assessment...</option>
                {availableSourceExams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleCopyFromExamType}
                disabled={!copyFromExam || copying}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl font-heading text-xs font-bold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                {copying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Copying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Copy Marks</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-2" />
          <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Loading subject max marks configuration...
          </p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── Missing Configurations Banner ── */}
          {missingSubjects.length > 0 && (
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 shadow-xs">
              <div className="flex items-start gap-3 mb-3.5">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Unconfigured Subjects for Standard {selectedStandard} ({selectedExamName})
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                    The following curriculum subjects do not have maximum marks configured. Teachers will be blocked from entering results until configured.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {missingSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {sub.subject_name}
                      </p>
                      <span className="inline-block mt-0.5 font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        Code: {sub.code || '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="1"
                        placeholder="Max"
                        value={newValues[sub.id] || ''}
                        onChange={(e) =>
                          setNewValues({ ...newValues, [sub.id]: e.target.value })
                        }
                        className="w-16 h-8 px-2 text-xs font-mono font-bold text-center rounded-lg border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-[#0F172A] dark:text-[#F8FAFC] outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6]"
                      />
                      <button
                        onClick={() => handleCreate(sub.id)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg font-heading text-[11px] font-bold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Configured Max Marks Table Card ── */}
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xs overflow-hidden">
            {/* Table Header Bar */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Configured Max Marks — Standard {selectedStandard} ({selectedExamName})
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {configuredItems.length} subjects active
                </span>
                {dirtyItems.size > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-[#1769FF] dark:text-[#3B82F6] border border-blue-200 dark:border-blue-800">
                    {dirtyItems.size} modified
                  </span>
                )}
              </div>
            </div>

            {configuredItems.length === 0 ? (
              <div className="text-center py-14 px-4">
                <BookOpen className="w-10 h-10 text-[#64748B] dark:text-[#94A3B8] mx-auto mb-3 opacity-50" />
                <h3 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  No Subjects Configured
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto mt-1">
                  No subjects have been configured yet for Standard {selectedStandard} under assessment{' '}
                  <span className="font-semibold">{selectedExamName}</span>. Use the form above to configure or copy from another exam type.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    <tr>
                      <th className="px-5 sm:px-6 py-3.5">Subject</th>
                      <th className="px-5 sm:px-6 py-3.5">Subject Code</th>
                      <th className="px-5 sm:px-6 py-3.5 text-center">Max Marks</th>
                      <th className="px-5 sm:px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#253044]">
                    {configuredItems.map((item) => {
                      const isDirty = dirtyItems.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isDirty
                              ? 'bg-blue-50/50 dark:bg-blue-950/30'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          {/* Subject Name */}
                          <td className="px-5 sm:px-6 py-3.5">
                            <span className="font-heading text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                              {item.subject_name || `Subject #${item.subject_id}`}
                            </span>
                          </td>

                          {/* Subject Code */}
                          <td className="px-5 sm:px-6 py-3.5">
                            <span className="inline-flex px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700">
                              {item.subject_code || '—'}
                            </span>
                          </td>

                          {/* Max Marks Input */}
                          <td className="px-5 sm:px-6 py-3.5 text-center">
                            <div className="inline-flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={
                                  editValues[item.id] !== undefined
                                    ? editValues[item.id]
                                    : item.max_marks
                                }
                                onChange={(e) => handleEditChange(item.id, e.target.value)}
                                className={`w-24 h-8 px-2.5 rounded-lg border text-center font-mono text-xs font-bold outline-none transition-all ${
                                  isDirty
                                    ? 'border-[#1769FF] dark:border-[#3B82F6] bg-blue-50 dark:bg-blue-950/40 text-[#1769FF] dark:text-[#3B82F6] ring-1 ring-[#1769FF]/30'
                                    : 'border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1769FF] dark:focus:border-[#3B82F6]'
                                }`}
                              />
                              {isDirty && (
                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-[#1769FF] dark:text-[#3B82F6]">
                                  Edited
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 sm:px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/70 transition-colors cursor-pointer"
                              title="Delete configuration"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer Bar */}
            {configuredItems.length > 0 && (
              <div className="px-6 py-4 border-t border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  <span>
                    <strong>{configuredItems.length}</strong> configured subjects
                  </span>
                  <span>•</span>
                  <span>
                    Evaluation Level: Standard <strong>{selectedStandard}</strong>
                  </span>
                  {dirtyItems.size > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-[#1769FF] dark:text-[#3B82F6] font-semibold">
                        {dirtyItems.size} unsaved modifications
                      </span>
                    </>
                  )}
                </div>

                {dirtyItems.size > 0 && (
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-bold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] shadow-xs hover:shadow-md transition-all active:scale-[.98] cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save All ({dirtyItems.size})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SubjectMaxMarksConfig;