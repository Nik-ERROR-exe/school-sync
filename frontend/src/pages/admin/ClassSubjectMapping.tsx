import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { Plus, Trash2, Save, X, CheckSquare, Square } from 'lucide-react';

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

  // Multi‑select state
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

  // Pre‑fill the selected IDs when opening the modal
  useEffect(() => {
    if (showEditModal && selectedClass) {
      const currentClass = classes.find((c) => c.id === selectedClass);
      const currentIds = currentClass?.subjects?.map((s) => s.id) || [];
      setSelectedSubjectIds(currentIds);
    }
  }, [showEditModal, selectedClass, classes]);

  const currentClass = classes.find((c) => c.id === selectedClass);
  const classSubjects = currentClass?.subjects || [];

  // List of subjects that can be added / toggled
  const subjectsToShow = allSubjects;

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
      // Update the class list in state
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClass ? response.data : c))
      );
      toast.success('Subjects updated!');
      setShowEditModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update subjects');
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

      // Add to global subjects list
      setAllSubjects((prev) => [...prev, createdSubject]);

      // Automatically add the new subject to the current selection and open the modal
      setSelectedSubjectIds((prev) => [...prev, createdSubject.id]);

      toast.success(`Subject "${newSubjectName}" created! Now add it in the modal.`);
      setNewSubjectName('');
      setNewSubjectCode('');
      setShowCreateSubject(false);
      // Open the edit modal so the admin can save the list
      setShowEditModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSingleSubject = async (subjectId: number) => {
    // Quick removal using the modal's multi‑select pattern is simpler,
    // but we keep this for one‑click removal.
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
          onChange={(e) => {
            setSelectedClass(e.target.value ? Number(e.target.value) : '');
            setShowEditModal(false);
          }}
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
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <CheckSquare className="h-4 w-4" />
              Manage Subjects (Multi‑select)
            </button>
            <button
              onClick={() => {
                setShowCreateSubject(!showCreateSubject);
                setShowEditModal(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Create New Subject
            </button>
          </div>

          {/* Multi‑select Modal */}
          {showEditModal && (
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Select Subjects for Standard {currentClass?.class_name} - {currentClass?.division}</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {subjectsToShow.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {subject.subject_name} <span className="text-gray-400">({subject.code})</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSubjects}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Create New Subject Form */}
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
            </div>
          )}

          {/* Current Subjects List */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold">
                Subjects for Standard {currentClass?.class_name} - {currentClass?.division}
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
                      onClick={() => handleRemoveSingleSubject(subject.id)}
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