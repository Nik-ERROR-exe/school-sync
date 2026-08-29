import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api';
import { Download } from 'lucide-react';
import { subjectMaxMarksApi } from '../api/results';

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

interface EditableMarkInputProps {
  resultId: number | null;
  initialValue: number | null;
  subjectId: number;
  subjectMaxMarks: number;
  onSave: (resultId: number | null, newMarks: number, subjectId: number) => void;
}

const EditableMarkInput: React.FC<EditableMarkInputProps> = ({
  resultId,
  initialValue,
  subjectId,
  subjectMaxMarks,
  onSave,
}) => {
  const [val, setVal] = useState<string>(initialValue !== null ? String(initialValue) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVal(initialValue !== null ? String(initialValue) : '');
  }, [initialValue]);

  const maxAllowed = subjectMaxMarks;

  const validate = (num: number): string | null => {
    if (num < 0) {
      return `Marks must be at least 0.`;
    }
    if (num > maxAllowed) {
      return `Marks must be between 0 and ${maxAllowed}.`;
    }
    return null;
  };

  const handleBlur = () => {
    if (val === '' || val === null) {
      setVal(initialValue !== null ? String(initialValue) : '');
      setError(null);
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setVal(initialValue !== null ? String(initialValue) : '');
      setError(null);
      return;
    }
    const errMsg = validate(num);
    if (errMsg) {
      setError(errMsg);
      toast.error(errMsg);
      setVal(initialValue !== null ? String(initialValue) : '');
      return;
    }
    setError(null);
    if (num !== initialValue) {
      onSave(resultId, num, subjectId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex flex-col">
      <input
        type="number"
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          if (error) setError(null);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-16 px-2 py-1 border rounded focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:ring-red-500'
            : 'focus:ring-blue-500'
        }`}
        min={0}
        max={maxAllowed}
      />
      {error && (
        <span className="text-red-500 text-xs mt-1">{error}</span>
      )}
    </div>
  );
};

const Results: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [subjects, setSubjects] = useState<{id: number, name: string}[]>([]);
  const [subjectMaxMarksMap, setSubjectMaxMarksMap] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');

  // Load classes (admin endpoint with trailing slash)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/admin/classes/');
        setClasses(response.data);
      } catch (error) {
        toast.error('Failed to load classes');
      }
    };
    fetchClasses();
  }, []);

  // Load exam types (admin endpoint with trailing slash)
  useEffect(() => {
    const fetchExamTypes = async () => {
      try {
        const response = await api.get('/admin/exam-types/');
        setExamTypes(response.data);
      } catch (error) {
        toast.error('Failed to load exam types');
      }
    };
    fetchExamTypes();
  }, []);

  // Load subject max marks map when class and exam are selected
  useEffect(() => {
    if (!selectedClass || !selectedExam) {
      setSubjectMaxMarksMap({});
      return;
    }

    const fetchMaxMarks = async () => {
      try {
        const classObj = classes.find(c => c.id === selectedClass);
        if (!classObj) return;

        const maxMarksList = await subjectMaxMarksApi.list(classObj.class_name, Number(selectedExam));
        const map: { [key: number]: number } = {};
        maxMarksList.forEach(item => {
          map[item.subject_id] = item.max_marks;
        });
        setSubjectMaxMarksMap(map);
      } catch (error) {
        toast.error('Failed to load subject max marks configuration');
      }
    };

    fetchMaxMarks();
  }, [selectedClass, selectedExam, classes]);

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
        const response = await api.get(
          `/admin/results/class/${selectedClass}/exam/${selectedExam}`
        );
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

  const handleMarkChange = async (
    studentId: number,
    subjectId: number,
    resultId: number | null,
    newMarks: number
  ) => {
    try {
      let savedResultId: number | null = resultId;
      const subjectMaxMarks = subjectMaxMarksMap[subjectId];

      if (resultId) {
        // Update an existing result - total_marks now comes from config, not client
        await api.put(`/admin/results/${resultId}`, {
          marks_obtained: newMarks
        });
      } else {
        // No result exists yet - create one directly as admin
        const response = await api.post('/admin/results/', {
          results: [{
            student_id: studentId,
            subject_id: subjectId,
            exam_type_id: selectedExam,
            marks_obtained: newMarks
          }]
        });
        const created = response.data?.[0];
        if (created) {
          savedResultId = created.id;
        }
      }

      // Functional update: only touch this cell so overlapping saves for other
      // cells (rapid entry across subjects) don't get clobbered by a stale snapshot.
      setStudentResults(prev => prev.map(student => {
        if (student.student_id !== studentId) return student;
        return {
          ...student,
          subjects: student.subjects.map(subject =>
            subject.subject_id === subjectId
              ? {
                  ...subject,
                  result_id: savedResultId,
                  marks_obtained: newMarks,
                  total_marks: subjectMaxMarks,
                  percentage: subjectMaxMarks > 0 ? (newMarks / subjectMaxMarks) * 100 : 0,
                  grade: calculateGrade(subjectMaxMarks > 0 ? (newMarks / subjectMaxMarks) * 100 : 0),
                  status: 'submitted'
                }
              : subject
          )
        };
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.detail?.message || 'Failed to save marks');
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
          exam_type_id: selectedExam,
          format: 'excel'
        },
        responseType: 'blob'
      });
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'results.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
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
      // responseType: 'blob' hides JSON errors, so read the blob body for the detail
      let message = 'Failed to download file';
      try {
        const blob = error.response?.data;
        if (blob && blob instanceof Blob) {
          const parsed = JSON.parse(await blob.text());
          if (typeof parsed?.detail === 'string') {
            message = parsed.detail;
          } else if (Array.isArray(parsed?.detail) && parsed.detail.length > 0) {
            message = parsed.detail.map((d: any) => d?.msg ?? 'Invalid field').join('; ');
          }
        }
      } catch {
        // not JSON — keep fallback message
      }
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
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
                    {subjects.map((subject) => {
                      const maxMarks = subjectMaxMarksMap[subject.id];
                      return (
                        <th key={subject.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {subject.name}
                          {maxMarks && (
                            <div className="font-normal normal-case text-gray-500 text-xs">/{maxMarks}</div>
                          )}
                        </th>
                      );
                    })}
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
                          const resultId = subjectData ? subjectData.result_id : null;
                          const subjectMaxMarks = subjectMaxMarksMap[subject.id] || 0;
                          return (
                            <td key={subject.id} className="px-4 py-3">
                              {subjectMaxMarks > 0 ? (
                                <EditableMarkInput
                                  resultId={resultId}
                                  initialValue={subjectData ? subjectData.marks_obtained : null}
                                  subjectId={subject.id}
                                  subjectMaxMarks={subjectMaxMarks}
                                  onSave={(rid, marks, sid) =>
                                    handleMarkChange(student.student_id, sid, rid, marks)
                                  }
                                />
                              ) : (
                                <span className="text-red-500 text-sm">Max marks not set</span>
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