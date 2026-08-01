import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, X, Upload, Download } from 'lucide-react';
import { studentApi, Student, StudentCreate, StudentBulkUploadResponse } from '../../api/students';
import api from '../../api';

interface Class {
  id: number;
  class_name: string;
  division: string;
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student>>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClassId, setUploadClassId] = useState<number | ''>('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<StudentBulkUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.append('class_id', selectedClass.toString());
      if (search) params.append('search', search);
      
      const studentsRes = await api.get(`/admin/students/?${params.toString()}`);
      setStudents(studentsRes.data);
      
      const classesRes = await api.get('/admin/classes/');
      setClasses(classesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass, search]);
  
  const handleAdd = () => {
    setEditingStudent({ name: '', roll_no: '', class_id: classes[0]?.id || 0 });
    setIsModalOpen(true);
  };
  
  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };
  
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentApi.deleteStudent(id);
      toast.success('Student deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };
  
  const handleSave = async () => {
    if (!editingStudent.name || !editingStudent.roll_no || !editingStudent.class_id) {
      toast.error('All fields are required');
      return;
    }
    
    try {
      if (editingStudent.id) {
        await studentApi.updateStudent(editingStudent.id, editingStudent);
        toast.success('Student updated successfully');
      } else {
        await studentApi.createStudent(editingStudent as StudentCreate);
        toast.success('Student added successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save student');
    }
  };
  
  const getClassDisplay = (class_id: number) => {
    const cls = classes.find(c => c.id === class_id);
    return cls ? `Standard ${cls.class_name} - Division ${cls.division}` : 'Unknown';
  };

  const openUpload = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploadClassId(classes[0]?.id || '');
    setIsUploadOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await studentApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Please choose a file');
      return;
    }
    if (!uploadClassId) {
      toast.error('Please select a default class');
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await studentApi.uploadStudents(uploadFile, uploadClassId);
      setUploadResult(result);
      toast.success(`Upload complete: ${result.inserted} added, ${result.skipped} skipped`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
          <button
            onClick={openUpload}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              Standard {c.class_name} - {c.division}
            </option>
          ))}
        </select>
      </div>
      
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No students found</td></tr>
              ) : (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{s.roll_no}</td>
                    <td className="px-6 py-4">{s.name}</td>
                    <td className="px-6 py-4">{getClassDisplay(s.class_id)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-800 mr-3">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingStudent.id ? 'Edit Student' : 'Add Student'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Roll Number</label>
                <input
                  type="text"
                  value={editingStudent.roll_no || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, roll_no: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Student Name</label>
                <input
                  type="text"
                  value={editingStudent.name || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class</label>
                <select
                  value={editingStudent.class_id || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, class_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      Standard {c.class_name} - {c.division}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Bulk Upload Students</h2>
              <button onClick={() => setIsUploadOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">File (.xlsx or .csv)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Default Class (for rows without Class/Division)
                </label>
                <select
                  value={uploadClassId}
                  onChange={(e) => setUploadClassId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      Standard {c.class_name} - {c.division}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Tip: for rows with Class/Division, use the exact values from Class Management
                  (e.g. "1" / "A").
                </p>
              </div>
            </div>

            {uploadResult && (
              <div className="mt-4 space-y-2">
                <div className="flex gap-4 text-sm font-medium">
                  <span className="text-green-600">{uploadResult.inserted} inserted</span>
                  <span className="text-red-600">{uploadResult.skipped} skipped</span>
                  <span className="text-gray-500">{uploadResult.total_rows} total</span>
                </div>
                {uploadResult.skipped > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-sm">
                    {uploadResult.results
                      .filter(r => r.status === 'skipped')
                      .map((r, idx) => (
                        <div key={idx} className="px-3 py-1.5">
                          <span className="text-gray-500">Row {r.row_number}:</span>{' '}
                          <span className="font-medium">{r.roll_no || '?'}</span> — {r.reason}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;