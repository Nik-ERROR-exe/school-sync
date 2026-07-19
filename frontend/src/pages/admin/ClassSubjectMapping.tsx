import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { Plus, Trash2, Save } from 'lucide-react';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');

  // Load classes
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

  // Load all subjects
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

  const currentClass = classes.find((c) => c.id === selectedClass);
  const classSubjects = currentClass?.subjects || [];
  const availableSubjects = allSubjects.filter(
    (s) => !classSubjects.some((cs) => cs.id === s.id)
  );

  const handleAddSubject = async () => {
    if (!selectedClass || !newSubjectId) {
      toast.error('Please select class and subject');
      return;
    }

    setLoading(true);
    try {
      const currentIds = classSubjects.map((s) => s.id);
      if (currentIds.includes(Number(newSubjectId))) {
        toast.error('Subject already added');
        return;
      }

      const response = await api.put(`/admin/classes/${selectedClass}/subjects`, {
        subject_ids: [...currentIds, Number(newSubjectId)]
      });

      // Update classes in local state
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClass ? response.data : c))
      );
      toast.success('Subject added to class!');
      setShowAddForm(false);
      setNewSubjectId('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add subject');
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

      // Add to allSubjects list so it's available globally
      setAllSubjects((prev) => [...prev, createdSubject]);

      const currentIds = classSubjects.map((s) => s.id);
      const putResponse = await api.put(`/admin/classes/${selectedClass}/subjects`, {
        subject_ids: [...currentIds, createdSubject.id]
      });

      // Update classes in local state
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClass ? putResponse.data : c))
      );

      toast.success(`Subject "${newSubjectName}" created and added to class!`);
      setNewSubjectName('');
      setNewSubjectCode('');
      setShowCreateSubject(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubject = async (subjectId: number) => {
    if (!selectedClass) return;
    if (!window.confirm('Remove this subject from the class?')) return;

    setLoading(true);
    try {
      const remainingIds = classSubjects.map((s) => s.id).filter((id) => id !== subjectId);
      const response = await api.put(`/admin/classes/${selectedClass}/subjects`, {
        subject_ids: remainingIds
      });

      // Update classes in local state
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClass ? response.data : c))
      );
      toast.success('Subject removed from class!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📚 Class Subject Management</h1>
        <p className="text-sm text-gray-500">Assign subjects to each class</p>
      </div>

      {/* Select Class */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <label className="block text-sm font-medium mb-2">Select Class</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
          className="w-full md:w-64 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a Class --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              Standard {c.class_name} - {c.division}
            </option>
          ))}
        </select>
      </div>

      {selectedClass && (
        <>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(true);
                setShowCreateSubject(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Existing Subject
            </button>
            <button
              onClick={() => {
                setShowCreateSubject(true);
                setShowAddForm(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Create New Subject
            </button>
          </div>

          {showAddForm && (
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-4">
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name} ({s.code})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddSubject}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showCreateSubject && (
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h4 className="font-medium mb-3">Create New Subject</h4>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Subject Name (e.g., Physics)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Code (e.g., PHY)"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                  className="w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateAndAddSubject}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Create & Add
                </button>
                <button
                  onClick={() => setShowCreateSubject(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This will create a new subject and immediately add it to the selected class.
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold">
                Subjects for Standard {currentClass?.class_name} -{' '}
                {currentClass?.division}
              </h3>
              <span className="text-sm text-gray-500">{classSubjects.length} subjects</span>
            </div>
            <div className="divide-y">
              {classSubjects.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No subjects assigned to this class
                </div>
              ) : (
                classSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium">{subject.subject_name}</span>
                      <span className="ml-2 text-sm text-gray-400">({subject.code})</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSubject(subject.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClassSubjectMapping;