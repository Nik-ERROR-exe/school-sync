import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  Send,
  Calendar,
  X,
  RotateCcw,
  Loader2,
  Users,
  BookOpen,
  Award,
} from 'lucide-react';

import { sortClasses } from '../../utils/classSorter';

interface ClassItem {
  id: number;
  class_name: string;
  division: string;
}

interface SubjectItem {
  id: number;
  subject_name: string;
  code: string;
}

interface ExamTypeItem {
  id: number;
  name: string;
  weightage: number;
}

interface StudentItem {
  id: number;
  roll_no: string;
  name: string;
  class_id: number;
}

const ResultsEntry: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [examTypes, setExamTypes] = useState<ExamTypeItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [marks, setMarks] = useState<{ [key: string]: string }>({});
  const [initialMarks, setInitialMarks] = useState<{ [key: string]: string }>({});
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load teacher's classes and exam types
  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoadingInitial(true);
      try {
        const [classesRes, examsRes] = await Promise.all([
          api.get('/teacher/classes/my-classes'),
          api.get('/teacher/exam-types'),
        ]);
        setClasses(classesRes.data || []);
        setExamTypes(examsRes.data || []);
      } catch {
        toast.error('Failed to load initial class or exam types');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchDropdowns();
  }, []);

  // Load students and subjects when class or exam is selected
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSubjects([]);
      setMarks({});
      setInitialMarks({});
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
        setInitialMarks({});
      } catch {
        toast.error('Failed to load class roster');
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

  // Load existing marks when class and exam are selected
  useEffect(() => {
    if (!selectedClass || !selectedExam) return;

    const fetchExistingMarks = async () => {
      try {
        const response = await api.get(`/teacher/results/class/${selectedClass}/exam/${selectedExam}`);
        const existingData = response.data || {};
        const stringMap: { [key: string]: string } = {};
        Object.entries(existingData).forEach(([key, val]) => {
          stringMap[key] = String(val);
        });
        setMarks(stringMap);
        setInitialMarks(stringMap);
      } catch {
        // Not fatal if no results exist yet
        setMarks({});
        setInitialMarks({});
      }
    };
    fetchExistingMarks();
  }, [selectedClass, selectedExam]);

  const handleMarkChange = (studentId: number, subjectId: number, value: string) => {
    const key = `${studentId}_${subjectId}`;
    setMarks((prev) => ({ ...prev, [key]: value }));
  };

  const getMark = (studentId: number, subjectId: number): string => {
    const key = `${studentId}_${subjectId}`;
    return marks[key] !== undefined ? marks[key] : '';
  };

  // Check if mark is valid: empty is allowed, but if entered it must be between MIN_MARKS and totalMarks
  const getMarkValidation = (studentId: number, subjectId: number): 'empty' | 'valid' | 'invalid' => {
    const raw = getMark(studentId, subjectId).trim();
    if (raw === '') return 'empty';
    const val = parseFloat(raw);
    const maxAllowed = Math.min(totalMarks, MAX_MARKS);
    if (isNaN(val) || val < MIN_MARKS || val > maxAllowed) {
      return 'invalid';
    }
    return 'valid';
  };

  const calculateStudentTotal = (studentId: number): number => {
    let total = 0;
    subjects.forEach((subject) => {
      const val = parseFloat(getMark(studentId, subject.id));
      if (!isNaN(val)) total += val;
    });
    return total;
  };

  const calculateStudentPercentage = (studentId: number): number => {
    const total = calculateStudentTotal(studentId);
    let validCount = 0;
    subjects.forEach((subject) => {
      if (getMark(studentId, subject.id) !== '') validCount++;
    });
    const maxTotal = validCount * totalMarks;
    return maxTotal > 0 ? (total / maxTotal) * 100 : 0;
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

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'B':
      case 'C':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'D':
      case 'E':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'F':
        return 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700';
    }
  };

  // Filtered student list for search
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q)
    );
  }, [students, search]);

  // Has unsaved changes check
  const hasChanges = useMemo(() => {
    const keys = new Set([...Object.keys(marks), ...Object.keys(initialMarks)]);
    for (const key of keys) {
      if ((marks[key] || '') !== (initialMarks[key] || '')) {
        return true;
      }
    }
    return false;
  }, [marks, initialMarks]);

  // Marks filled count
  const filledMarksCount = useMemo(() => {
    return Object.values(marks).filter((v) => v.trim() !== '').length;
  }, [marks]);

  const handleSubmit = async () => {
    if (!selectedClass || !selectedExam) {
      toast.error('Please select both class and exam type before submitting.');
      return;
    }

    const resultsData: any[] = [];
    let hasInvalidMark = false;
    let invalidErrorMsg = '';

    for (const student of students) {
      for (const subject of subjects) {
        const rawMark = getMark(student.id, subject.id).trim();
        if (rawMark === '') continue;

        const mark = parseFloat(rawMark);
        if (isNaN(mark) || mark < MIN_MARKS || mark > maxAllowed) {
          hasInvalidMark = true;
          invalidErrorMsg = `Mark for ${student.name} (${subject.subject_name}) must be between ${MIN_MARKS} and ${maxAllowed}.`;
          break;
        }

        resultsData.push({
          student_id: student.id,
          subject_id: subject.id,
          exam_type_id: Number(selectedExam),
          marks_obtained: mark,
        });
      }
      if (hasInvalidMark) break;
    }

    if (hasInvalidMark) {
      toast.error(invalidErrorMsg);
      return;
    }

    if (resultsData.length === 0) {
      toast.error('Please enter marks for at least one student before submitting.');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Submitting student marks...');
    try {
      await api.post('/teacher/results/', { results: resultsData });
      toast.dismiss(loadingToast);
      toast.success(`Successfully recorded ${resultsData.length} marks!`);

      // Update initialMarks to match new saved state
      setInitialMarks({ ...marks });
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Submit error:', error);
      const msg =
        error.response?.data?.detail?.message ||
        error.response?.data?.detail ||
        'Failed to submit marks. Please verify permissions and values.';
      toast.error(typeof msg === 'string' ? msg : 'Failed to submit marks');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClassObj = classes.find((c) => c.id === selectedClass);
  const selectedExamObj = examTypes.find((e) => e.id === selectedExam);

  return (
    <div className="space-y-6 font-body text-[#0F172A] dark:text-[#F8FAFC]">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#253044] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <span>Teacher Portal</span>
            <span>/</span>
            <span>Evaluation & Results</span>
            <span>/</span>
            <span className="text-[#1769FF] dark:text-[#3B82F6]">Enter Results</span>
          </div>
          <h1 className="mt-1 font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Enter Student Results
          </h1>
          <p className="text-xs md:text-sm text-[#64748B] dark:text-[#94A3B8] font-medium mt-1">
            Input, review, and submit examination marks for your assigned classes and curriculum subjects.
          </p>
        </div>

        {/* Academic Context & Rule Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#10151F] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#253044] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#1769FF] dark:text-[#3B82F6]" />
            <span>AY 2026–27</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs">
            <Award className="w-3.5 h-3.5" />
            <span>Marks Range: 35 – 100</span>
          </div>
        </div>
      </div>

      {/* ── Configuration Selectors Card ── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 sm:p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* 1. Class Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Assigned Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value ? Number(e.target.value) : '');
                setSelectedExam('');
              }}
              disabled={loadingInitial}
              className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 cursor-pointer disabled:opacity-50"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Standard {c.class_name} - Division {c.division}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Exam Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Examination Assessment
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value ? Number(e.target.value) : '')}
              disabled={!selectedClass}
              className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 cursor-pointer disabled:opacity-50"
            >
              <option value="">Select Exam Type</option>
              {examTypes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.weightage}% weightage)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Total Marks Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Max Total Marks per Subject
            </label>
            <input
              type="number"
              value={totalMarks}
              onChange={(e) =>
                setTotalMarks(Math.max(MIN_MARKS, Math.min(MAX_MARKS, Number(e.target.value) || 100)))
              }
              min={MIN_MARKS}
              max={MAX_MARKS}
              disabled={!selectedClass}
              className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] text-xs md:text-sm font-mono font-medium outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* ── State Feedback & Guidance Messages ── */}
      {loadingClassData && (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-2" />
          <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Loading student roster and subjects...
          </p>
        </div>
      )}

      {!loadingClassData && !selectedClass && (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
          <FileSpreadsheet className="w-10 h-10 text-[#64748B] dark:text-[#94A3B8] mx-auto mb-3 opacity-60" />
          <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            No Class Selected
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto mt-1">
            Choose an assigned class and exam assessment from the dropdowns above to open the marks entry sheet.
          </p>
        </div>
      )}

      {!loadingClassData && selectedClass && students.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-xs">
          <Users className="w-10 h-10 text-[#64748B] dark:text-[#94A3B8] mx-auto mb-3 opacity-60" />
          <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            No Students Enrolled
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto mt-1">
            There are no student enrollments registered under this class. Contact your administration.
          </p>
        </div>
      )}

      {!loadingClassData && selectedClass && students.length > 0 && subjects.length === 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-heading text-sm font-bold text-amber-900 dark:text-amber-200">
                No Teaching Assignments Found for This Class
              </h4>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                You are not mapped to any subjects in Standard {selectedClassObj?.class_name} - {selectedClassObj?.division}. Ensure the administrator has mapped your subject allocation or generated the timetable slots.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loadingClassData && students.length > 0 && subjects.length > 0 && !selectedExam && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-950/20 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1769FF] dark:text-[#3B82F6] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-heading text-sm font-bold text-[#0F172A] dark:text-white">
                Class Loaded: Standard {selectedClassObj?.class_name} - {selectedClassObj?.division}
              </h4>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                {students.length} students enrolled · {subjects.length} subject{subjects.length > 1 ? 's' : ''} (
                {subjects.map((s) => s.subject_name).join(', ')})
              </p>
              <p className="text-xs font-semibold text-[#1769FF] dark:text-[#3B82F6] mt-2">
                → Select an Examination Assessment above to begin entering marks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Marks Entry Data Table ── */}
      {!loadingClassData && students.length > 0 && subjects.length > 0 && selectedExam && (
        <div className="space-y-4">
          {/* Active Context Banner & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Standard {selectedClassObj?.class_name} - Division {selectedClassObj?.division}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Assessment: <span className="font-semibold">{selectedExamObj?.name}</span> · Maximum Marks: {totalMarks}
                </p>
              </div>
            </div>

            {/* Quick Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search student by name or roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-xs text-[#0F172A] dark:text-[#F8FAFC] outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs">
                {/* Table Header */}
                <thead className="sticky top-0 z-20 border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]">
                  <tr>
                    {/* Sticky Roll No */}
                    <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] w-20 sticky left-0 z-30 bg-[#F8FAFC] dark:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044]">
                      Roll No
                    </th>

                    {/* Sticky Student Name */}
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] min-w-[160px] sticky left-20 z-30 bg-[#F8FAFC] dark:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044]">
                      Student Name
                    </th>

                    {/* Subject Columns */}
                    {subjects.map((sub) => (
                      <th
                        key={sub.id}
                        className="px-3 py-3 font-bold uppercase tracking-wider text-center text-[#64748B] dark:text-[#94A3B8] border-r border-[#E2E8F0] dark:border-[#253044] min-w-[110px]"
                      >
                        <div className="truncate max-w-[120px] mx-auto" title={sub.subject_name}>
                          {sub.subject_name}
                        </div>
                        <span className="text-[10px] font-mono text-[#1769FF] dark:text-[#3B82F6] font-semibold lowercase">
                          /{totalMarks}
                        </span>
                      </th>
                    ))}

                    {/* Computed Total */}
                    <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center text-[#64748B] dark:text-[#94A3B8] border-r border-[#E2E8F0] dark:border-[#253044] w-24">
                      Total
                    </th>

                    {/* Percentage */}
                    <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center text-[#64748B] dark:text-[#94A3B8] border-r border-[#E2E8F0] dark:border-[#253044] w-20">
                      %
                    </th>

                    {/* Grade */}
                    <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center text-[#64748B] dark:text-[#94A3B8] w-20">
                      Grade
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#253044]">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5 + subjects.length}
                        className="py-10 text-center text-[#64748B] dark:text-[#94A3B8]"
                      >
                        No matching students found for "{search}".
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const total = calculateStudentTotal(student.id);
                      const percentage = calculateStudentPercentage(student.id);
                      const grade = total > 0 ? calculateGrade(percentage) : '—';

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Sticky Roll No */}
                          <td className="px-4 py-2.5 font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] sticky left-0 z-10 bg-white dark:bg-[#10151F] border-r border-[#E2E8F0] dark:border-[#253044]">
                            {student.roll_no}
                          </td>

                          {/* Sticky Student Name */}
                          <td className="px-5 py-2.5 font-medium text-sm text-[#0F172A] dark:text-[#F8FAFC] sticky left-20 z-10 bg-white dark:bg-[#10151F] border-r border-[#E2E8F0] dark:border-[#253044]">
                            {student.name}
                          </td>

                          {/* Subject Inputs */}
                          {subjects.map((sub) => {
                            const val = getMark(student.id, sub.id);
                            const validation = getMarkValidation(student.id, sub.id);

                            return (
                              <td
                                key={sub.id}
                                className="px-2.5 py-2 text-center border-r border-[#E2E8F0] dark:border-[#253044]"
                              >
                                <input
                                  type="number"
                                  min={MIN_MARKS}
                                  max={Math.min(totalMarks, MAX_MARKS)}
                                  value={val}
                                  onChange={(e) => handleMarkChange(student.id, sub.id, e.target.value)}
                                  placeholder="—"
                                  title={
                                    validation === 'invalid'
                                      ? `Marks must be between ${MIN_MARKS} and ${totalMarks}`
                                      : ''
                                  }
                                  className={`w-20 h-8 px-2 rounded-lg border text-center font-mono text-xs font-semibold outline-none transition-all ${
                                    validation === 'invalid'
                                      ? 'border-red-500 bg-red-50/50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300 ring-1 ring-red-500'
                                      : val !== ''
                                      ? 'border-blue-300/80 dark:border-blue-800/80 bg-blue-50/30 dark:bg-blue-950/20 text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#1769FF]'
                                      : 'border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] focus:border-[#1769FF] dark:focus:border-[#3B82F6]'
                                  }`}
                                />
                              </td>
                            );
                          })}

                          {/* Total Marks */}
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] border-r border-[#E2E8F0] dark:border-[#253044]">
                            {total > 0 ? total : <span className="text-slate-400 font-normal">—</span>}
                          </td>

                          {/* Percentage */}
                          <td className="px-4 py-2.5 text-center font-mono font-semibold text-xs text-[#64748B] dark:text-[#94A3B8] border-r border-[#E2E8F0] dark:border-[#253044]">
                            {total > 0 ? `${percentage.toFixed(1)}%` : <span className="text-slate-400">—</span>}
                          </td>

                          {/* Grade Pill */}
                          <td className="px-4 py-2.5 text-center">
                            {total > 0 ? (
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md text-xs font-extrabold border ${getGradeBadge(
                                  grade
                                )}`}
                              >
                                {grade}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Table Footer Action Bar ── */}
            <div className="px-6 py-4 border-t border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
                <span>
                  <strong>{students.length}</strong> Students
                </span>
                <span>•</span>
                <span>
                  <strong>{subjects.length}</strong> Subjects
                </span>
                <span>•</span>
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{filledMarksCount}</strong> Marks
                  Recorded
                </span>
                {hasChanges && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-[#1769FF] dark:text-[#3B82F6]">
                    Unsaved Changes
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                {hasChanges && (
                  <button
                    type="button"
                    onClick={() => setMarks({ ...initialMarks })}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || filledMarksCount === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-xs font-bold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] shadow-xs hover:shadow-md transition-all active:scale-[.98] cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Marks...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Results ({filledMarksCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsEntry;