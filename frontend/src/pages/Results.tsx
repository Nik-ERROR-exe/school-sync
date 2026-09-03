import React, { useState, useEffect, useRef, useId } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api';
import {
  Download,
  Check,
  Loader2,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  GraduationCap,
  Sparkles,
  Edit3,
  School,
  FileText,
} from 'lucide-react';

// Marks range rule: entered marks must be between 35 and 100.
const MIN_MARKS = 35;
const MAX_MARKS = 100;

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
  totalMarks: number;
  onSave: (resultId: number | null, newMarks: number, totalMarks: number) => void;
}

const EditableMarkInput: React.FC<EditableMarkInputProps> = ({
  resultId,
  initialValue,
  totalMarks,
  onSave,
}) => {
  const [val, setVal] = useState<string>(initialValue !== null ? String(initialValue) : '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setVal(initialValue !== null ? String(initialValue) : '');
  }, [initialValue]);

  const handleBlur = () => {
    setIsFocused(false);
    if (val === '' || val === null) {
      setVal(initialValue !== null ? String(initialValue) : '');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setVal(initialValue !== null ? String(initialValue) : '');
      return;
    }
    const maxAllowed = Math.min(totalMarks, MAX_MARKS);
    if (num < MIN_MARKS || num > maxAllowed) {
      toast.error(`Marks must be between ${MIN_MARKS} and ${maxAllowed}.`);
      setVal(initialValue !== null ? String(initialValue) : '');
      return;
    }
    if (num !== initialValue) {
      onSave(resultId, num, totalMarks);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`
          w-16 md:w-20 px-2 py-1.5 text-xs font-semibold text-center rounded-lg border
          transition-all duration-150 outline-hidden font-body
          ${
            isFocused
              ? 'border-[#1769FF] dark:border-[#3B82F6] ring-2 ring-[#1769FF]/20 dark:ring-[#3B82F6]/25 bg-white dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC]'
              : 'border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] hover:border-blue-400/60 dark:hover:border-blue-500/60'
          }
        `}
        min={MIN_MARKS}
        max={Math.min(totalMarks, MAX_MARKS)}
        aria-label="Enter mark"
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM ACCESSIBLE DROPDOWN COMPONENT
   - Displays ONLY the label (NO weightage, badges or secondary clutter)
   - Full keyboard navigation (Arrow keys, Enter, Space, Escape, Tab, Home, End)
   - Click-outside handling
   - Exact application font family (Inter/Sora) and theme tokens
   ───────────────────────────────────────────────────────────────────────────── */
interface DropdownOption<T> {
  value: T;
  label: string;
}

interface CustomDropdownProps<T extends number | string> {
  id: string;
  label: string;
  options: DropdownOption<T>[];
  value: T | '';
  onChange: (val: T) => void;
  placeholder: string;
  icon?: React.ReactNode;
}

function CustomDropdown<T extends number | string>({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  icon,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  // Close when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
    }
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  // Set initial highlight to currently selected option on open
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, options, value]);

  // Ensure highlighted option is visible in scroll container
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (isOpen) setHighlightedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (isOpen) setHighlightedIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex].value);
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative font-body" ref={containerRef}>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5"
      >
        <span className="flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </span>
      </label>

      <button
        type="button"
        id={id}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`
          w-full h-10 px-3.5 rounded-xl border text-left flex items-center justify-between
          transition-all duration-200 outline-hidden select-none cursor-pointer
          ${
            isOpen
              ? 'border-[#1769FF] dark:border-[#3B82F6] ring-2 ring-[#1769FF]/20 dark:ring-[#3B82F6]/25 bg-white dark:bg-[#161D29] shadow-xs'
              : 'border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-xs'
          }
          focus-visible:ring-2 focus-visible:ring-[#1769FF] dark:focus-visible:ring-[#3B82F6] focus-visible:border-transparent
        `}
      >
        <span className="truncate pr-2">
          {selectedOption ? (
            <span className="text-xs md:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC]">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-normal">
              {placeholder}
            </span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[#475569] dark:text-[#94A3B8] transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180 text-[#1769FF] dark:text-[#3B82F6]' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-opt-${highlightedIndex}` : undefined
          }
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-1.5 shadow-xl ring-1 ring-black/5 animate-dropdown-reveal"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[#475569] dark:text-[#94A3B8] text-center italic">
              No options available
            </li>
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={String(opt.value)}
                  id={`${id}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs md:text-sm cursor-pointer
                    transition-colors duration-150 select-none
                    ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1769FF] dark:text-[#3B82F6] font-semibold'
                        : isHighlighted
                        ? 'bg-[#F1F5F9] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC]'
                        : 'text-[#0F172A] dark:text-[#F8FAFC]'
                    }
                  `}
                >
                  <span className="truncate pr-3 font-medium">{opt.label}</span>
                  {isSelected && (
                    <Check
                      className="w-4 h-4 shrink-0 text-[#1769FF] dark:text-[#3B82F6]"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CLEAN PROFESSIONAL BLUE DOWNLOAD EXCEL BUTTON
   - Color: Application's EXISTING BLUE accent token (#1769FF / #3B82F6)
   - Compact, uncluttered ERP button
   - Normal: [↓ Download Excel]
   - Hover: icon glides down subtly, subtle blue glow
   - Active: scale(.98)
   - Loading: [◌ Downloading...]
   - Success: [✓ Downloaded]
   ───────────────────────────────────────────────────────────────────────────── */
interface DownloadButtonProps {
  onClick: () => void;
  disabled: boolean;
  downloading: boolean;
  downloadSuccess: boolean;
}

const DownloadExcelButton: React.FC<DownloadButtonProps> = ({
  onClick,
  disabled,
  downloading,
  downloadSuccess,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || downloading}
      aria-label="Download Excel spreadsheet"
      className={`
        group relative inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl
        font-heading text-xs font-semibold text-white select-none cursor-pointer
        transition-all duration-200 ease-out active:scale-[.98] shadow-xs
        focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769FF] dark:focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10151F]
        ${
          downloadSuccess
            ? 'bg-blue-600 dark:bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-400'
            : 'bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] hover:shadow-md hover:shadow-blue-500/25 active:bg-[#0C4EC7]'
        }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none
      `}
    >
      {downloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
          <span>Downloading..</span>
        </>
      ) : downloadSuccess ? (
        <>
          <Check className="w-4 h-4 text-white shrink-0 animate-fade-in" />
          <span className="animate-fade-in">Downloaded</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-white shrink-0 transition-transform duration-200 ease-out group-hover:translate-y-0.5" />
          <span className="transition-colors duration-200">Download Excel</span>
        </>
      )}
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN RESULTS COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
const Results: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');
  const [totalMarksInput, setTotalMarksInput] = useState<string>('100');

  // Parse total marks validation
  const totalMarksNum = Number(totalMarksInput);
  const isTotalMarksValid =
    totalMarksInput !== '' &&
    !isNaN(totalMarksNum) &&
    totalMarksNum >= MIN_MARKS &&
    totalMarksNum <= MAX_MARKS;
  const effectiveTotalMarks = isTotalMarksValid ? totalMarksNum : 100;

  // Load classes (admin endpoint with trailing slash)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/admin/classes/');
        setClasses(response.data);
      } catch {
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
      } catch {
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
        const response = await api.get(
          `/admin/results/class/${selectedClass}/exam/${selectedExam}`
        );
        setStudentResults(response.data.students || []);
        setSubjects(response.data.subjects || []);
      } catch {
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
    newMarks: number,
    total: number
  ) => {
    try {
      let savedResultId: number | null = resultId;

      if (resultId) {
        // Update an existing result
        await api.put(`/admin/results/${resultId}`, {
          marks_obtained: newMarks,
          total_marks: total,
        });
      } else {
        // No result exists yet - create one directly as admin
        const response = await api.post('/admin/results/', {
          results: [
            {
              student_id: studentId,
              subject_id: subjectId,
              exam_type_id: selectedExam,
              marks_obtained: newMarks,
              total_marks: total,
            },
          ],
        });
        const created = response.data?.[0];
        if (created) {
          savedResultId = created.id;
        }
      }

      // Functional update: only touch this cell so overlapping saves don't get clobbered
      setStudentResults((prev) =>
        prev.map((student) => {
          if (student.student_id !== studentId) return student;
          return {
            ...student,
            subjects: student.subjects.map((subject) =>
              subject.subject_id === subjectId
                ? {
                    ...subject,
                    result_id: savedResultId,
                    marks_obtained: newMarks,
                    total_marks: total,
                    percentage: (newMarks / total) * 100,
                    grade: calculateGrade((newMarks / total) * 100),
                    status: 'submitted',
                  }
                : subject
            ),
          };
        })
      );
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

  // Grade badge colors adapted for dark and light theme tokens
  const getGradeBadgeStyle = (grade: string): string => {
    switch (grade) {
      case 'A+':
        return 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60';
      case 'A':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'B':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60';
      case 'C':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
      case 'D':
        return 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60';
      case 'E':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
      case 'F':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-900/60';
      default:
        return 'bg-slate-100 text-[#475569] border-slate-200 dark:bg-[#161D29] dark:text-[#94A3B8] dark:border-[#253044]';
    }
  };

  const calculateOverall = (student: StudentResult) => {
    let totalObtained = 0;
    let totalMax = 0;
    let hasAnyResult = false;
    student.subjects.forEach((subject) => {
      if (subject.marks_obtained !== null && subject.total_marks !== null) {
        totalObtained += subject.marks_obtained;
        totalMax += subject.total_marks;
        hasAnyResult = true;
      }
    });
    if (!hasAnyResult || totalMax === 0) {
      return { percentage: 0, grade: '-', hasResults: false, totalObtained: 0, totalMax: 0 };
    }
    const percentage = (totalObtained / totalMax) * 100;
    const grade = calculateGrade(percentage);
    return { percentage, grade, hasResults: true, totalObtained, totalMax };
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
          format: 'excel',
        },
        responseType: 'blob',
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

      // Brief success feedback state on button
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2400);
      toast.success(`File downloaded: ${filename}`);
    } catch (error: any) {
      console.error('Download error:', error);
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
        // fallback to generic message
      }
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  // Find names for current selections for summary header
  const currentClassObj = classes.find((c) => c.id === selectedClass);
  const currentExamObj = examTypes.find((e) => e.id === selectedExam);

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter">
      {/* ───────────────────────────────────────────────────────────────────────
          PAGE HEADER: Title + Description + Blue Download Button
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#253044] pb-5">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Review Results
          </h1>
          <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-medium mt-1">
            View and edit student marks
          </p>
        </div>

        <div className="self-start sm:self-auto">
          <DownloadExcelButton
            onClick={handleDownloadExcel}
            disabled={!selectedClass || !selectedExam || loading}
            downloading={downloading}
            downloadSuccess={downloadSuccess}
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          EXAM CONFIGURATION GROUPING
          Class, Exam Type & Total Marks
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/40">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-heading text-sm md:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Exam Configuration
            </h2>
          </div>
          <span className="text-[11px] font-medium text-[#475569] dark:text-[#94A3B8] hidden sm:inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#1769FF] dark:text-[#3B82F6]" />
            Select class and exam to load scores
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start">
          {/* Class Dropdown */}
          <CustomDropdown
            id="class-selector"
            label="Class"
            icon={<School className="w-3.5 h-3.5" />}
            placeholder="Select Class"
            options={classes.map((cls) => ({
              value: cls.id,
              label: `${cls.class_name} - Division ${cls.division}`,
            }))}
            value={selectedClass}
            onChange={(val) => setSelectedClass(val as number)}
          />

          {/* Exam Type Custom Accessible Dropdown (ONLY exam names, NO weightage) */}
          <CustomDropdown
            id="exam-selector"
            label="Exam Type"
            icon={<GraduationCap className="w-3.5 h-3.5" />}
            placeholder="Select Exam"
            options={examTypes.map((exam) => ({
              value: exam.id,
              label: exam.name,
            }))}
            value={selectedExam}
            onChange={(val) => setSelectedExam(val as number)}
          />

          {/* Total Marks Input with 35-100 validation */}
          <div className="font-body">
            <label
              htmlFor="total-marks-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5"
            >
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Total Marks</span>
              </span>
            </label>

            <div className="relative">
              <input
                id="total-marks-input"
                type="number"
                value={totalMarksInput}
                onChange={(e) => setTotalMarksInput(e.target.value)}
                min={MIN_MARKS}
                max={MAX_MARKS}
                className={`
                  w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm font-semibold
                  transition-all duration-200 outline-hidden
                  ${
                    !isTotalMarksValid
                      ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20 ring-2 ring-rose-500/20'
                      : 'border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] hover:border-blue-400/60 dark:hover:border-blue-500/60 focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25'
                  }
                `}
                placeholder="100"
              />
            </div>

            {/* Validation Message with smooth fade/slide */}
            {!isTotalMarksValid ? (
              <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Marks must be between {MIN_MARKS} and {MAX_MARKS}</span>
              </p>
            ) : (
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#475569] dark:text-[#94A3B8] mt-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Evaluation standard: {MIN_MARKS} – {MAX_MARKS}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          RESULTS CONTENT / COMPACT EMPTY STATES
          ─────────────────────────────────────────────────────────────────────── */}
      {!selectedClass || !selectedExam ? (
        /* Minimal, compact ERP empty state */
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#253044] bg-white dark:bg-[#10151F] p-8 md:p-10 text-center animate-card-enter">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-3 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-sm md:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            No results to display
          </h3>
          <p className="mt-1 text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] max-w-sm mx-auto">
            Select a class and exam type to review student marks.
          </p>
        </div>
      ) : loading ? (
        /* Polished loading state */
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-sm animate-card-enter">
          <Loader2 className="w-6 h-6 animate-spin text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-2.5" />
          <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Loading examination results...
          </p>
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
            Fetching student score records for this exam
          </p>
        </div>
      ) : studentResults.length === 0 ? (
        /* Empty results state */
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] dark:border-[#253044] bg-white dark:bg-[#10151F] p-8 md:p-10 text-center animate-card-enter">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 mx-auto mb-3 shadow-2xs">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-sm md:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            No results found
          </h3>
          <p className="mt-1 text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] max-w-md mx-auto">
            No student marks have been submitted yet for{' '}
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {currentClassObj ? `${currentClassObj.class_name} - ${currentClassObj.division}` : 'this class'}
            </span>{' '}
            under{' '}
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {currentExamObj ? currentExamObj.name : 'this exam'}
            </span>
            .
          </p>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────────
            RESULTS TABLE CONTAINER WITH STAGGERED ROW ANIMATION
            ───────────────────────────────────────────────────────────────────── */
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-sm overflow-hidden animate-card-enter">
          {/* Table Context Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-[#10151F] border border-[#E2E8F0] dark:border-[#253044] text-[#0F172A] dark:text-[#F8FAFC] shadow-2xs">
                {currentClassObj?.class_name} - Div {currentClassObj?.division}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-[#1769FF] dark:text-[#3B82F6]">
                {currentExamObj?.name}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                {studentResults.length} {studentResults.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#475569] dark:text-[#94A3B8]">
              <Edit3 className="w-3.5 h-3.5 text-[#1769FF] dark:text-[#3B82F6]" />
              <span>Click any mark to edit & auto-save</span>
            </div>
          </div>

          {/* Scrollable Table Viewport */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]">
                  {/* Sticky Roll No */}
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] sticky left-0 z-20 bg-[#F8FAFC] dark:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] w-20 min-w-20">
                    Roll No
                  </th>
                  {/* Sticky Student Name */}
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] sticky left-20 z-20 bg-[#F8FAFC] dark:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] min-w-44 shadow-xs">
                    Student
                  </th>

                  {/* Dynamic Subjects */}
                  {subjects.map((subject) => (
                    <th
                      key={subject.id}
                      className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] min-w-28 text-center"
                    >
                      {subject.name}
                    </th>
                  ))}

                  {/* Totals */}
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-24">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-20">
                    %
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-20">
                    Grade
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#253044]">
                {studentResults.map((student, index) => {
                  const { percentage, grade, hasResults, totalObtained, totalMax } =
                    calculateOverall(student);
                  return (
                    <tr
                      key={student.student_id}
                      className="group hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors duration-150 animate-card-enter"
                      style={{ animationDelay: `${Math.min(index * 30, 450)}ms` }}
                    >
                      {/* Sticky Roll No */}
                      <td className="px-4 py-3 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] sticky left-0 z-10 bg-white dark:bg-[#10151F] group-hover:bg-blue-50/40 dark:group-hover:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] transition-colors">
                        {student.roll_no}
                      </td>

                      {/* Sticky Student Name */}
                      <td className="px-4 py-3 text-xs md:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] sticky left-20 z-10 bg-white dark:bg-[#10151F] group-hover:bg-blue-50/40 dark:group-hover:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] transition-colors shadow-xs">
                        {student.name}
                      </td>

                      {/* Subject Mark Inputs */}
                      {subjects.map((subject) => {
                        const subjectData = student.subjects.find(
                          (s) => s.subject_id === subject.id
                        );
                        const resultId = subjectData ? subjectData.result_id : null;
                        const subjectTotal =
                          (subjectData && subjectData.total_marks) || effectiveTotalMarks;

                        return (
                          <td key={subject.id} className="px-4 py-3 text-center">
                            <EditableMarkInput
                              resultId={resultId}
                              initialValue={subjectData ? subjectData.marks_obtained : null}
                              totalMarks={subjectTotal}
                              onSave={(rid, marks, total) =>
                                handleMarkChange(
                                  student.student_id,
                                  subject.id,
                                  rid,
                                  marks,
                                  total
                                )
                              }
                            />
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="px-4 py-3 text-center text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading">
                        {hasResults ? (
                          <span>
                            {totalObtained}{' '}
                            <span className="text-[#475569] dark:text-[#94A3B8] font-normal">
                              / {totalMax}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#475569] dark:text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Percentage */}
                      <td className="px-4 py-3 text-center text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading">
                        {hasResults ? (
                          `${percentage.toFixed(1)}%`
                        ) : (
                          <span className="text-[#475569] dark:text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Grade Pill */}
                      <td className="px-4 py-3 text-center">
                        {hasResults ? (
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${getGradeBadgeStyle(
                              grade
                            )}`}
                          >
                            {grade}
                          </span>
                        ) : (
                          <span className="text-[#475569] dark:text-[#94A3B8] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;