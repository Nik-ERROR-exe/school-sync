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

const ResultsEntry: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [marks, setMarks] = useState<{ [key: string]: number | undefined }>({});
  const [statusMap, setStatusMap] = useState<{ [key: string]: { status: string | null; result_id: number | null } }>({});
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
      setStatusMap({});
      return;
    }

    const fetchClassData = async () => {
      try {
        setFetchingData(true);
        const response = await api.get(`/teacher/students/by-class/${selectedClass}`);
        setStudents(response.data.students || []);
        setSubjects(response.data.subjects || []);
      } catch (error) {
        toast.error('Failed to load class data');
      } finally {
        setFetchingData(false);
      }
    };
    fetchClassData();
  }, [selectedClass]);

  // Load ALL marks with status using teacher endpoint (backend must provide status)
  useEffect(() => {
    if (!selectedClass || !selectedExam || !subjects.length || !students.length) {
      setMarks({});
      setStatusMap({});
      return;
    }

    const fetchAllMarksWithStatus = async () => {
      try {
        const response = await api.get(`/teacher/results/with-status/class/${selectedClass}/exam/${selectedExam}`);
        const data = response.data;
        const studentsData = data.students || [];
        const newMarks: { [key: string]: number | undefined } = {};
        const newStatusMap: { [key: string]: { status: string | null; result_id: number | null } } = {};

        studentsData.forEach((student: any) => {
          student.subjects.forEach((subj: any) => {
            const key = `${student.student_id}_${subj.subject_id}`;
            if (subj.marks_obtained !== null && subj.marks_obtained !== undefined) {
              newMarks[key] = subj.marks_obtained;
            }
            newStatusMap[key] = {
              status: subj.status,
              result_id: subj.result_id
            };
          });
        });

        setMarks(newMarks);
        setStatusMap(newStatusMap);
      } catch (error) {
        console.error('Error loading marks with status:', error);
        // Fallback: load only marks (no status) – will treat all as editable
        try {
          const fallbackResponse = await api.get(`/teacher/results/class/${selectedClass}/exam/${selectedExam}`);
          const marksData = fallbackResponse.data || {};
          const fallbackMarks: { [key: string]: number | undefined } = {};
          Object.entries(marksData).forEach(([key, value]) => {
            fallbackMarks[key] = value as number;
          });
          setMarks(fallbackMarks);
          setStatusMap({});
        } catch (fallbackError) {
          setMarks({});
          setStatusMap({});
        }
      }
    };
    fetchAllMarksWithStatus();
  }, [selectedClass, selectedExam, subjects, students]);

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
    switch (grade) {
      case 'A+': return 'bg-purple-100 text-purple-800';
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'E': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if a student-subject is editable (not submitted or approved)
  const isEditable = (studentId: number, subjectId: number): boolean => {
    const key = `${studentId}_${subjectId}`;
    const status = statusMap[key]?.status;
    return !status || status === 'pending' || status === 'draft';
  };

  // Get mark for a student-subject
  const getMarkValue = (studentId: number, subjectId: number): number | undefined => {
    const key = `${studentId}_${subjectId}`;
    return marks[key];
  };

  // ============================================================
  // AUTO-SAVE: Immediately save on change (like admin)
  // ============================================================
  const handleMarkChange = async (studentId: number, subjectId: number, value: string) => {
    const key = `${studentId}_${subjectId}`;

    if (value === '') {
      setMarks(prev => ({ ...prev, [key]: undefined }));
      try {
        await api.post('/teacher/results/auto-save', {
          student_id: studentId,
          subject_id: subjectId,
          exam_type_id: Number(selectedExam),
          class_id: Number(selectedClass),
          marks_obtained: 0,
          total_marks: totalMarks
        });
      } catch (error) {
        console.error('Auto-save error:', error);
      }
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const finalValue = Math.min(numValue, totalMarks);
    setMarks(prev => ({ ...prev, [key]: finalValue }));

    try {
      await api.post('/teacher/results/auto-save', {
        student_id: studentId,
        subject_id: subjectId,
        exam_type_id: Number(selectedExam),
        class_id: Number(selectedClass),
        marks_obtained: finalValue,
        total_marks: totalMarks
      });
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  // Calculate student totals
  const calculateStudentTotals = (studentId: number) => {
    let totalObtained = 0;
    let totalMax = 0;
    let allEditableFilled = true;

    subjects.forEach(subject => {
      const key = `${studentId}_${subject.id}`;
      if (isEditable(studentId, subject.id)) {
        const mark = marks[key];
        if (mark === undefined || mark === null) {
          allEditableFilled = false;
        } else {
          totalObtained += mark;
          totalMax += totalMarks;
        }
      } else {
        const mark = marks[key];
        if (mark !== undefined && mark !== null) {
          totalObtained += mark;
          totalMax += totalMarks;
        }
      }
    });

    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const grade = calculateGrade(percentage);
    return { totalObtained, totalMax, percentage, grade, allEditableFilled };
  };

  // ============================================================
  // VALIDATION: Check all editable fields are filled
  // ============================================================
  const validateAllFilled = (): boolean => {
    for (const student of students) {
      for (const subject of subjects) {
        const key = `${student.id}_${subject.id}`;
        if (isEditable(student.id, subject.id) && (marks[key] === undefined || marks[key] === null || marks[key] === '')) {
          return false;
        }
      }
    }
    return true;
  };

  // Check if there are any editable students
  const hasEditableStudents = (): boolean => {
    for (const student of students) {
      for (const subject of subjects) {
        if (isEditable(student.id, subject.id)) {
          return true;
        }
      }
    }
    return false;
  };

  // ============================================================
  // SUBMIT ONLY EDITABLE RESULTS
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

    if (!validateAllFilled()) {
      toast.error('Please fill all marks for editable students before submitting.');
      return;
    }

    const marksData = [];
    for (const student of students) {
      for (const subject of subjects) {
        const key = `${student.id}_${subject.id}`;
        if (isEditable(student.id, subject.id)) {
          const marksObtained = marks[key] !== undefined ? marks[key] : 0;
          marksData.push({
            student_id: student.id,
            subject_id: subject.id,
            marks_obtained: marksObtained
          });
        }
      }
    }

    if (marksData.length === 0) {
      toast.error('No editable marks to submit.');
      return;
    }

    if (!window.confirm('Are you sure you want to submit these results for approval? You cannot edit after submission.')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/teacher/results/submit', {
        class_id: Number(selectedClass),
        exam_type_id: Number(selectedExam),
        total_marks: totalMarks,
        marks: marksData
      });

      toast.success(`Results submitted for approval! (${response.data.submitted_count} submitted)`);
      // Refresh statuses after submission
      const refreshResponse = await api.get(`/teacher/results/with-status/class/${selectedClass}/exam/${selectedExam}`);
      const data = refreshResponse.data;
      const studentsData = data.students || [];
      const newStatusMap: { [key: string]: { status: string | null; result_id: number | null } } = {};
      studentsData.forEach((student: any) => {
        student.subjects.forEach((subj: any) => {
          const key = `${student.student_id}_${subj.subject_id}`;
          newStatusMap[key] = {
            status: subj.status,
            result_id: subj.result_id
          };
        });
      });
      setStatusMap(newStatusMap);

    } catch (error: any) {
      console.error('❌ Submit error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if submit button should be disabled
  const isSubmitDisabled = () => {
    if (submitting || loading || fetchingData || !selectedClass || !selectedExam || students.length === 0 || subjects.length === 0) return true;
    if (!hasEditableStudents()) return true;
    if (!validateAllFilled()) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Enter Results</h1>
        <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">Auto-save enabled</span>
      </div>

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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => {
                    const { totalObtained, totalMax, percentage, grade, allEditableFilled } = calculateStudentTotals(student.id);
                    const hasAnyEditable = subjects.some(sub => isEditable(student.id, sub.id));
                    const allEditableFilledStatus = subjects.every(sub => !isEditable(student.id, sub.id) || marks[`${student.id}_${sub.id}`] !== undefined);

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium sticky left-0 bg-white">{student.roll_no}</td>
                        <td className="px-4 py-3 font-medium sticky left-16 bg-white">{student.name}</td>
                        {subjects.map((subject) => {
                          const key = `${student.id}_${subject.id}`;
                          const editable = isEditable(student.id, subject.id);
                          const currentStatus = statusMap[key]?.status;
                          const mark = marks[key] !== undefined ? marks[key] : '';

                          return (
                            <td key={subject.id} className="px-4 py-3">
                              {editable ? (
                                <input
                                  type="number"
                                  value={mark}
                                  onChange={(e) => handleMarkChange(student.id, subject.id, e.target.value)}
                                  className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  min="0"
                                  max={totalMarks}
                                  step="0.5"
                                />
                              ) : (
                                <span className="text-gray-500">
                                  {mark !== '' ? mark : '-'}
                                  {currentStatus === 'submitted' && <span className="ml-1 text-xs text-blue-600">(submitted)</span>}
                                  {currentStatus === 'approved' && <span className="ml-1 text-xs text-green-600">(approved)</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 font-medium">
                          {totalMax > 0 ? `${totalObtained} / ${totalMax}` : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {totalMax > 0 ? `${percentage.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {totalMax > 0 ? (
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(grade)}`}>
                              {grade}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {!hasAnyEditable ? (
                            <span className="text-green-600">Submitted</span>
                          ) : allEditableFilledStatus ? (
                            <span className="text-yellow-600">Draft</span>
                          ) : (
                            <span className="text-red-500">Incomplete</span>
                          )}
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
                        const key = `${student.id}_${subject.id}`;
                        if (marks[key] !== undefined) subjectTotal += marks[key];
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

          {/* Submit Button & Info Messages */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled()}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Results'}
            </button>
          </div>
          {!hasEditableStudents() && (
            <p className="text-sm text-gray-500 mt-2">All students already have submitted/approved results.</p>
          )}
          {/* The red error message has been removed as requested */}
        </div>
      )}
    </div>
  );
};

export default ResultsEntry;