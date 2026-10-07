import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  resultApi,
  subjectExamComponentsApi,
  ExamType,
  SubjectWithComponents,
  SubjectExamComponentItem,
} from '../../api/results';
import {
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Calendar,
  Layers,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import api from '../../api';

const STANDARDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

interface DraftRow {
  tempId: string;
  id: number | null;
  component_code: string;
  display_label: string;
  max_marks: string;
  original?: SubjectExamComponentItem;
}

const newTempId = (): string =>
  `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const draftFromItem = (item: SubjectExamComponentItem): DraftRow => ({
  tempId: newTempId(),
  id: item.id,
  component_code: item.component_code,
  display_label: item.display_label,
  max_marks: String(item.max_marks),
  original: item,
});

const emptyDraft = (): DraftRow => ({
  tempId: newTempId(),
  id: null,
  component_code: '',
  display_label: '',
  max_marks: '',
});

const SubjectMaxMarksConfig: React.FC = () => {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('8');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [subjects, setSubjects] = useState<SubjectWithComponents[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow[]>>({});
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeOptions, setCodeOptions] = useState<
    { component_code: string; common_label: string }[]
  >([]);

  // Which row's code-picker popover is open (by tempId).
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCodeOptions = async () => {
      try {
        const response = await api.get(
          '/admin/subject-exam-components/distinct-codes'
        );
        setCodeOptions(response.data);
      } catch {
        // silently ignore
      }
    };
    fetchCodeOptions();
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const exams = await resultApi.getExamTypes();
        setExamTypes(exams);
        if (exams.length > 0) setSelectedExam(exams[0].id);
      } catch {
        toast.error('Failed to load exam types');
      }
    };
    fetchExams();
  }, []);

  // Close picker when clicking outside.
  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setOpenPickerFor(null);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const fetchSubjects = async () => {
    if (!selectedStandard || !selectedExam) return;
    setLoading(true);
    try {
      const data = await subjectExamComponentsApi.listByClass(
        selectedStandard,
        Number(selectedExam)
      );
      setSubjects(data);
      const nextDrafts: Record<number, DraftRow[]> = {};
      for (const subj of data) {
        if (subj.components.length === 0) {
          nextDrafts[subj.subject_id] = [];
        } else {
          nextDrafts[subj.subject_id] = subj.components
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map(draftFromItem);
        }
      }
      setDrafts(nextDrafts);
      setDeletedIds(new Set());
    } catch (error: any) {
      console.error('Failed to load subject components', error);
      toast.error(
        error.response?.data?.detail ||
          'Failed to load components for this Standard'
      );
      setSubjects([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStandard, selectedExam]);

  const updateRow = (
    subjectId: number,
    tempId: string,
    patch: Partial<DraftRow>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).map((r) =>
        r.tempId === tempId ? { ...r, ...patch } : r
      ),
    }));
  };

  const addRow = (subjectId: number) => {
    setDrafts((prev) => {
      const rows = prev[subjectId] || [];
      return { ...prev, [subjectId]: [...rows, emptyDraft()] };
    });
  };

  const removeRow = (subjectId: number, tempId: string) => {
    setDrafts((prev) => {
      const rows = prev[subjectId] || [];
      const row = rows.find((r) => r.tempId === tempId);
      if (row?.id != null) {
        setDeletedIds((d) => new Set(d).add(row.id as number));
      }
      return { ...prev, [subjectId]: rows.filter((r) => r.tempId !== tempId) };
    });
  };

  const pickCode = (
    subjectId: number,
    tempId: string,
    code: string,
    commonLabel: string
  ) => {
    const rows = drafts[subjectId] || [];
    const row = rows.find((r) => r.tempId === tempId);
    const patch: Partial<DraftRow> = { component_code: code };
    // Auto-fill label only when it's empty and the row is new.
    if (row && row.id === null && !row.display_label.trim()) {
      patch.display_label = commonLabel;
    }
    updateRow(subjectId, tempId, patch);
    setOpenPickerFor(null);
  };

  const isDirty = useMemo(() => {
    if (deletedIds.size > 0) return true;
    for (const rows of Object.values(drafts)) {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const expectedOrder = i + 1;
        if (r.id === null) return true;
        if (!r.original) return true;
        if (
          r.component_code.toUpperCase() !==
            r.original.component_code.toUpperCase() ||
          r.display_label !== r.original.display_label ||
          parseFloat(r.max_marks) !== r.original.max_marks ||
          expectedOrder !== r.original.display_order
        ) {
          return true;
        }
      }
    }
    return false;
  }, [drafts, deletedIds]);

  const handleSaveAll = async () => {
    if (!isDirty) {
      toast('No changes to save');
      return;
    }

    const items: any[] = [];

    for (const subj of subjects) {
      const rows = drafts[subj.subject_id] || [];
      const seenCodes = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const code = r.component_code.trim().toUpperCase();
        const label = r.display_label.trim();
        const max = parseFloat(r.max_marks);

        if (!code) {
          toast.error(
            `Subject ${subj.subject_name}: component code is required`
          );
          return;
        }
        if (!/^[A-Z0-9_-]+$/.test(code)) {
          toast.error(
            `Subject ${subj.subject_name}: code "${code}" may only contain letters, digits, _ and -`
          );
          return;
        }
        if (seenCodes.has(code)) {
          toast.error(
            `Subject ${subj.subject_name}: duplicate component code "${code}"`
          );
          return;
        }
        seenCodes.add(code);

        if (!label) {
          toast.error(
            `Subject ${subj.subject_name}: display label is required`
          );
          return;
        }
        if (isNaN(max) || max <= 0) {
          toast.error(
            `Subject ${subj.subject_name}: max marks must be > 0`
          );
          return;
        }

        items.push({
          class_name: selectedStandard,
          subject_id: subj.subject_id,
          exam_type_id: Number(selectedExam),
          component_code: code,
          display_label: label,
          max_marks: max,
          display_order: i + 1,
        });
      }
    }

    setSaving(true);
    const toastId = toast.loading('Saving configuration...');
    try {
      for (const subj of subjects) {
        const rows = drafts[subj.subject_id] || [];
        for (const r of rows) {
          if (
            r.id !== null &&
            r.original &&
            r.component_code.trim().toUpperCase() !==
              r.original.component_code.toUpperCase()
          ) {
            await subjectExamComponentsApi.delete(r.id);
          }
        }
      }

      if (items.length > 0) {
        await subjectExamComponentsApi.batch(items);
      }
      for (const id of Array.from(deletedIds)) {
        await subjectExamComponentsApi.delete(id);
      }

      toast.dismiss(toastId);
      toast.success('Configuration saved');
      await fetchSubjects();
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Save failed', error);
      toast.error(
        error.response?.data?.detail ||
          'Failed to save component configuration'
      );
    } finally {
      setSaving(false);
    }
  };

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
            <span className="text-[#1769FF] dark:text-[#3B82F6]">
              Subject Components
            </span>
          </div>
          <h1 className="mt-1 font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2.5">
            <SlidersHorizontal className="w-7 h-7 text-[#1769FF] dark:text-[#3B82F6]" />
            Subject Components Configuration
          </h1>
          <p className="text-xs md:text-sm text-[#64748B] dark:text-[#94A3B8] font-medium mt-1">
            Define marks components (e.g. आका / तोंडी / लेखी) per subject and
            exam. Unit Tests typically have one component; Semesters typically
            have three or more.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#10151F] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#253044] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#1769FF] dark:text-[#3B82F6]" />
            <span>AY 2026–27</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#1769FF] dark:text-[#3B82F6] border border-blue-200 dark:border-blue-800/60 shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Standard {selectedStandard}</span>
          </div>

          {(isDirty || saving) && (
            <button
              onClick={handleSaveAll}
              disabled={saving || !isDirty}
              className="
                group relative inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl
                font-heading text-xs font-bold text-white select-none cursor-pointer
                bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] active:bg-[#0C4EC7]
                transition-all duration-200 ease-out active:scale-[.98]
                shadow-xs hover:shadow-md hover:shadow-blue-500/25
                disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
              "
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Selection Parameters Card ── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 sm:p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Standard (Class Level)
            </label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 cursor-pointer"
            >
              {STANDARDS.map((s) => (
                <option key={s} value={s}>
                  Standard {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Examination Assessment Type
            </label>
            <select
              value={selectedExam}
              onChange={(e) =>
                setSelectedExam(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 cursor-pointer"
            >
              <option value="">Select Exam</option>
              {examTypes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-2" />
          <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Loading subjects...
          </p>
        </div>
      )}

      {/* ── No Selection ── */}
      {!loading && (!selectedStandard || !selectedExam) && (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
            Select a Standard and Exam Type to configure components.
          </p>
        </div>
      )}

      {/* ── No Subjects ── */}
      {!loading &&
        selectedStandard &&
        selectedExam &&
        subjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
              No subjects are assigned to Standard {selectedStandard}.
            </p>
          </div>
        )}

      {/* ── Per-Subject Cards ── */}
      {!loading &&
        subjects.map((subj) => {
          const rows = drafts[subj.subject_id] || [];
          return (
            <div
              key={subj.subject_id}
              className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xs overflow-visible"
            >
              {/* Card Header Bar */}
              <div className="px-5 sm:px-6 py-4 border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-[#1769FF] dark:text-[#3B82F6]" />
                  <h2 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {subj.subject_name}
                  </h2>
                  <span className="inline-flex px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700">
                    {subj.subject_code || '—'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {rows.length} component{rows.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Component Table */}
              {rows.length > 0 && (
                <div className="overflow-visible">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                      <tr>
                        <th className="px-5 sm:px-6 py-3.5">Code</th>
                        <th className="px-5 sm:px-6 py-3.5">Label</th>
                        <th className="px-5 sm:px-6 py-3.5 text-center">
                          Max Marks
                        </th>
                        <th className="px-5 sm:px-6 py-3.5 text-center">
                          Order
                        </th>
                        <th className="px-5 sm:px-6 py-3.5 text-right w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#253044]">
                      {rows.map((r, idx) => (
                        <tr
                          key={r.tempId}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* ── Code cell: input + chevron picker ── */}
                          <td className="px-5 sm:px-6 py-3.5">
                            <div
                              className="relative inline-flex items-stretch"
                              ref={
                                openPickerFor === r.tempId
                                  ? pickerRef
                                  : undefined
                              }
                            >
                              <input
                                type="text"
                                value={r.component_code}
                                onChange={(e) =>
                                  updateRow(subj.subject_id, r.tempId, {
                                    component_code:
                                      e.target.value.toUpperCase(),
                                  })
                                }
                                placeholder="ORAL"
                                className="w-28 h-8 pl-2.5 pr-1 rounded-l-lg border border-r-0 border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] font-mono text-xs uppercase outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#1769FF]/30"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenPickerFor(
                                    openPickerFor === r.tempId
                                      ? null
                                      : r.tempId
                                  )
                                }
                                className="inline-flex items-center justify-center w-7 h-8 rounded-r-lg border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Choose from existing codes"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {openPickerFor === r.tempId && (
                                <div className="absolute z-50 left-0 top-full mt-1 w-56 max-h-[420px] overflow-y-auto rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-lg">
                                  {codeOptions.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-[#94A3B8]">
                                      No saved codes yet
                                    </div>
                                  ) : (
                                    codeOptions.map((opt) => (
                                      <button
                                        key={opt.component_code}
                                        type="button"
                                        onClick={() =>
                                          pickCode(
                                            subj.subject_id,
                                            r.tempId,
                                            opt.component_code,
                                            opt.common_label
                                          )
                                        }
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                      >
                                        <div className="font-mono text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                                          {opt.component_code}
                                        </div>
                                        <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                          {opt.common_label}
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-5 sm:px-6 py-3.5">
                            <input
                              type="text"
                              value={r.display_label}
                              onChange={(e) =>
                                updateRow(subj.subject_id, r.tempId, {
                                  display_label: e.target.value,
                                })
                              }
                              placeholder="Label"
                              className="w-40 h-8 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#1769FF]/30"
                            />
                          </td>

                          <td className="px-5 sm:px-6 py-3.5 text-center">
                            <input
                              type="number"
                              value={r.max_marks}
                              min="0.01"
                              step="0.01"
                              onChange={(e) =>
                                updateRow(subj.subject_id, r.tempId, {
                                  max_marks: e.target.value,
                                })
                              }
                              placeholder="0"
                              className="w-24 h-8 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-center font-mono text-xs font-bold outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#1769FF]/30"
                            />
                          </td>

                          <td className="px-5 sm:px-6 py-3.5 text-center">
                            <span
                              title="Auto-computed from position"
                              className="inline-flex items-center justify-center w-16 h-8 rounded-lg border border-[#E2E8F0] dark:border-[#253044] bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] font-mono text-xs font-bold select-none"
                            >
                              {idx + 1}
                            </span>
                          </td>

                          <td className="px-5 sm:px-6 py-3.5 text-right">
                            <button
                              onClick={() =>
                                removeRow(subj.subject_id, r.tempId)
                              }
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/70 transition-colors cursor-pointer"
                              title="Remove component"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Card Footer Bar */}
              <div className="px-5 sm:px-6 py-3 border-t border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] rounded-b-2xl">
                <button
                  onClick={() => addRow(subj.subject_id)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg font-heading text-[11px] font-bold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Component</span>
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default SubjectMaxMarksConfig;