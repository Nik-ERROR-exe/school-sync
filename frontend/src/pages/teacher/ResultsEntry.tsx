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
  const [loadingClassData, setLoadingClassData] = useState(false);

  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState<number>(100);
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

  // Load students and subjects when class is selected
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
        const response = await api.get(`/teacher/students/by-class/${selectedClass}`);
        const data = response.data;
        setStudents(data.students || []);
        setSubjects(data.subjects || []);
        setMarks({});
      } catch (error) {
        toast.error('Failed to load class data');
        setStudents([]);
        setSubjects([]);
      } finally {
        setLoadingClassData(false);
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
    let validCount = 0;
    subjects.forEach(subject => {
      if (getMark(studentId, subject.id) !== '') validCount++;
    });
    const maxTotal = validCount * totalMarks;
    return maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  };

  const handleSubmit = async () => {
    if (!selectedClass || !selectedExam) {
      toast.error('Please select class and exam type before submitting');
      return;
    }

    const resultsData: any[] = [];
    students.forEach(student => {
      subjects.forEach(subject => {
        const rawMark = getMark(student.id, subject.id);
        if (rawMark !== '') {
          const mark = parseFloat(rawMark);
          resultsData.push({
            student_id: student.id,
            subject_id: subject.id,
            exam_type_id: Number(selectedExam),
            marks_obtained: isNaN(mark) ? 0 : Math.min(Math.max(0, mark), totalMarks),
            total_marks: totalMarks,
          });
        }
      });
    });

    if (resultsData.length === 0) {
      toast.error('Please enter marks for at least one student and subject');
      return;
    }

    setLoading(true);
    try {
      await api.post('/teacher/results/', { results: resultsData });
      toast.success('Results submitted successfully!');
      setMarks({});
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit results');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium mb-1">Total Marks</label>
            <input
              type="number"
              value={totalMarks}
              onChange={(e) => setTotalMarks(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={1}
              disabled={!selectedClass}
            />
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

      {/* No timetable assignments */}
      {!loadingClassData && selectedClass && students.length > 0 && subjects.length === 0 && (
        <div className="bg-orange-50 border border-orange-300 text-orange-800 p-4 rounded-lg">
          <strong>⚠️ No timetable assignments found for your account in this class.</strong>
          <br />
          The admin needs to generate and save the timetable before you can enter marks.
          Contact your administrator.
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
                    {subjects.map(subject => (
                      <th key={subject.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r min-w-[80px]">
                        {subject.subject_name}
                        <div className="text-gray-400 font-normal normal-case">/{totalMarks}</div>
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
                        <td className="px-4 py-3 font-medium border-r sticky left-0 bg-white">{student.roll_no}</td>
                        <td className="px-4 py-3 font-medium border-r sticky left-16 bg-white">{student.name}</td>
                        {subjects.map(subject => (
                          <td key={subject.id} className="px-2 py-2 text-center border-r">
                            <input
                              type="number"
                              min={0}
                              max={totalMarks}
                              value={getMark(student.id, subject.id)}
                              onChange={(e) => handleMarkChange(student.id, subject.id, e.target.value)}
                              placeholder="—"
                              className="w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        ))}
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