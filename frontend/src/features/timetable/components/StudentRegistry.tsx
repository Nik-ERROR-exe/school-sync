import React, { useState, useEffect } from 'react';
import api from '../../../api';

const StudentRegistry = () => {
  console.log("🚀 StudentRegistry component rendered");
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', roll_no: '', class_id: '' });

 useEffect(() => {
  const fetchData = async () => {
    try {
      console.log("Loading classes...");
      const classResponse = await api.get("/admin/students/classes");
      console.log("Classes:", classResponse.data);
      setClasses(classResponse.data);

      console.log("Loading students...");
      const studentResponse = await api.get("/admin/students");
      console.log("Students:", studentResponse.data);
      setStudents(studentResponse.data.students || []);
    } catch (error: any) {
      console.error("API Error:", error);
      console.error("Status:", error?.response?.status);
      console.error("Response:", error?.response?.data);
    }
  };

  fetchData();
}, []);

    // Fetch students
    const fetchStudents = async () => {
      try {
        const response = await api.get('/admin/students');
        console.log('✅ Students loaded:', response.data);
        setStudents(response.data.students || []);
      } catch (err) {
        console.error('❌ Error fetching students:', err);
      }
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📤 Submitting form:', formData);
    
    try {
      const payload = {
        roll_no: formData.roll_no.trim(),
        name: formData.name.trim(),
        class_id: parseInt(formData.class_id)
      };
      console.log('📤 Sending payload:', payload);
      
      const response = await api.post('/admin/students', payload);
      console.log('✅ Student created:', response.data);
      
      alert('Student added successfully!');
      setShowModal(false);
      setFormData({ name: '', roll_no: '', class_id: '' });
      
      // Refresh students
      const refreshResponse = await api.get('/admin/students');
      setStudents(refreshResponse.data.students || []);
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Student Registry</h1>
      <button 
        onClick={() => setShowModal(true)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Add Student
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Student</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="block text-sm font-medium">Student Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g. Abhay Kamble"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium">Roll No</label>
                <input
                  type="text"
                  required
                  value={formData.roll_no}
                  onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g. 806"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium">Class</label>
                <select
                  required
                  value={formData.class_id}
                  onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}{cls.division || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Students ({students.length})</h2>
        <table className="mt-2 w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Roll No</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Class</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: any) => (
              <tr key={s.id}>
                <td className="p-2 border">{s.roll_no}</td>
                <td className="p-2 border">{s.name}</td>
                <td className="p-2 border">{s.class_name || s.class_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentRegistry;