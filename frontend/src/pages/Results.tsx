import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { classApi, Class } from '../api/classes';
import { resultApi, ExamType, Subject } from '../api/results';
import { studentApi, Student } from '../api/students';

const ResultsEntry: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [marks, setMarks] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  
  // Load teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await classApi.getMyClasses();
        setClasses(data);
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
        const data = await resultApi.getExamTypes();
        setExamTypes(data);
      } catch (error) {
        toast.error('Failed to load exam types');
      }
    };
    fetchExamTypes();
  }, []);
  
  // Load subjects when class is selected
  useEffect(() => {
    if (!selectedClass) return;
    const fetchSubjects = async () => {
      try {
        const data = await resultApi.getSubjectsByClass(Number(selectedClass));
        setSubjects(data);
        setSelectedSubject('');
      } catch (error) {
        toast.error('Failed to load subjects');
      }
    };
    fetchSubjects();
  }, [selectedClass]);
  
  // Load students when class is selected
  useEffect(() => {
    if (!selectedClass) return;
    const fetchStudents = async () => {
      try {
        const data = await studentApi.getStudents(Number(selectedClass));
        setStudents(data);
        setMarks({});
      } catch (error) {
        toast.error('Failed to load students');
      }
    };
    fetchStudents();
  }, [selectedClass]);
  
  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };
  
  const handleMarkChange = (studentId: number, value: string) => {
    const numValue = parseFloat(value);
    setMarks(prev => ({
      ...prev,
      [studentId]: isNaN(numValue) ? 0 : Math.min(numValue, totalMarks)
    }));
  };
  
  const handleSubmit = async () => {
    if (!selectedClass || !selectedSubject || !selectedExam) {
      toast.error('Please select class, subject, and exam type');
      return;
    }
    
    const marksData = students.map(student => ({
      student_id: student.id,
      marks_obtained: marks[student.id] || 0
    }));
    
    setLoading(true);
    try {
      await resultApi.submitResults({
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
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
      
      {/* Selection Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : '')}
              disabled={!selectedClass}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.subject_name}</option>
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
      
      {/* Students Table */}
      {students.length > 0 && selectedSubject && selectedExam && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Marks</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">%</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map(student => {
                  const mark = marks[student.id] || 0;
                  const percentage = totalMarks > 0 ? (mark / totalMarks) * 100 : 0;
                  const grade = mark > 0 ? calculateGrade(percentage) : '-';
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{student.roll_no}</td>
                      <td className="px-6 py-4">{student.name}</td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={totalMarks}
                          value={mark || ''}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {mark > 0 ? percentage.toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {grade}
                      </td>
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
      
      {students.length === 0 && selectedClass && selectedSubject && (
        <div className="text-center py-12 text-gray-500">
          No students found for this class
        </div>
      )}
    </div>
  );
};

export default ResultsEntry;