import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  resultApi,
  subjectExamComponentsApi,
  ExamType,
  SubjectWithComponents,
  SubjectExamComponentItem,
} from '../../api/results';
import { Save, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import api from '../../api';

const STANDARDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

interface DraftRow {
  tempId: string;
  id: number | null;
  component_code: string;
  display_label: string;
  max_marks: string;
  display_order: string;
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
  display_order: String(item.display_order),
  original: item,
});

const emptyDraft = (nextOrder: number): DraftRow => ({
  tempId: newTempId(),
  id: null,
  component_code: '',
  display_label: '',
  max_marks: '100',
  display_order: String(nextOrder),
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

  useEffect(() => {
    const fetchCodeOptions = async () => {
      try {
        const response = await api.get(
          '/admin/subject-exam-components/distinct-codes'
        );
        setCodeOptions(response.data);
      } catch {
        // silently ignore — the dropdown just stays empty
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
          nextDrafts[subj.subject_id] = [emptyDraft(1)];
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
      const nextOrder = rows.length + 1;
      return { ...prev, [subjectId]: [...rows, emptyDraft(nextOrder)] };
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

  const isDirty = useMemo(() => {
    if (deletedIds.size > 0) return true;
    for (const rows of Object.values(drafts)) {
      for (const r of rows) {
        if (r.id === null) return true;
        if (!r.original) return true;
        if (
          r.display_label !== r.original.display_label ||
          parseFloat(r.max_marks) !== r.original.max_marks ||
          parseInt(r.display_order, 10) !== r.original.display_order
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
      for (const r of rows) {
        const code = r.component_code.trim();
        const label = r.display_label.trim();
        const max = parseFloat(r.max_marks);
        const order = parseInt(r.display_order, 10);
        if (!code) {
          toast.error(
            `Subject ${subj.subject_name}: component code is required`
          );
          return;
        }
        if (!/^[A-Z0-9_-]+$/i.test(code)) {
          toast.error(
            `Subject ${subj.subject_name}: code "${code}" may only contain letters, digits, _ and -`
          );
          return;
        }
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
        if (isNaN(order) || order < 0) {
          toast.error(
            `Subject ${subj.subject_name}: order must be >= 0`
          );
          return;
        }
        items.push({
          class_name: selectedStandard,
          subject_id: subj.subject_id,
          exam_type_id: Number(selectedExam),
          component_code: code.toUpperCase(),
          display_label: label,
          max_marks: max,
          display_order: order,
        });
      }
    }

    setSaving(true);
    try {
      if (items.length > 0) {
        await subjectExamComponentsApi.batch(items);
      }
      for (const id of Array.from(deletedIds)) {
        await subjectExamComponentsApi.delete(id);
      }
      toast.success('Configuration saved');
      await fetchSubjects();
    } catch (error: any) {
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
    <div className="space-y-6">
      <datalist id="component-code-options">
        {codeOptions.map((opt) => (
          <option key={opt.component_code} value={opt.component_code}>
            {opt.common_label}
          </option>
        ))}
      </datalist>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Subject Components Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Define marks components (e.g. आका / तोंडी / लेखी) per subject
            and exam. Unit Tests typically have one component; Semesters
            typically have three or more.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving || !isDirty}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All
            </>
          )}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Standard
            </label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STANDARDS.map((s) => (
                <option key={s} value={s}>
                  Standard {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Exam Type
            </label>
            <select
              value={selectedExam}
              onChange={(e) =>
                setSelectedExam(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Loading subjects...
          </p>
        </div>
      )}

      {!loading && (!selectedStandard || !selectedExam) && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            Select a Standard and Exam Type to configure components.
          </p>
        </div>
      )}

      {!loading &&
        selectedStandard &&
        selectedExam &&
        subjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              No subjects are assigned to Standard {selectedStandard}.
            </p>
          </div>
        )}

      {!loading &&
        subjects.map((subj) => {
          const rows = drafts[subj.subject_id] || [];
          return (
            <div
              key={subj.subject_id}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800">
                    {subj.subject_name}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({subj.subject_code})
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {rows.length} component{rows.length === 1 ? '' : 's'}
                </span>
              </div>

              <table className="min-w-full text-sm">
                <thead className="bg-white border-b">
                  <tr className="text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Label</th>
                    <th className="px-4 py-2 text-center">Max Marks</th>
                    <th className="px-4 py-2 text-center">Order</th>
                    <th className="px-4 py-2 text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => {
                    const locked = r.id !== null;
                    return (
                      <tr key={r.tempId}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            list="component-code-options"
                            value={r.component_code}
                            disabled={locked}
                            onChange={(e) => {
                              const nextCode = e.target.value;
                              const patch: Partial<DraftRow> = {
                                component_code: nextCode,
                              };
                              if (!r.display_label.trim()) {
                                const match = codeOptions.find(
                                  (opt) =>
                                    opt.component_code === nextCode.trim()
                                );
                                if (match) patch.display_label = match.common_label;
                              }
                              updateRow(subj.subject_id, r.tempId, patch);
                            }}
                            placeholder="AKARIKH"
                            className="w-32 px-2 py-1 border rounded font-mono text-xs disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={r.display_label}
                            onChange={(e) =>
                              updateRow(subj.subject_id, r.tempId, {
                                display_label: e.target.value,
                              })
                            }
                            placeholder="आका"
                            className="w-40 px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
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
                            className="w-24 px-2 py-1 border rounded text-center font-mono"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            value={r.display_order}
                            min="0"
                            step="1"
                            onChange={(e) =>
                              updateRow(subj.subject_id, r.tempId, {
                                display_order: e.target.value,
                              })
                            }
                            className="w-16 px-2 py-1 border rounded text-center font-mono"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() =>
                              removeRow(subj.subject_id, r.tempId)
                            }
                            className="text-red-600 hover:text-red-800"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="px-4 py-3 bg-gray-50 border-t">
                <button
                  onClick={() => addRow(subj.subject_id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Component
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default SubjectMaxMarksConfig;
