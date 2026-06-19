import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ResultsService } from '../features/results/services';
import { 
  SchoolClass, 
  Subject, 
  Student, 
  ExamType, 
  StudentMarksRow,
  ResultSubmission
} from '../features/results/types';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  Download, 
  Check, 
  X, 
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  Eye,
  Users
} from 'lucide-react';

const Results: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Shared state
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  // Teacher specific state
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<number | ''>('');
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);
  const [marksRows, setMarksRows] = useState<StudentMarksRow[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<'pending' | 'submitted' | 'approved' | null>(null);

  // Admin specific state
  const [pendingSubmissions, setPendingSubmissions] = useState<ResultSubmission[]>([]);
  const [reviewingSubmission, setReviewingSubmission] = useState<ResultSubmission | null>(null);
  const [reviewRows, setReviewRows] = useState<StudentMarksRow[]>([]);
  
  // Student Registry management (Admin)
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [registryClassFilter, setRegistryClassFilter] = useState<number | ''>('');
  const [registryDivFilter, setRegistryDivFilter] = useState<string | ''>('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);

  // Load basic configurations
  const loadConfigData = async () => {
    const classData = await ResultsService.getClasses();
    const examData = await ResultsService.getExamTypes();
    const subjectData = await ResultsService.getSubjects();
    setClasses(classData);
    setExamTypes(examData);
    setAllSubjects(subjectData);

    if (isAdmin) {
      const submissions = await ResultsService.getSubmissions();
      setPendingSubmissions(submissions.filter(s => s.status === 'pending'));
      const studentData = await ResultsService.getStudents();
      setStudents(studentData);
    }
  };

  useEffect(() => {
    loadConfigData();
  }, [isAdmin]);

  // Handle Class selection in Teacher view
  useEffect(() => {
    if (!isAdmin && selectedClassId) {
      const cls = classes.find(c => c.id === selectedClassId);
      if (cls) {
        ResultsService.getClassSubjects(cls.class_name).then(setClassSubjects);
      }
    } else {
      setClassSubjects([]);
    }
    setMarksRows([]);
    setSubmissionStatus(null);
  }, [selectedClassId, classes, isAdmin]);

  // Load Marks sheet for Teacher once both class and exam type are selected
  useEffect(() => {
    if (!isAdmin && selectedClassId && selectedExamTypeId) {
      ResultsService.getStudentMarksRows(Number(selectedClassId), Number(selectedExamTypeId))
        .then(rows => {
          setMarksRows(rows);
          if (rows.length > 0) {
            setSubmissionStatus(rows[0].status);
          } else {
            setSubmissionStatus(null);
          }
        });
    }
  }, [selectedClassId, selectedExamTypeId, isAdmin]);

  // Teacher: recalculate totals, percentage, grade, pass/fail on cell edit
  const handleMarkChange = (studentId: number, subjectId: number, rawValue: string) => {
    const marksObtained = Math.min(
      // Cap at maximum marks depending on exam type
      selectedExamTypeId === 1 || selectedExamTypeId === 2 ? 20 : 100, 
      Math.max(0, Number(rawValue) || 0)
    );

    setMarksRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;

      const updatedMarks = { ...row.marks, [subjectId]: marksObtained };
      
      // Calculate totals
      let total = 0;
      let maxTotal = 0;
      classSubjects.forEach(s => {
        const val = updatedMarks[s.id] || 0;
        total += val;
        maxTotal += (selectedExamTypeId === 1 || selectedExamTypeId === 2) ? 20 : 100;
      });

      const percentage = maxTotal > 0 ? parseFloat(((total / maxTotal) * 100).toFixed(2)) : 0;
      
      // Dynamic grade / pass-fail lookup
      const { grade, passFail } = calculateFormulaValues(percentage);

      return {
        ...row,
        marks: updatedMarks,
        total,
        percentage,
        grade,
        passFail
      };
    }));
  };

  const calculateFormulaValues = (percentage: number): { grade: string, passFail: 'Pass' | 'Fail' } => {
    if (percentage >= 90) return { grade: 'A1', passFail: 'Pass' };
    if (percentage >= 80) return { grade: 'A2', passFail: 'Pass' };
    if (percentage >= 70) return { grade: 'B1', passFail: 'Pass' };
    if (percentage >= 60) return { grade: 'B2', passFail: 'Pass' };
    if (percentage >= 50) return { grade: 'C1', passFail: 'Pass' };
    if (percentage >= 35) return { grade: 'C2', passFail: 'Pass' };
    return { grade: 'D', passFail: 'Fail' };
  };

  // Submit/Save Marks
  const handleSaveOrSubmit = async (isSubmit: boolean) => {
    if (!selectedClassId || !selectedExamTypeId) return;
    
    const loadingToast = toast.loading(isSubmit ? 'Submitting marks...' : 'Saving draft...');
    
    try {
      const success = await ResultsService.saveOrSubmitResults(
        Number(selectedClassId),
        Number(selectedExamTypeId),
        marksRows,
        user?.name || 'Teacher',
        user?.id || 2,
        isSubmit
      );

      if (success) {
        toast.dismiss(loadingToast);
        toast.success(isSubmit ? 'Marks submitted successfully!' : 'Draft saved successfully!');
        setSubmissionStatus(isSubmit ? 'submitted' : 'pending');
        
        // Dispatch event so layout topbar notification checks updates live
        window.dispatchEvent(new CustomEvent('reload-notifications'));
      } else {
        toast.dismiss(loadingToast);
        toast.error('Failed to submit results. Check input constraints.');
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error('Error occurred during upload');
    }
  };

  // Admin Review modal loading
  const openReviewModal = async (submission: ResultSubmission) => {
    setReviewingSubmission(submission);
    
    // Retrieve students list of class
    const rows = await ResultsService.getStudentMarksRows(submission.class_id, submission.exam_type_id);
    setReviewRows(rows);
  };

  const handleAdminMarkChange = (studentId: number, subjectId: number, rawValue: string) => {
    const examTypeId = reviewingSubmission?.exam_type_id;
    const maxMarks = examTypeId === 1 || examTypeId === 2 ? 20 : 100;
    const marksObtained = Math.min(maxMarks, Math.max(0, Number(rawValue) || 0));

    const cls = classes.find(c => c.id === reviewingSubmission?.class_id);
    const subjs = cls ? allSubjects.filter(s => {
      const cNum = parseInt(cls.class_name, 10);
      return cNum <= 4 ? [1, 2, 3, 4, 9].includes(s.id) : [1, 2, 3, 5, 6, 7, 8, 9].includes(s.id);
    }) : [];

    setReviewRows(prev => prev.map(row => {
      if (row.studentId !== studentId) return row;

      const updatedMarks = { ...row.marks, [subjectId]: marksObtained };
      let total = 0;
      let maxTotal = 0;
      subjs.forEach(s => {
        total += updatedMarks[s.id] || 0;
        maxTotal += maxMarks;
      });

      const percentage = maxTotal > 0 ? parseFloat(((total / maxTotal) * 100).toFixed(2)) : 0;
      const { grade, passFail } = calculateFormulaValues(percentage);

      return {
        ...row,
        marks: updatedMarks,
        total,
        percentage,
        grade,
        passFail
      };
    }));
  };

  const handleApprove = async () => {
    if (!reviewingSubmission) return;
    const loadingToast = toast.loading('Approving submission...');
    
    // Save current modal marks first
    await ResultsService.saveOrSubmitResults(
      reviewingSubmission.class_id,
      reviewingSubmission.exam_type_id,
      reviewRows,
      reviewingSubmission.teacher_name,
      user?.id || 1,
      true
    );

    // Approve the submission
    const success = await ResultsService.approveSubmission(reviewingSubmission.id, user?.id || 1);
    if (success) {
      toast.dismiss(loadingToast);
      toast.success('Results approved successfully!');
      setReviewingSubmission(null);
      loadConfigData();
    } else {
      toast.dismiss(loadingToast);
      toast.error('Approval failed');
    }
  };

  const handleReject = async () => {
    if (!reviewingSubmission) return;
    const success = await ResultsService.rejectSubmission(reviewingSubmission.id);
    if (success) {
      toast.success('Submission rejected and returned to teacher');
      setReviewingSubmission(null);
      loadConfigData();
    } else {
      toast.error('Rejection failed');
    }
  };

  // Mock download CSV
  const handleDownloadExcel = (className: string, division: string, examName: string, rows: StudentMarksRow[]) => {
    const cls = classes.find(c => c.class_name === className && c.division === division);
    const clsSubjects = cls ? (parseInt(cls.class_name, 10) <= 4 
      ? allSubjects.filter(s => [1, 2, 3, 4, 9].includes(s.id))
      : allSubjects.filter(s => [1, 2, 3, 5, 6, 7, 8, 9].includes(s.id))
    ) : [];

    // Header Row
    const headers = ['Roll No', 'Student Name', ...clsSubjects.map(s => s.subject_name), 'Total', 'Percentage', 'Grade', 'Pass/Fail'];
    
    // Content rows
    const dataRows = rows.map(r => {
      const subjectMarks = clsSubjects.map(s => r.marks[s.id] || 0);
      return [r.rollNo, r.studentName, ...subjectMarks, r.total, `${r.percentage}%`, r.grade, r.passFail];
    });

    const csvContent = [headers.join(','), ...dataRows.map(dr => dr.join(','))].join('\n');
    
    // Trigger browser file download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Amarkor_Vidyalaya_${className}${division}_${examName.replace(/\s+/g, '_')}_Marksheet.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Download Triggered!');
  };

  // Student Registry management (Admin)
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          student.roll_no.includes(studentSearch);
    const matchesClass = registryClassFilter ? student.class_id === Number(registryClassFilter) : true;
    
    return matchesSearch && matchesClass;
  });

  const handleOpenAddStudent = () => {
    setEditingStudent({ name: '', roll_no: '', class_id: classes[0]?.id || 1 });
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!editingStudent?.name || !editingStudent?.roll_no || !editingStudent?.class_id) {
      toast.error('All fields are required');
      return;
    }

    if (editingStudent.id) {
      await ResultsService.updateStudent(editingStudent as Student);
      toast.success('Student updated successfully');
    } else {
      await ResultsService.addStudent(editingStudent as Omit<Student, 'id' | 'status'>);
      toast.success('Student added successfully');
    }
    setIsStudentModalOpen(false);
    loadConfigData();
  };

  const handleDeleteStudent = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      await ResultsService.deleteStudent(id);
      toast.success('Student deleted');
      loadConfigData();
    }
  };

  return (
    <div className="space-y-8 font-body">
      
      {/* Teacher Module Block */}
      {!isAdmin && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="font-heading text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-accent" />
              <span>{t('results.teacher_view')}</span>
            </h3>
            
            {/* Filter selectors */}
            <div className="grid gap-4 sm:grid-cols-3 max-w-4xl">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  {t('common.class')}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm"
                >
                  <option value="">-- {t('results.select_class')} --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Standard {c.class_name} - Division {c.division}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  {t('results.select_exam')}
                </label>
                <select
                  value={selectedExamTypeId}
                  onChange={(e) => setSelectedExamTypeId(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm"
                >
                  <option value="">-- {t('results.select_exam')} --</option>
                  {examTypes.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {/* Approval status banner for selected slot */}
              {selectedClassId && selectedExamTypeId && submissionStatus && (
                <div className="flex items-end">
                  <div className={`w-full flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold ${
                    submissionStatus === 'approved' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : submissionStatus === 'submitted'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {submissionStatus === 'approved' ? (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                        <span>Status: {t('results.status_approved')} (Read-Only)</span>
                      </>
                    ) : submissionStatus === 'submitted' ? (
                      <>
                        <Clock className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                        <span>Status: {t('results.status_pending')} (Read-Only)</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4.5 w-4.5 text-slate-400" />
                        <span>Status: {t('results.status_draft')} (Editable)</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student spreadsheet UI */}
          {selectedClassId && selectedExamTypeId && (
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden animate-fade-in">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h4 className="font-heading text-sm font-bold text-slate-900">
                    Academic Marksheet Grid
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 tracking-wider">
                    Maximum score for this exam: {selectedExamTypeId === 1 || selectedExamTypeId === 2 ? '20 marks' : '100 marks'}
                  </p>
                </div>
                {submissionStatus !== 'approved' && submissionStatus !== 'submitted' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveOrSubmit(false)}
                      className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 bg-white"
                    >
                      {t('results.save_draft')}
                    </button>
                    <button
                      onClick={() => handleSaveOrSubmit(true)}
                      className="rounded-lg bg-slate-900 hover:bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all"
                    >
                      {t('results.submit_results')}
                    </button>
                  </div>
                )}
              </div>

              {/* Spreadsheet Grid Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-500">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-100 uppercase text-[10px] font-extrabold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100 w-16">{t('results.roll_no')}</th>
                      <th className="px-6 py-3 border-r border-slate-100 min-w-[160px]">{t('results.student_name')}</th>
                      {classSubjects.map(subject => (
                        <th key={subject.id} className="px-4 py-3 border-r border-slate-100 text-center font-bold">
                          {subject.subject_name} ({subject.code})
                        </th>
                      ))}
                      <th className="px-4 py-3 border-r border-slate-100 text-center font-bold">{t('results.total')}</th>
                      <th className="px-4 py-3 border-r border-slate-100 text-center font-bold">%</th>
                      <th className="px-4 py-3 border-r border-slate-100 text-center font-bold">{t('results.grade')}</th>
                      <th className="px-4 py-3 text-center font-bold">{t('results.pass_fail')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {marksRows.map((row) => (
                      <tr key={row.studentId} className="hover:bg-slate-50/50">
                        {/* Roll */}
                        <td className="px-4 py-3 border-r border-slate-100 text-slate-900 font-bold text-center">
                          {row.rollNo}
                        </td>
                        {/* Student Name */}
                        <td className="px-6 py-3 border-r border-slate-100 text-slate-900 font-semibold">
                          {row.studentName}
                        </td>
                        {/* Subject Marks inputs */}
                        {classSubjects.map(subject => {
                          const isReadonly = submissionStatus === 'approved' || submissionStatus === 'submitted';
                          return (
                            <td key={subject.id} className="px-2 py-1.5 border-r border-slate-100 text-center">
                              {isReadonly ? (
                                <span className="font-bold text-slate-800">{row.marks[subject.id] || 0}</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  max={selectedExamTypeId === 1 || selectedExamTypeId === 2 ? 20 : 100}
                                  value={row.marks[subject.id] ?? 0}
                                  onChange={(e) => handleMarkChange(row.studentId, subject.id, e.target.value)}
                                  className="w-16 rounded border border-slate-200 py-1 text-center font-bold text-slate-900 focus:border-accent focus:ring-1 focus:ring-accent/25 focus:outline-none"
                                />
                              )}
                            </td>
                          );
                        })}
                        {/* Total */}
                        <td className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-900">
                          {row.total}
                        </td>
                        {/* Percentage */}
                        <td className="px-4 py-3 border-r border-slate-100 text-center font-semibold text-slate-700">
                          {row.percentage}%
                        </td>
                        {/* Grade */}
                        <td className="px-4 py-3 border-r border-slate-100 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                            row.grade === 'D' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {row.grade}
                          </span>
                        </td>
                        {/* Pass Fail */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase ${
                            row.passFail === 'Pass' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {row.passFail}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Module Block */}
      {isAdmin && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Pending Reviews Roster */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="font-heading text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent animate-pulse" />
              <span>{t('results.pending_submissions')}</span>
            </h3>

            {pendingSubmissions.length === 0 ? (
              <div className="rounded-lg bg-slate-50 border border-slate-200/50 p-6 text-center text-xs text-slate-500">
                All teacher submission entries are reviewed. Great job!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-500 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">{t('results.teacher_name')}</th>
                      <th className="px-6 py-3">{t('common.class')}</th>
                      <th className="px-6 py-3">{t('results.select_exam')}</th>
                      <th className="px-6 py-3">{t('results.submission_date')}</th>
                      <th className="px-6 py-3 text-center">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pendingSubmissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 text-slate-900">
                        <td className="px-6 py-4 font-bold">{sub.teacher_name}</td>
                        <td className="px-6 py-4">Standard {sub.class_name} - Division {sub.division}</td>
                        <td className="px-6 py-4">{sub.exam_type_name}</td>
                        <td className="px-6 py-4 text-slate-500">{sub.submission_date}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openReviewModal(sub)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{t('results.review_marks')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Registry Table & CRUD */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span>{t('results.student_list')}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                  Manage profiles, roll numbers, and grades
                </p>
              </div>

              <button
                onClick={handleOpenAddStudent}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition self-start"
              >
                <Plus className="h-4 w-4" />
                <span>{t('results.add_student')}</span>
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name or roll number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm"
                />
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={registryClassFilter}
                  onChange={(e) => setRegistryClassFilter(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm bg-white"
                >
                  <option value="">{t('common.all')} Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Class {c.class_name}{c.division}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-500 border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Roll No</th>
                    <th className="px-6 py-3">{t('results.student_name')}</th>
                    <th className="px-6 py-3">{t('common.class')}</th>
                    <th className="px-6 py-3 text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                  {filteredStudents.map(student => {
                    const cls = classes.find(c => c.id === student.class_id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-500">{student.roll_no}</td>
                        <td className="px-6 py-4 font-bold">{student.name}</td>
                        <td className="px-6 py-4">Standard {cls ? `${cls.class_name} Division ${cls.division}` : 'Unknown'}</td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditStudent(student)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 bg-white shadow-sm"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 border border-slate-200 bg-white shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin Review / Edit Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl rounded-2xl bg-white shadow-premium border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-950 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-accent" />
                  <span>Review Marksheet: Class {reviewingSubmission.class_name}{reviewingSubmission.division} - {reviewingSubmission.exam_type_name}</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Submitted by {reviewingSubmission.teacher_name} on {reviewingSubmission.submission_date}
                </p>
              </div>
              <button
                onClick={() => setReviewingSubmission(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - spreadsheet editable */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs">
                <span className="text-slate-500 font-semibold">Review, edit, and approve marks for all students. Formulas auto-calculate.</span>
                <button
                  onClick={() => handleDownloadExcel(reviewingSubmission.class_name, reviewingSubmission.division, reviewingSubmission.exam_type_name, reviewRows)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold hover:bg-slate-50 text-slate-700 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t('results.download_excel')}</span>
                </button>
              </div>

              {/* Spreadsheet Grid */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-150 uppercase text-[9px] font-extrabold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100 w-16">{t('results.roll_no')}</th>
                      <th className="px-6 py-3 border-r border-slate-100 min-w-[160px]">{t('results.student_name')}</th>
                      {allSubjects.filter(s => {
                        const cNum = parseInt(reviewingSubmission.class_name, 10);
                        return cNum <= 4 ? [1, 2, 3, 4, 9].includes(s.id) : [1, 2, 3, 5, 6, 7, 8, 9].includes(s.id);
                      }).map(sub => (
                        <th key={sub.id} className="px-3 py-3 border-r border-slate-100 text-center">
                          {sub.subject_name}
                        </th>
                      ))}
                      <th className="px-4 py-3 border-r border-slate-100 text-center">Total</th>
                      <th className="px-4 py-3 border-r border-slate-100 text-center">%</th>
                      <th className="px-4 py-3 border-r border-slate-100 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {reviewRows.map(row => {
                      const activeSubjs = allSubjects.filter(s => {
                        const cNum = parseInt(reviewingSubmission.class_name, 10);
                        return cNum <= 4 ? [1, 2, 3, 4, 9].includes(s.id) : [1, 2, 3, 5, 6, 7, 8, 9].includes(s.id);
                      });
                      return (
                        <tr key={row.studentId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 border-r border-slate-100 font-extrabold text-slate-900 text-center">{row.rollNo}</td>
                          <td className="px-6 py-3 border-r border-slate-100 font-semibold text-slate-900">{row.studentName}</td>
                          
                          {activeSubjs.map(sub => (
                            <td key={sub.id} className="px-2 py-1.5 border-r border-slate-100 text-center">
                              <input
                                type="number"
                                min="0"
                                max={reviewingSubmission.exam_type_id === 1 || reviewingSubmission.exam_type_id === 2 ? 20 : 100}
                                value={row.marks[sub.id] ?? 0}
                                onChange={(e) => handleAdminMarkChange(row.studentId, sub.id, e.target.value)}
                                className="w-14 rounded border border-slate-200 py-1 text-center font-bold text-slate-900 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                              />
                            </td>
                          ))}

                          <td className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-900">{row.total}</td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-700">{row.percentage}%</td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center">
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              {row.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            <span className={row.passFail === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}>
                              {row.passFail}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50">
              <button
                onClick={() => setReviewingSubmission(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-55 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  <span>{t('results.reject')}</span>
                </button>
                
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                >
                  <Check className="h-4 w-4" />
                  <span>{t('results.approve')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Student Registry Modal (Add / Edit Student) */}
      {isStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-premium border border-slate-200 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <h3 className="font-heading text-sm font-bold text-slate-950">
                {editingStudent.id ? t('results.edit_student') : t('results.add_student')}
              </h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Student Name</label>
                <input
                  type="text"
                  value={editingStudent.name || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  placeholder="e.g. Abhay Kamble"
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Roll No</label>
                <input
                  type="text"
                  value={editingStudent.roll_no || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, roll_no: e.target.value })}
                  placeholder="e.g. 806"
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Class Assignment</label>
                <select
                  value={editingStudent.class_id || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, class_id: Number(e.target.value) })}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Standard {c.class_name} Division {c.division}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50">
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveStudent}
                className="rounded-lg bg-slate-900 hover:bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Results;
