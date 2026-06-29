import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api';

interface Class {
  id: number;
  class_name: string;
  division: string;
}

interface Subject {
  id: number;
  subject_name: string;
  code: string;
}

interface ExamType {
  id: number;
  name: string;
  weightage: number;
}

interface Student {
  id: number;
  roll_no: string;
  name: string;
  class_id: number;
}

const ResultsEntry: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [marks, setMarks] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  
  // Load teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/teacher/classes/my-classes');
        setClasses(response.data);
      } catch (error) {
        toast.error('Failed to load classes');
      }
    };
    fetchClasses();
  }, []);
  
  // Load exam types
  useEffect(() => {
    const fetchExamTypes = async () => {
      try {
        const response = await api.get('/teacher/exam-types');
        setExamTypes(response.data);
      } catch (error) {
        toast.error('Failed to load exam types');
      }
    };
    fetchExamTypes();
  }, []);
  
  // Load students and subjects when class is selected
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSubjects([]);
      return;
    }
    
    const fetchClassData = async () => {
      try {
        console.log('📚 Fetching data for class:', selectedClass);
        const response = await api.get(`/teacher/students/by-class/${selectedClass}`);
        console.log('✅ Response:', response.data);
        setStudents(response.data.students || []);
        setSubjects(response.data.subjects || []);
        setMarks({});
      } catch (error) {
        console.error('❌ Error:', error);
        toast.error('Failed to load class data');
      }
    };
    fetchClassData();
  }, [selectedClass]);
  
  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };
  
  const handleMarkChange = (studentId: number, subjectId: number, value: string) => {
    const numValue = parseFloat(value);
    const key = `${studentId}_${subjectId}`;
    setMarks(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : Math.min(numValue, totalMarks)
    }));
  };
  
  const getMark = (studentId: number, subjectId: number): number => {
    const key = `${studentId}_${subjectId}`;
    return marks[key] || 0;
  };
  
  const calculateStudentTotal = (studentId: number): number => {
    let total = 0;
    subjects.forEach(subject => {
      total += getMark(studentId, subject.id);
    });
    return total;
  };
  
  const calculateStudentPercentage = (studentId: number): number => {
    const total = calculateStudentTotal(studentId);
    const maxTotal = subjects.length * totalMarks;
    return maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  };
  
  const handleSubmit = async () => {
    if (!selectedClass || !selectedExam) {
      toast.error('Please select class and exam type');
      return;
    }
    
    const marksData: any[] = [];
    students.forEach(student => {
      subjects.forEach(subject => {
        const mark = getMark(student.id, subject.id);
        marksData.push({
          student_id: student.id,
          subject_id: subject.id,
          marks_obtained: mark
        });
      });
    });
    
    if (marksData.length === 0) {
      toast.error('Please enter marks for at least one subject');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/teacher/results/submit', {
        class_id: Number(selectedClass),
        exam_type_id: Number(selectedExam),
        total_marks: totalMarks,
        marks: marksData
      });
      toast.success('Results submitted successfully!');
      setMarks({});
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit results');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📝 Enter Results</h1>
      
      {/* Selection Section - ONLY Class, Exam Type, Total Marks */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
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
          
          <div>
            <label className="block text-sm font-medium mb-1">Exam Type</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Exam</option>
              {examTypes.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Total Marks</label>
            <input
              type="number"
              value={totalMarks}
              onChange={(e) => setTotalMarks(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
        </div>
      </div>
      
      {/* Students Table with Subject Columns */}
      {students.length > 0 && subjects.length > 0 && selectedExam && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r">Roll No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r">Student Name</th>
                  {subjects.map(subject => (
                    <th key={subject.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r">
                      {subject.subject_name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r">%</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map(student => {
                  const total = calculateStudentTotal(student.id);
                  const percentage = calculateStudentPercentage(student.id);
                  const grade = total > 0 ? calculateGrade(percentage) : '-';
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium border-r">{student.roll_no}</td>
                      <td className="px-4 py-3 font-medium border-r">{student.name}</td>
                      
                      {subjects.map(subject => (
                        <td key={subject.id} className="px-2 py-2 text-center border-r">
                          <input
                            type="number"
                            min={0}
                            max={totalMarks}
                            value={getMark(student.id, subject.id) || ''}
                            onChange={(e) => handleMarkChange(student.id, subject.id, e.target.value)}
                            className="w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                      
                      <td className="px-4 py-3 text-center font-bold border-r">{total}</td>
                      <td className="px-4 py-3 text-center font-medium border-r">{total > 0 ? percentage.toFixed(1) : '-'}</td>
                      <td className="px-4 py-3 text-center font-bold">{grade}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : '📤 Submit Results'}
            </button>
          </div>
        </div>
      )}
      
      {students.length === 0 && selectedClass && (
        <div className="text-center py-12 text-gray-500">
          No students found for this class
        </div>
      )}
      
      {subjects.length === 0 && selectedClass && (
        <div className="text-center py-12 text-gray-500">
          No subjects mapped to this class. Please contact admin.
        </div>
      )}
    </div>
  );
};

export default ResultsEntry;