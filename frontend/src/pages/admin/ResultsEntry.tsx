import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { Send } from 'lucide-react';

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

interface MarkEntry {
  student_id: number;
  subject_id: number;
  marks_obtained: number;
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
  const [submitting, setSubmitting] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  
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
      setMarks({});
      return;
    }
    
    const fetchClassData = async () => {
      try {
        setFetchingData(true);
        const response = await api.get(`/teacher/students/by-class/${selectedClass}`);
        setStudents(response.data.students || []);
        setSubjects(response.data.subjects || []);
        setMarks({});
      } catch (error) {
        toast.error('Failed to load class data');
      } finally {
        setFetchingData(false);
      }
    };
    fetchClassData();
  }, [selectedClass]);
  
  // Load existing marks when class and exam are selected
  useEffect(() => {
    if (!selectedClass || !selectedExam || !subjects.length) return;
    
    const fetchExistingMarks = async () => {
      try {
        const response = await api.get(`/teacher/results/class/${selectedClass}/exam/${selectedExam}`);
        const existingMarks = response.data || {};
        setMarks(existingMarks);
      } catch (error) {
        setMarks({});
      }
    };
    fetchExistingMarks();
  }, [selectedClass, selectedExam, subjects]);
  
  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };
  
  const getGradeColor = (grade: string): string => {
    switch(grade) {
      case 'A+': return 'bg-purple-100 text-purple-800';
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'E': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleMarkChange = (studentId: number, subjectId: number, value: string) => {
    const numValue = parseFloat(value);
    const finalValue = isNaN(numValue) ? 0 : Math.min(numValue, totalMarks);
    const key = `${studentId}_${subjectId}`;
    
    setMarks(prev => ({
      ...prev,
      [key]: finalValue
    }));
  };
  
  const getMarkForStudentSubject = (studentId: number, subjectId: number): number => {
    const key = `${studentId}_${subjectId}`;
    return marks[key] || 0;
  };
  
  // Calculate student totals
  const calculateStudentTotals = (studentId: number) => {
    let totalObtained = 0;
    let totalMax = 0;
    
    subjects.forEach(subject => {
      const mark = getMarkForStudentSubject(studentId, subject.id);
      totalObtained += mark;
      totalMax += totalMarks;
    });
    
    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const grade = calculateGrade(percentage);
    
    return { totalObtained, totalMax, percentage, grade };
  };
  
  // ============================================================
  // SUBMIT MARKS ONLY - NO SAVE BUTTON
  // ============================================================
  const handleSubmit = async () => {
    if (!selectedClass || !selectedExam) {
      toast.error('Please select class and exam type');
      return;
    }
    
    if (!subjects.length) {
      toast.error('No subjects found for this class');
      return;
    }
    
    const marksData: MarkEntry[] = [];
    students.forEach(student => {
      subjects.forEach(subject => {
        const key = `${student.id}_${subject.id}`;
        const marksObtained = marks[key] || 0;
        marksData.push({
          student_id: student.id,
          subject_id: subject.id,
          marks_obtained: marksObtained
        });
      });
    });
    
    if (marksData.length === 0) {
      toast.error('No marks to submit');
      return;
    }
    
    if (!window.confirm('Are you sure you want to submit these results for approval? You cannot edit after submission.')) {
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/teacher/results/submit', {
        class_id: Number(selectedClass),
        exam_type_id: Number(selectedExam),
        total_marks: totalMarks,
        marks: marksData
      });
      toast.success('Results submitted for approval!');
      setMarks({});
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Enter Results</h1>
      
      {/* Selection Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.class_name} - {cls.division}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Exam</option>
            {examTypes.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
          <input
            type="number"
            value={totalMarks}
            onChange={(e) => setTotalMarks(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
          />
        </div>
      </div>
      
      {/* Students and Subjects Table */}
      {selectedClass && selectedExam && (
        <div className="mt-6">
          {fetchingData ? (
            <div className="text-center py-4">Loading...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No students found</div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No subjects assigned</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Roll No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-16 bg-gray-50">Student</th>
                    {subjects.map((subject) => (
                      <th key={subject.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {subject.subject_name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => {
                    const { totalObtained, totalMax, percentage, grade } = calculateStudentTotals(student.id);
                    
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium sticky left-0 bg-white">{student.roll_no}</td>
                        <td className="px-4 py-3 font-medium sticky left-16 bg-white">{student.name}</td>
                        {subjects.map((subject) => {
                          const mark = getMarkForStudentSubject(student.id, subject.id);
                          return (
                            <td key={subject.id} className="px-4 py-3">
                              <input
                                type="number"
                                value={mark}
                                onChange={(e) => handleMarkChange(student.id, subject.id, e.target.value)}
                                className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max={totalMarks}
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 font-medium">{totalObtained} / {totalMax}</td>
                        <td className="px-4 py-3 font-medium">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(grade)}`}>
                            {grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right text-sm text-gray-500">Subject Totals:</td>
                    {subjects.map((subject) => {
                      let subjectTotal = 0;
                      students.forEach(student => {
                        subjectTotal += getMarkForStudentSubject(student.id, subject.id);
                      });
                      return (
                        <td key={subject.id} className="px-4 py-3 text-sm">
                          {subjectTotal.toFixed(0)}
                        </td>
                      );
                    })}
                    <td colSpan={3} className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          
          {/* Submit Button Only - NO Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || loading || fetchingData || !selectedClass || !selectedExam || students.length === 0 || subjects.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Results'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsEntry;