import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { Loader2, GraduationCap, Search, Trash2, Plus, X, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { ApiClass, ApiSubject } from '../../features/timetable/types';

interface ClassWithSubjects extends ApiClass {
  subjects?: ApiSubject[];
}

export default function ClassManagement() {
  const [activeTab, setActiveTab] = useState<'assignment' | 'subjects'>('assignment');
  const [classes, setClasses] = useState<ClassWithSubjects[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassWithSubjects | null>(null);
  
  // Loading and action states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [classSubLoading, setClassSubLoading] = useState(false);
  
  // Modals / forms state
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDivision, setNewClassDivision] = useState('');
  
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');

  const [subjectSearch, setSubjectSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        api.get('/admin/classes/'),
        api.get('/admin/subjects/'),
      ]);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      
      // Auto-select or update the selected class reference if it exists
      if (selectedClass) {
        const updatedSelected = classesRes.data.find((c: any) => c.id === selectedClass.id);
        if (updatedSelected) {
          setSelectedClass(updatedSelected);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load classes or subjects');
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (selectedClass?.id === classId) {
        setSelectedClass(null);
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete class');
    } finally {
      setActionLoading(false);
    }
  };

  // Subject Management Handlers
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !newSubjectCode.trim()) {
      toast.error('All fields are required');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/admin/subjects/', {
        subject_name: newSubjectName.trim(),
        code: newSubjectCode.trim().toUpperCase(),
      });
      toast.success('Subject created successfully!');
      setNewSubjectName('');
      setNewSubjectCode('');
      setShowAddSubject(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create subject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: number) => {
    if (!window.confirm('Are you sure you want to delete this subject? This will fail if the subject is assigned to classes or weekly requirements.')) {
      return;
    }
    setActionLoading(true);
    try {
      await api.delete(`/admin/subjects/${subjectId}`);
      toast.success('Subject deleted successfully!');
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete subject');
    } finally {
      setActionLoading(false);
    }
  };

  // Class Subject Assignment Handlers
  const handleUpdateSubjects = async (nextSubjectIds: number[]) => {
    if (!selectedClass) return;
    setClassSubLoading(true);
    try {
      const res = await api.put(`/admin/classes/${selectedClass.id}/subjects`, {
        subject_ids: nextSubjectIds,
      });
      setSelectedClass(res.data);
      // Update local classes list state
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? res.data : c));
      toast.success('Subjects updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update subjects');
    } finally {
      setClassSubLoading(false);
    }
  };

  const handleAddSubjectToClass = (subjectId: number) => {
    const currentIds = selectedClass?.subjects?.map(s => s.id) || [];
    if (currentIds.includes(subjectId)) return;
    handleUpdateSubjects([...currentIds, subjectId]);
  };

  const handleRemoveSubjectFromClass = (subjectId: number) => {
    const currentIds = selectedClass?.subjects?.map(s => s.id) || [];
    handleUpdateSubjects(currentIds.filter(id => id !== subjectId));
  };

  // Filtering
  const filteredClasses = classes.filter(c =>
    c.class_name.toLowerCase().includes(classSearch.toLowerCase()) ||
    c.division.toLowerCase().includes(classSearch.toLowerCase())
  );

  const assignedSubjects = selectedClass?.subjects || [];
  const assignedSubjectIds = assignedSubjects.map(s => s.id);

  const availableSubjects = subjects.filter(s => !assignedSubjectIds.includes(s.id));

  const filteredAssignedSubjects = assignedSubjects.filter(s =>
    s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const filteredAvailableSubjects = availableSubjects.filter(s =>
    s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-blue-600" /> Class & Subject Management
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Configure school classes, subjects, and map which subjects are taught in which classes.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start border border-slate-200">
          <button
            onClick={() => setActiveTab('assignment')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'assignment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Assign Subjects
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'subjects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Manage Subjects
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
          <span className="text-sm font-semibold">Loading data…</span>
        </div>
      ) : activeTab === 'assignment' ? (
        /* ASSIGNMENT VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Classes List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[650px] relative">
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
                    className={`group w-full rounded-xl transition-all flex items-center justify-between p-2.5 ${
                      selectedClass?.id === cls.id
                        ? 'bg-blue-50/70 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedClass(cls)}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        selectedClass?.id === cls.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {cls.class_name}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800">Class {cls.class_name} - {cls.division}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {cls.subjects?.length || 0} subjects assigned
                        </span>
                      </div>
                    </button>
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

          {/* Right Column: Class Subjects Assignment panel */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[650px] relative">
            {classSubLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            )}

            {selectedClass ? (
              <>
                {/* Panel Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-md font-bold text-slate-900">
                      Subjects for Class {selectedClass.class_name} - {selectedClass.division}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Instantly click buttons to assign or remove subjects from this class standard.
                    </p>
                  </div>
                </div>

                {/* Subject Search */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-white sticky top-0">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search subjects in this view…"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full text-xs outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                {/* Double Panel grid: Assigned vs Available */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden">
                  
                  {/* Left list: Assigned Subjects */}
                  <div className="flex flex-col overflow-y-auto p-5 space-y-3 h-full">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white pb-1.5">
                      Assigned Subjects ({filteredAssignedSubjects.length})
                    </h4>
                    {filteredAssignedSubjects.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">No subjects currently assigned.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAssignedSubjects.map(subj => (
                          <div
                            key={subj.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/30 text-blue-900"
                          >
                            <div>
                              <span className="text-xs font-bold block">{subj.subject_name}</span>
                              <span className="text-[9px] text-blue-500 block font-mono uppercase mt-0.5">{subj.code}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveSubjectFromClass(subj.id)}
                              className="p-1 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove subject"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right list: Available Subjects */}
                  <div className="flex flex-col overflow-y-auto p-5 space-y-3 h-full">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white pb-1.5">
                      Available Subjects ({filteredAvailableSubjects.length})
                    </h4>
                    {filteredAvailableSubjects.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">No remaining available subjects.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAvailableSubjects.map(subj => (
                          <div
                            key={subj.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all group"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">{subj.subject_name}</span>
                              <span className="text-[9px] text-slate-400 block font-mono uppercase mt-0.5">{subj.code}</span>
                            </div>
                            <button
                              onClick={() => handleAddSubjectToClass(subj.id)}
                              className="p-1 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-all"
                              title="Add subject"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-4 border-slate-100/50">
                  <BookOpen className="text-slate-400" size={24} />
                </div>
                <h3 className="text-md font-bold text-slate-800 mb-1">Select a Class</h3>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                  Select a class from the list on the left to view and assign subjects.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MANAGE SUBJECTS TAB */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto relative">
          {/* Header section with add button */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">All Subjects</h2>
            <button
              onClick={() => setShowAddSubject(true)}
              className="flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} /> Add Subject
            </button>
          </div>

          {/* Add Subject Modal overlay */}
          {showAddSubject && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex items-center justify-center p-4">
              <form onSubmit={handleAddSubject} className="bg-white rounded-xl p-5 w-full max-w-xs shadow-xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Add New Subject</h3>
                  <button type="button" onClick={() => setShowAddSubject(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Subject Name *</label>
                    <input
                      type="text"
                      placeholder='e.g., "Mathematics", "Science"'
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Subject Code *</label>
                    <input
                      type="text"
                      placeholder='e.g., "MATH", "SCI"'
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSubject(false)}
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

          {/* Subjects Search */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-white sticky top-0">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search subjects by name or code…"
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full text-xs outline-none text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Subjects List Grid */}
          <div className="p-6 overflow-y-auto max-h-[500px]">
            {subjects.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p>No subjects found. Click "Add Subject" to create one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subjects
                  .filter(s =>
                    s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                    s.code.toLowerCase().includes(subjectSearch.toLowerCase())
                  )
                  .map(subj => (
                    <div
                      key={subj.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{subj.subject_name}</span>
                        <span className="text-[9px] text-slate-400 block font-mono uppercase mt-0.5">{subj.code}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSubject(subj.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
