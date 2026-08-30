import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { resultApi, subjectMaxMarksApi, ExamType, Subject, SubjectMaxMarks } from '../../api/results';
import { Settings, Save, Trash2, Plus, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import api from '../../api'; // for direct API call to batch endpoint

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
          subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
        ]);

        setConfiguredItems(configs);
        setMissingSubjects(missing);

        // Initialize edit values from fetched configs
        const initialEdits: { [key: number]: string } = {};
        configs.forEach(c => {
          initialEdits[c.id] = String(c.max_marks);
        });
        setEditValues(initialEdits);
        setDirtyItems(new Set()); // reset dirty tracking
        setNewValues({});
      } catch (error: any) {
        // Log the full error to console for debugging
        console.error('Failed to load subject max marks configuration:', error);
        // Show a more specific error message
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
    setEditValues(prev => ({ ...prev, [id]: value }));

    // Find original value
    const original = configuredItems.find(c => c.id === id)?.max_marks;
    const currentVal = parseFloat(value);
    if (original !== undefined && !isNaN(currentVal) && currentVal !== original) {
      setDirtyItems(prev => new Set(prev).add(id));
    } else {
      // If value is empty or same as original, remove from dirty set
      if (value === '' || (original !== undefined && currentVal === original)) {
        setDirtyItems(prev => {
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
    dirtyItems.forEach(id => {
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
    try {
      const response = await api.put('/admin/subject-max-marks/batch', { updates });
      // Update local state with new values
      setConfiguredItems(response.data);
      // Reset edit values and dirty set
      const newEdits: { [key: number]: string } = {};
      response.data.forEach((item: any) => {
        newEdits[item.id] = String(item.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
      toast.success(`Successfully updated ${updates.length} configuration(s)`);
    } catch (error: any) {
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
      // Refresh list and missing
      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      // Reset edit values and dirty
      const newEdits: { [key: number]: string } = {};
      configs.forEach(c => {
        newEdits[c.id] = String(c.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete configuration');
    }
  };

  // Individual create for missing subject (unchanged)
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
        max_marks: val
      });
      toast.success('Subject max marks configured successfully!');

      // Refresh list and missing
      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      // Reset edit values and dirty
      const newEdits: { [key: number]: string } = {};
      configs.forEach(c => {
        newEdits[c.id] = String(c.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
      setNewValues({});
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail || 'Failed to configure max marks');
    }
  };

  const selectedExamName = examTypes.find(e => e.id === selectedExam)?.name || '';

  const handleCopyFromExamType = async () => {
    if (!copyFromExam || copyFromExam === Number(selectedExam)) {
      toast.error('Please select a different exam type to copy from');
      return;
    }

    const sourceName = examTypes.find(e => e.id === copyFromExam)?.name || '';
    if (!window.confirm(`Copy max marks from "${sourceName}" to "${selectedExamName}" for Standard ${selectedStandard}?\n\nExisting configurations will be skipped.`)) {
      return;
    }

    setCopying(true);
    try {
      const result = await subjectMaxMarksApi.copy(
        Number(copyFromExam),
        Number(selectedExam),
        selectedStandard
      );
      toast.success(`Copied ${result.length} max marks configuration(s) from "${sourceName}"`);

      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const newEdits: { [key: number]: string } = {};
      configs.forEach(c => {
        newEdits[c.id] = String(c.max_marks);
      });
      setEditValues(newEdits);
      setDirtyItems(new Set());
      setNewValues({});
      setCopyFromExam('');
    } catch (error: any) {
      console.error('Copy error:', error);
      toast.error(error.response?.data?.detail || 'Failed to copy configurations');
    } finally {
      setCopying(false);
    }
  };

  const availableSourceExams = examTypes.filter(e => e.id !== selectedExam);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Subject Max Marks Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure maximum marks per Standard and Exam Type according to school official scheme.
          </p>
        </div>
        {/* Save All button placed in header */}
        {configuredItems.length > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={saving || dirtyItems.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : `Save All (${dirtyItems.size})`}
          </button>
        )}
      </div>

      {/* Selector Section (unchanged) */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Standard (Class Level)</label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STANDARDS.map(std => (
                <option key={std} value={std}>
                  Standard {std}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Exam Type</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {examTypes.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Copy from another exam type */}
      {availableSourceExams.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
            <Copy className="h-4 w-4" />
            Copy Max Marks from Another Exam Type
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Quickly reuse max marks from an exam type you've already configured for Standard {selectedStandard}.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={copyFromExam}
              onChange={(e) => setCopyFromExam(e.target.value ? Number(e.target.value) : '')}
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select source exam type...</option>
              {availableSourceExams.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <button
              onClick={handleCopyFromExamType}
              disabled={!copyFromExam || copying}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {copying ? 'Copying...' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-500">Loading configurations...</div>
      )}

      {!loading && (
        <>
          {/* Missing Configurations Banner (unchanged) */}
          {missingSubjects.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Unconfigured Subjects for Standard {selectedStandard} ({selectedExamName})
              </div>
              <p className="text-sm text-amber-700 mb-4">
                The following assigned subjects do not have maximum marks configured yet. Teachers will be blocked from entering results until configured:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {missingSubjects.map(sub => (
                  <div key={sub.id} className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800">{sub.subject_name}</span>
                      <span className="text-xs text-gray-400 ml-2">({sub.code})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Max Marks"
                        value={newValues[sub.id] || ''}
                        onChange={(e) => setNewValues({ ...newValues, [sub.id]: e.target.value })}
                        className="w-24 px-2 py-1 text-sm border rounded text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={() => handleCreate(sub.id)}
                        className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700 flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configured Max Marks Table */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Configured Max Marks — Standard {selectedStandard} ({selectedExamName})
              </h2>
              <span className="text-sm text-gray-500">
                {configuredItems.length} subjects configured
                {dirtyItems.size > 0 && (
                  <span className="ml-2 text-blue-600 font-semibold">
                    ({dirtyItems.size} modified)
                  </span>
                )}
              </span>
            </div>

            {configuredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No subjects configured yet for Standard {selectedStandard} under {selectedExamName}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Subject</th>
                      <th className="px-6 py-3 text-left">Code</th>
                      <th className="px-6 py-3 text-center">Max Marks</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {configuredItems.map(item => {
                      const isDirty = dirtyItems.has(item.id);
                      return (
                        <tr key={item.id} className={isDirty ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {item.subject_name || `Subject #${item.subject_id}`}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {item.subject_code || '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="1"
                              value={editValues[item.id] !== undefined ? editValues[item.id] : item.max_marks}
                              onChange={(e) => handleEditChange(item.id, e.target.value)}
                              className={`w-24 px-3 py-1 border rounded text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDirty ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                              }`}
                            />
                            {isDirty && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">changed</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {/* Individual Save button removed – only Save All */}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 inline-flex items-center gap-1 border border-red-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SubjectMaxMarksConfig;