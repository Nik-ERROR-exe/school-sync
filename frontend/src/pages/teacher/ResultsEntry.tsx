import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { resultApi, Subject } from '../../api/results';

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

interface Student {
  id: number;
  roll_no: string;
  name: string;
  class_id: number;
}

// Interface for the nested API response (student with subjects)
interface StudentResultResponse {
  student_id: number;
  roll_no: string;
  name: string;
  subjects: {
    subject_id: number;
    subject_name: string;
    marks_obtained: number | null;
    total_marks: number | null;
    percentage: number | null;
    grade: string | null;
    status: string | null;
    result_id: number | null;
  }[];
}

const ResultsEntry: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingClassData, setLoadingClassData] = useState(false);

  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [marks, setMarks] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  // Load teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/teacher/classes/my-classes');
        setClasses(response.data || []);
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
        setExamTypes(response.data || []);
      } catch (error) {
        toast.error('Failed to load exam types');
      }
    };
    fetchExamTypes();
  }, []);

  // Load students and subjects when class or exam is selected
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSubjects([]);
      setMarks({});
      return;
    }

    const fetchClassData = async () => {
      setLoadingClassData(true);
      try {
        const [studentsRes, subjectsData] = await Promise.all([
          api.get(`/teacher/classes/students/by-class/${selectedClass}`),
          resultApi.getSubjectsByClass(selectedClass, selectedExam ? Number(selectedExam) : undefined)
        ]);
        const data = studentsRes.data;
        setStudents(data.students || []);
        setSubjects(subjectsData || []);
        // Clear marks when class changes (exam will be reloaded separately)
        setMarks({});
      } catch (error) {
        toast.error('Failed to load class data');
        setStudents([]);
        setSubjects([]);
        setMarks({});
      } finally {
        setLoadingClassData(false);
      }
    };
    fetchClassData();
  }, [selectedClass, selectedExam]);

  // Load existing results when both class and exam are selected
  useEffect(() => {
    if (!selectedClass || !selectedExam) {
      // If no exam selected, we keep the marks as they are (may be from previous selection)
      // But better to clear if no exam to avoid confusion.
      setMarks({});
      return;
    }

    const fetchExistingResults = async () => {
      try {
        const response = await resultApi.getResultsByClassAndExam(
          Number(selectedClass),
          Number(selectedExam)
        );
        // Response structure: { students: StudentResultResponse[], subjects: Subject[] }
        const studentList: StudentResultResponse[] = response.students || [];
        const newMarks: { [key: string]: string } = {};

        studentList.forEach((student) => {
          student.subjects.forEach((subject) => {
            if (subject.marks_obtained !== null && subject.marks_obtained !== undefined) {
              const key = `${student.student_id}_${subject.subject_id}`;
              newMarks[key] = String(subject.marks_obtained);
            }
          });
        });

        setMarks(newMarks);
      } catch (error) {
        console.error('Failed to load existing results:', error);
        // Don't show a toast here; just leave marks empty.
      }
    };

    fetchExistingResults();
  }, [selectedClass, selectedExam]);

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const handleMarkChange = (studentId: number, subjectId: number, value: string) => {
    const key = `${studentId}_${subjectId}`;
    setMarks(prev => ({ ...prev, [key]: value }));
  };

  const getMark = (studentId: number, subjectId: number): string => {
    const key = `${studentId}_${subjectId}`;
    return marks[key] !== undefined ? marks[key] : '';
  };

  const calculateStudentTotal = (studentId: number): number => {
    let total = 0;
    subjects.forEach(subject => {
      const val = parseFloat(getMark(studentId, subject.id));
      if (!isNaN(val)) total += val;
    });
    return total;
  };

  const calculateStudentPercentage = (studentId: number): number => {
    const total = calculateStudentTotal(studentId);
    let validMaxTotal = 0;
    subjects.forEach(subject => {
      if (getMark(studentId, subject.id) !== '' && subject.max_marks) {
        validMaxTotal += subject.max_marks;
      }
    });
    return validMaxTotal > 0 ? (total / validMaxTotal) * 100 : 0;
  };

  const handleSubmit = async () => {
    if (!selectedClass || !selectedExam) {
      toast.error('Please select class and exam type before submitting');
      return;
    }

    const resultsData: any[] = [];
    for (const student of students) {
      for (const subject of subjects) {
        const rawMark = getMark(student.id, subject.id);
        if (rawMark === '') continue;
        const mark = parseFloat(rawMark);

        if (subject.needs_config || subject.max_marks === null || subject.max_marks === undefined) {
          toast.error(`Max marks for ${subject.subject_name} are not configured yet. Please contact administrator.`);
          return;
        }

        if (isNaN(mark) || mark < 0 || mark > subject.max_marks) {
          toast.error(`Marks for ${student.name} (${subject.subject_name}) must be between 0 and ${subject.max_marks}.`);
          return;
        }

        resultsData.push({
          student_id: student.id,
          subject_id: subject.id,
          exam_type_id: Number(selectedExam),
          marks_obtained: mark,
        });
      }
    }

    if (resultsData.length === 0) {
      toast.error('Please enter marks for at least one student and subject');
      return;
    }

    setLoading(true);
    try {
      await api.post('/teacher/results/', { results: resultsData });
      toast.success('Results submitted successfully!');
      // IMPORTANT: Do NOT clear marks here – they remain displayed.
      // The marks are now saved; the user can continue editing or reload later.
    } catch (error: any) {
      console.error('❌ Submit error:', error);
      toast.error(error.response?.data?.detail?.message || error.response?.data?.detail || 'Failed to submit results');
    } finally {
      setLoading(false);
    }
  };

  const selectedClassObj = classes.find(c => c.id === selectedClass);
  const classHeader = selectedClassObj
    ? `Standard ${selectedClassObj.class_name} - ${selectedClassObj.division}`
    : '';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📝 Enter Results</h1>

      {/* Selection Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value ? Number(e.target.value) : '');
                setSelectedExam('');
              }}
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
              disabled={!selectedClass}
            >
              <option value="">Select Exam</option>
              {examTypes.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* Loading state */}
      {loadingClassData && (
        <div className="text-center py-8 text-gray-500">
          Loading class data...
        </div>
      )}

      {/* No students found */}
      {!loadingClassData && selectedClass && students.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No students found for this class.
        </div>
      )}

      {/* No subject assignments */}
      {!loadingClassData && selectedClass && students.length > 0 && subjects.length === 0 && (
        <div className="bg-orange-50 border border-orange-300 text-orange-800 p-4 rounded-lg">
          <strong>⚠️ No subject assignments found for your account in this class.</strong>
          <br />
          The administrator needs to assign subjects to your account for this class before you can enter marks.
        </div>
      )}


      {/* Exam type not selected yet but students/subjects loaded */}
      {!loadingClassData && students.length > 0 && subjects.length > 0 && !selectedExam && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
          <strong>✅ Class loaded:</strong> {classHeader} — {students.length} students, {subjects.length} subjects ({subjects.map(s => s.subject_name).join(', ')})
          <br />
          <span className="text-sm mt-1 block">Select an Exam Type above to start entering marks.</span>
        </div>
      )}

      {/* Marks Table — shown once class + exam both selected */}
      {!loadingClassData && students.length > 0 && subjects.length > 0 && selectedExam && (
        <>
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg">
            <strong>Entering marks for:</strong> {classHeader} &nbsp;|&nbsp;
            <strong>Exam:</strong> {examTypes.find(e => e.id === selectedExam)?.name} &nbsp;|&nbsp;
            <strong>Subjects:</strong> {subjects.map(s => s.subject_name).join(', ')}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r sticky left-0 bg-gray-50">Roll No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r sticky left-16 bg-gray-50">Student Name</th>
                    {subjects.map(subject => {
                      const isConfigured = subject.max_marks !== null && subject.max_marks !== undefined && !subject.needs_config;
                      return (
                        <th key={subject.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r min-w-[90px]">
                          {subject.subject_name}
                          <div className={`font-normal normal-case ${isConfigured ? 'text-gray-500' : 'text-red-500 font-semibold'}`}>
                            {isConfigured ? `/${subject.max_marks}` : '/Not set'}
                          </div>
                        </th>
                      );
                    })}
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
                        <td className="px-4 py-3 font-medium border-r sticky left-0 bg-white">{student.roll_no}</td>
                        <td className="px-4 py-3 font-medium border-r sticky left-16 bg-white">{student.name}</td>
                        {subjects.map(subject => {
                          const isConfigured = subject.max_marks !== null && subject.max_marks !== undefined && !subject.needs_config;
                          return (
                            <td key={subject.id} className="px-2 py-2 text-center border-r">
                              <input
                                type="number"
                                min={0}
                                max={isConfigured ? subject.max_marks! : undefined}
                                value={getMark(student.id, subject.id)}
                                onChange={(e) => handleMarkChange(student.id, subject.id, e.target.value)}
                                placeholder={isConfigured ? "—" : "Not set"}
                                disabled={!isConfigured}
                                title={!isConfigured ? "Max marks not configured for this subject — contact admin" : ""}
                                className={`w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  !isConfigured ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-red-200' : ''
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-bold border-r">{total > 0 ? total : '—'}</td>
                        <td className="px-4 py-3 text-center font-medium border-r">{total > 0 ? `${percentage.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-3 text-center font-bold">
                          <span className={`px-2 py-1 rounded text-sm ${
                            grade === 'A+' || grade === 'A' ? 'bg-green-100 text-green-800' :
                            grade === 'B' || grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'F' ? 'bg-red-100 text-red-800' :
                            'text-gray-500'
                          }`}>
                            {grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {students.length} students · {subjects.length} subjects
              </span>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Submitting...' : '📤 Submit Results'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsEntry;