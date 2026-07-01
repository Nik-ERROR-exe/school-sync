import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api';
import { Download } from 'lucide-react';

interface Class {
  id: number;
  class_name: string;
  division: string;
}

interface ExamType {
  id: number;
  name: string;
  weightage: number;
}

interface SubjectResult {
  subject_id: number;
  subject_name: string;
  marks_obtained: number | null;
  total_marks: number | null;
  percentage: number | null;
  grade: string | null;
  status: string | null;
  result_id: number | null;
}

interface StudentResult {
  student_id: number;
  roll_no: string;
  name: string;
  subjects: SubjectResult[];
}

const Results: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [subjects, setSubjects] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  
  // Load classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/admin/classes');
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
        const response = await api.get('/admin/exam-types');
        setExamTypes(response.data);
      } catch (error) {
        toast.error('Failed to load exam types');
      }
    };
    fetchExamTypes();
  }, []);
  
  // Load results when class and exam are selected
  useEffect(() => {
    if (!selectedClass || !selectedExam) {
      setStudentResults([]);
      setSubjects([]);
      return;
    }
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/admin/results/class/${selectedClass}/exam/${selectedExam}`);
        setStudentResults(response.data.students || []);
        setSubjects(response.data.subjects || []);
      } catch (error) {
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [selectedClass, selectedExam]);
  
  const handleMarkChange = async (resultId: number, newMarks: number, totalMarks: number) => {
    if (!resultId) return;
    
    try {
      await api.put(`/admin/results/${resultId}`, {
        marks_obtained: newMarks,
        total_marks: totalMarks
      });
      
      // Update local state
      const updatedStudents = studentResults.map(student => ({
        ...student,
        subjects: student.subjects.map(subject => 
          subject.result_id === resultId
            ? {
                ...subject,
                marks_obtained: newMarks,
                total_marks: totalMarks,
                percentage: (newMarks / totalMarks) * 100,
                grade: calculateGrade((newMarks / totalMarks) * 100)
              }
            : subject
        )
      }));
      setStudentResults(updatedStudents);
      
      toast.success('Marks updated automatically!');
    } catch (error) {
      toast.error('Failed to update marks');
    }
  };
  
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
    if (!grade) return 'bg-gray-100 text-gray-800';
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
  
  // Calculate overall percentage and grade for a student
  const calculateOverall = (student: StudentResult) => {
    let totalObtained = 0;
    let totalMax = 0;
    let hasAnyResult = false;
    
    student.subjects.forEach(subject => {
      if (subject.marks_obtained !== null && subject.total_marks !== null) {
        totalObtained += subject.marks_obtained;
        totalMax += subject.total_marks;
        hasAnyResult = true;
      }
    });
    
    if (!hasAnyResult || totalMax === 0) {
      return { percentage: 0, grade: '-', hasResults: false };
    }
    
    const percentage = (totalObtained / totalMax) * 100;
    const grade = calculateGrade(percentage);
    
    return { percentage, grade, hasResults: true };
  };

  // ============================================================
  // DOWNLOAD EXCEL FUNCTION
  // ============================================================
  const handleDownloadExcel = async () => {
    if (!selectedClass || !selectedExam) {
      toast.error('Please select both class and exam type');
      return;
    }

    try {
      setDownloading(true);
      const response = await api.get('/admin/results/export', {
        params: {
          class_id: selectedClass,
          exam_type_id: selectedExam
        },
        responseType: 'blob'
      });

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'results.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`File downloaded: ${filename}`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.detail || 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Download Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Review Results</h1>
          <p className="text-gray-600">View and edit student marks</p>
        </div>
        <button
          onClick={handleDownloadExcel}
          disabled={!selectedClass || !selectedExam || loading || downloading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Generating...' : 'Download Excel'}
        </button>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
      
      {/* Results Table */}
      {selectedClass && selectedExam && (
        <div className="mt-6">
          {loading ? (
            <div className="text-center py-8">Loading results...</div>
          ) : studentResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No results found for the selected class and exam
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Roll No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-16 bg-gray-50">Student</th>
                    {subjects.map((subject) => (
                      <th key={subject.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {subject.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studentResults.map((student) => {
                    const { percentage, grade, hasResults } = calculateOverall(student);
                    
                    return (
                      <tr key={student.student_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium sticky left-0 bg-white">{student.roll_no}</td>
                        <td className="px-4 py-3 font-medium sticky left-16 bg-white">{student.name}</td>
                        {subjects.map((subject) => {
                          const subjectData = student.subjects.find(s => s.subject_id === subject.id);
                          const hasResult = subjectData && subjectData.result_id !== null;
                          
                          return (
                            <td key={subject.id} className="px-4 py-3">
                              {hasResult ? (
                                <input
                                  type="number"
                                  value={subjectData?.marks_obtained || 0}
                                  onChange={(e) => {
                                    const newMarks = parseFloat(e.target.value);
                                    if (!isNaN(newMarks) && subjectData?.result_id) {
                                      handleMarkChange(subjectData.result_id, newMarks, subjectData?.total_marks || 100);
                                    }
                                  }}
                                  className="w-16 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  min="0"
                                  max={subjectData?.total_marks || 100}
                                />
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 font-medium">
                          {hasResults ? `${student.subjects.reduce((sum, s) => sum + (s.marks_obtained || 0), 0)} / ${student.subjects.reduce((sum, s) => sum + (s.total_marks || 0), 0)}` : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {hasResults ? `${percentage.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {hasResults ? (
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(grade)}`}>
                              {grade}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Results;