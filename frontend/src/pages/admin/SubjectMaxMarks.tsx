import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { resultApi, subjectMaxMarksApi, ExamType, Subject, SubjectMaxMarks } from '../../api/results';
import { Settings, Save, Trash2, Plus, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
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

  const [editAkarikh, setEditAkarikh] = useState<{ [key: number]: string }>({});
  const [editOral, setEditOral] = useState<{ [key: number]: string }>({});
  const [editWritten, setEditWritten] = useState<{ [key: number]: string }>({});

  const [newAkarikh, setNewAkarikh] = useState<{ [subId: number]: string }>({});
  const [newOral, setNewOral] = useState<{ [subId: number]: string }>({});
  const [newWritten, setNewWritten] = useState<{ [subId: number]: string }>({});

  const [dirtyItems, setDirtyItems] = useState<Set<number>>(new Set());

  const [copyFromExam, setCopyFromExam] = useState<number | ''>('');
  const [copying, setCopying] = useState<boolean>(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const exams = await resultApi.getExamTypes();
        setExamTypes(exams);
        if (exams.length > 0) {
          setSelectedExam(exams[0].id);
        }
      } catch {
        toast.error('Failed to load exam types');
      }
    };
    fetchExams();
  }, []);

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

        const initialEdits: { [key: number]: string } = {};
        const initialOral: { [key: number]: string } = {};
        const initialWritten: { [key: number]: string } = {};
        configs.forEach(c => {
          initialEdits[c.id] = String(c.akarikh_max ?? 0);
          initialOral[c.id] = String(c.oral_max ?? 0);
          initialWritten[c.id] = String(c.written_max ?? 0);
        });
        setEditAkarikh(initialEdits);
        setEditOral(initialOral);
        setEditWritten(initialWritten);
        setDirtyItems(new Set());
        setNewAkarikh({});
        setNewOral({});
        setNewWritten({});
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

  const handleEditChange = (id: number, component: 'akarikh' | 'oral' | 'written', value: string) => {
    if (component === 'akarikh') {
      setEditAkarikh(prev => ({ ...prev, [id]: value }));
    } else if (component === 'oral') {
      setEditOral(prev => ({ ...prev, [id]: value }));
    } else {
      setEditWritten(prev => ({ ...prev, [id]: value }));
    }

    const item = configuredItems.find(c => c.id === id);
    const originalAkarikh = String(item?.akarikh_max ?? 0);
    const originalOral = String(item?.oral_max ?? 0);
    const originalWritten = String(item?.written_max ?? 0);
    const currentAkarikh = component === 'akarikh' ? value : (editAkarikh[id] ?? originalAkarikh);
    const currentOral = component === 'oral' ? value : (editOral[id] ?? originalOral);
    const currentWritten = component === 'written' ? value : (editWritten[id] ?? originalWritten);

    if (currentAkarikh !== originalAkarikh || currentOral !== originalOral || currentWritten !== originalWritten) {
      setDirtyItems(prev => new Set(prev).add(id));
    } else {
      setDirtyItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleSaveAll = async () => {
    if (dirtyItems.size === 0) {
      toast('No changes to save');
      return;
    }

    const updates: { id: number; akarikh_max: number; oral_max: number; written_max: number }[] = [];
    for (const id of dirtyItems) {
      const a = parseFloat(editAkarikh[id] || '0') || 0;
      const o = parseFloat(editOral[id] || '0') || 0;
      const w = parseFloat(editWritten[id] || '0') || 0;
      if (a + o + w <= 0) {
        toast.error('Total max marks must be greater than 0');
        return;
      }
      updates.push({ id, akarikh_max: a, oral_max: o, written_max: w });
    }

    setSaving(true);
    try {
      await api.put('/admin/subject-max-marks/batch', { updates });
      toast.success('All configurations saved');
      // Refresh
      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const initialEdits: { [key: number]: string } = {};
      const initialOral: { [key: number]: string } = {};
      const initialWritten: { [key: number]: string } = {};
      configs.forEach(c => {
        initialEdits[c.id] = String(c.akarikh_max ?? 0);
        initialOral[c.id] = String(c.oral_max ?? 0);
        initialWritten[c.id] = String(c.written_max ?? 0);
      });
      setEditAkarikh(initialEdits);
      setEditOral(initialOral);
      setEditWritten(initialWritten);
      setDirtyItems(new Set());
      setNewAkarikh({});
      setNewOral({});
      setNewWritten({});
    } catch (error: any) {
      console.error('Batch save error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save configurations');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (subjectId: number) => {
    const a = parseFloat(newAkarikh[subjectId] || '0') || 0;
    const o = parseFloat(newOral[subjectId] || '0') || 0;
    const w = parseFloat(newWritten[subjectId] || '0') || 0;
    if (a + o + w <= 0) {
      toast.error('Total max marks must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      await subjectMaxMarksApi.create({
        class_name: selectedStandard,
        subject_id: subjectId,
        exam_type_id: Number(selectedExam),
        akarikh_max: a,
        oral_max: o,
        written_max: w,
      });
      toast.success('Configuration created');
      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const initialEdits: { [key: number]: string } = {};
      const initialOral: { [key: number]: string } = {};
      const initialWritten: { [key: number]: string } = {};
      configs.forEach(c => {
        initialEdits[c.id] = String(c.akarikh_max ?? 0);
        initialOral[c.id] = String(c.oral_max ?? 0);
        initialWritten[c.id] = String(c.written_max ?? 0);
      });
      setEditAkarikh(initialEdits);
      setEditOral(initialOral);
      setEditWritten(initialWritten);
      setDirtyItems(new Set());
      setNewAkarikh({});
      setNewOral({});
      setNewWritten({});
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await subjectMaxMarksApi.delete(id);
      toast.success('Deleted');
      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const initialEdits: { [key: number]: string } = {};
      const initialOral: { [key: number]: string } = {};
      const initialWritten: { [key: number]: string } = {};
      configs.forEach(c => {
        initialEdits[c.id] = String(c.akarikh_max ?? 0);
        initialOral[c.id] = String(c.oral_max ?? 0);
        initialWritten[c.id] = String(c.written_max ?? 0);
      });
      setEditAkarikh(initialEdits);
      setEditOral(initialOral);
      setEditWritten(initialWritten);
      setDirtyItems(new Set());
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleCopy = async () => {
    if (!copyFromExam || !selectedExam) return;
    setCopying(true);
    try {
      await subjectMaxMarksApi.copy(Number(copyFromExam), Number(selectedExam), selectedStandard || undefined);
      toast.success('Copied from exam');
      const [configs, missing] = await Promise.all([
        subjectMaxMarksApi.list(selectedStandard, Number(selectedExam)),
        subjectMaxMarksApi.getMissing(selectedStandard, Number(selectedExam))
      ]);
      setConfiguredItems(configs);
      setMissingSubjects(missing);
      const initialEdits: { [key: number]: string } = {};
      const initialOral: { [key: number]: string } = {};
      const initialWritten: { [key: number]: string } = {};
      configs.forEach(c => {
        initialEdits[c.id] = String(c.akarikh_max ?? 0);
        initialOral[c.id] = String(c.oral_max ?? 0);
        initialWritten[c.id] = String(c.written_max ?? 0);
      });
      setEditAkarikh(initialEdits);
      setEditOral(initialOral);
      setEditWritten(initialWritten);
      setDirtyItems(new Set());
      setNewAkarikh({});
      setNewOral({});
      setNewWritten({});
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to copy');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subject Max Marks (Component-Based)</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Standard</label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Exam Type</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Exam</option>
              {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSaveAll}
              disabled={saving || dirtyItems.size === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        {/* Copy panel */}
        <div className="mt-4 flex items-center gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
          <Copy className="w-4 h-4 text-amber-600" />
          <label className="text-sm font-medium">Copy from exam:</label>
          <select
            value={copyFromExam}
            onChange={(e) => setCopyFromExam(e.target.value ? Number(e.target.value) : '')}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="">Select source exam</option>
            {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={handleCopy} disabled={copying || !copyFromExam} className="px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700">
            {copying ? 'Copying...' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Configured table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-bold">Subject</th>
              <th className="px-4 py-3 text-left font-bold">Code</th>
              <th className="px-4 py-3 text-center font-bold">Akarikh (आका)</th>
              <th className="px-4 py-3 text-center font-bold">Oral (तोंडी)</th>
              <th className="px-4 py-3 text-center font-bold">Written (लेखी)</th>
              <th className="px-4 py-3 text-center font-bold">Total</th>
              <th className="px-4 py-3 text-center font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {configuredItems.map((item) => {
              const isDirty = dirtyItems.has(item.id);
              return (
                <tr key={item.id} className={isDirty ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3">{item.subject_name}</td>
                  <td className="px-4 py-3">{item.subject_code}</td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      value={editAkarikh[item.id] ?? ''}
                      onChange={(e) => handleEditChange(item.id, 'akarikh', e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-center"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      value={editOral[item.id] ?? ''}
                      onChange={(e) => handleEditChange(item.id, 'oral', e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-center"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      value={editWritten[item.id] ?? ''}
                      onChange={(e) => handleEditChange(item.id, 'written', e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-center"
                      min="0"
                    />
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    {(parseFloat(editAkarikh[item.id] || '0') || 0) + (parseFloat(editOral[item.id] || '0') || 0) + (parseFloat(editWritten[item.id] || '0') || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Missing subjects banner */}
      {missingSubjects.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h3 className="font-bold text-amber-900 mb-3">Missing Configurations (add below)</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-center">Akarikh (आका)</th>
                <th className="px-4 py-2 text-center">Oral (तोंडी)</th>
                <th className="px-4 py-2 text-center">Written (लेखी)</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {missingSubjects.map(sub => (
                <tr key={sub.id}>
                  <td className="px-4 py-2">{sub.subject_name}</td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      value={newAkarikh[sub.id] ?? ''}
                      onChange={(e) => setNewAkarikh(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      className="w-20 px-2 py-1 border rounded text-center"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      value={newOral[sub.id] ?? ''}
                      onChange={(e) => setNewOral(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      className="w-20 px-2 py-1 border rounded text-center"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      value={newWritten[sub.id] ?? ''}
                      onChange={(e) => setNewWritten(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      className="w-20 px-2 py-1 border rounded text-center"
                      min="0"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleCreate(sub.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SubjectMaxMarksConfig;
