import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
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

interface ComponentConfig {
  component_code: string;
  display_label: string;
  max_marks: number;
  display_order: number;
}

interface SubjectConfig {
  id: number;
  name: string;
  components: ComponentConfig[];
}

interface StudentSubjectData {
  subject_id: number;
  subject_name: string;
  components: { component_code: string; marks_obtained: number | null }[];
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
  subjects: StudentSubjectData[];
}

/* ─────────────────────────────────────────────────────────────────────────
   COMPONENT INPUT CELL
   Local state keeps keystrokes responsive; only commits on blur or Enter.
   ───────────────────────────────────────────────────────────────────────── */
interface ComponentCellProps {
  value: string;
  maxMarks: number;
  onCommit: (value: string) => void;
}

const ComponentCell: React.FC<ComponentCellProps> = ({
  value,
  maxMarks,
  onCommit,
}) => {
  const [local, setLocal] = useState<string>(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleBlur = () => {
    setFocused(false);
    const trimmed = local.trim();
    if (trimmed === '') {
      if (value !== '') onCommit('');
      return;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0 || num > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}.`);
      setLocal(value);
      return;
    }
    if (trimmed !== value) {
      onCommit(trimmed);
    }
  };

  return (
    <input
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      min={0}
      max={maxMarks}
      aria-label="Enter mark"
      className={`
        w-14 md:w-16 px-1.5 py-1 text-xs font-semibold text-center rounded-lg border
        transition-all duration-150 outline-hidden font-body
        ${
          focused
            ? 'border-[#1769FF] dark:border-[#3B82F6] ring-2 ring-[#1769FF]/20 dark:ring-[#3B82F6]/25 bg-white dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC]'
            : 'border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] hover:border-blue-400/60 dark:hover:border-blue-500/60'
        }
      `}
    />
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   CUSTOM ACCESSIBLE DROPDOWN (unchanged)
   ───────────────────────────────────────────────────────────────────────── */
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

  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, options, value]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (item) item.scrollIntoView({ block: 'nearest' });
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
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
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

/* ─────────────────────────────────────────────────────────────────────────
   DOWNLOAD EXCEL BUTTON (unchanged)
   ───────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────
   GRADE HELPERS — unified scale
   ───────────────────────────────────────────────────────────────────────── */
const calculateGrade = (percentage: number): string => {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  return 'D';
};

const getGradeBadgeStyle = (grade: string): string => {
  switch (grade) {
    case 'A1':
    case 'A2':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
    case 'B1':
    case 'B2':
      return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60';
    case 'C1':
    case 'C2':
      return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
    case 'D':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-900/60';
    default:
      return 'bg-slate-100 text-[#475569] border-slate-200 dark:bg-[#161D29] dark:text-[#94A3B8] dark:border-[#253044]';
  }
};

const computeResultStatus = (
  studentId: number,
  subjects: { id: number; components: { component_code: string; max_marks: number }[] }[],
  marks: Record<string, string>
): 'P' | 'F' => {
  let anyConfigured = false;
  for (const subj of subjects) {
    if (subj.components.length === 0) continue;
    anyConfigured = true;
    let maxTotal = 0;
    let subtotal = 0;
    for (const c of subj.components) {
      maxTotal += c.max_marks;
      const key = `${studentId}_${subj.id}_${c.component_code}`;
      const raw = marks[key];
      if (raw === undefined || raw === '') continue;
      const n = parseFloat(raw);
      if (!isNaN(n)) subtotal += n;
    }
    if (maxTotal > 0 && subtotal < 0.35 * maxTotal) return 'F';
  }
  return anyConfigured ? 'P' : 'F';
};

/* ─────────────────────────────────────────────────────────────────────────
   MAIN RESULTS COMPONENT
   ───────────────────────────────────────────────────────────────────────── */
const Results: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [resultIds, setResultIds] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedExam, setSelectedExam] = useState<number | ''>('');

  // Load classes
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

  // Load exam types
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
      setStudents([]);
      setSubjects([]);
      setMarks({});
      setResultIds({});
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `/admin/results/class/${selectedClass}/exam/${selectedExam}`
        );
        const data = response.data || {};
        const studentList: StudentResult[] = data.students || [];
        const subjectList: SubjectConfig[] = data.subjects || [];

        setStudents(studentList);
        setSubjects(subjectList);

        const newMarks: Record<string, string> = {};
        const newResultIds: Record<string, number | null> = {};

        for (const student of studentList) {
          for (const subj of student.subjects || []) {
            const rKey = `${student.student_id}_${subj.subject_id}`;
            newResultIds[rKey] = subj.result_id ?? null;

            const comps = subj.components || [];
            for (const comp of comps) {
              if (comp.marks_obtained !== null && comp.marks_obtained !== undefined) {
                newMarks[`${student.student_id}_${subj.subject_id}_${comp.component_code}`] = String(
                  comp.marks_obtained
                );
              }
            }
          }
        }

        setMarks(newMarks);
        setResultIds(newResultIds);
      } catch {
        toast.error('Failed to load results');
        setStudents([]);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [selectedClass, selectedExam]);

  const unconfiguredSubjects = useMemo(
    () => subjects.filter((s) => s.components.length === 0),
    [subjects]
  );

  const getSubjectSubtotal = (
    studentId: number,
    subjectId: number,
    configured: ComponentConfig[]
  ): number => {
    let sum = 0;
    for (const c of configured) {
      const key = `${studentId}_${subjectId}_${c.component_code}`;
      const raw = marks[key];
      if (raw === undefined || raw === '') continue;
      const n = parseFloat(raw);
      if (!isNaN(n)) sum += n;
    }
    return sum;
  };

  const getStudentOverall = (studentId: number) => {
    let obt = 0;
    let max = 0;
    for (const subj of subjects) {
      for (const c of subj.components) {
        const key = `${studentId}_${subj.id}_${c.component_code}`;
        const raw = marks[key];
        if (raw === undefined || raw === '') continue;
        const n = parseFloat(raw);
        if (isNaN(n)) continue;
        obt += n;
        max += c.max_marks;
      }
    }
    if (max === 0) {
      return { obt: 0, max: 0, pct: 0, grade: '-' };
    }
    const pct = (obt / max) * 100;
    return { obt, max, pct, grade: calculateGrade(pct) };
  };

  const handleComponentCommit = async (
    studentId: number,
    subject: SubjectConfig,
    changedCode: string,
    newValue: string
  ) => {
    const markKey = `${studentId}_${subject.id}_${changedCode}`;
    const previous = marks[markKey] ?? '';

    // Optimistic update
    setMarks((prev) => ({ ...prev, [markKey]: newValue }));

    // Build full components array for this student+subject, merged with
    // the just-committed value.
    const components: { component_code: string; marks_obtained: number }[] = [];
    for (const c of subject.components) {
      const k = `${studentId}_${subject.id}_${c.component_code}`;
      const raw = c.component_code === changedCode ? newValue : marks[k] ?? '';
      const trimmed = String(raw).trim();
      if (trimmed === '') continue;
      const n = parseFloat(trimmed);
      if (isNaN(n)) continue;
      components.push({ component_code: c.component_code, marks_obtained: n });
    }

    if (components.length === 0) {
      // Nothing to persist; leave the local edit in place.
      return;
    }

    const resultKey = `${studentId}_${subject.id}`;
    const existingId = resultIds[resultKey] ?? null;

    try {
      let savedId: number | null = existingId;

      if (existingId) {
        await api.put(`/admin/results/${existingId}`, { components });
      } else {
        const response = await api.post('/admin/results/', {
          results: [
            {
              student_id: studentId,
              subject_id: subject.id,
              exam_type_id: selectedExam,
              components,
            },
          ],
        });
        const created = response.data?.[0];
        if (created) savedId = created.id;
      }

      if (savedId !== existingId) {
        setResultIds((prev) => ({ ...prev, [resultKey]: savedId }));
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.detail?.message ||
          'Failed to save mark'
      );
      // Revert local state
      setMarks((prev) => ({ ...prev, [markKey]: previous }));
    }
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

  const currentClassObj = classes.find((c) => c.id === selectedClass);
  const currentExamObj = examTypes.find((e) => e.id === selectedExam);

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter">
      {/* PAGE HEADER */}
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

      {/* EXAM CONFIGURATION */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
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
        </div>
      </div>

      {/* EMPTY / LOADING / RESULTS */}
      {!selectedClass || !selectedExam ? (
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
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-10 text-center shadow-sm animate-card-enter">
          <Loader2 className="w-6 h-6 animate-spin text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-2.5" />
          <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Loading examination results...
          </p>
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
            Fetching student score records for this exam
          </p>
        </div>
      ) : students.length === 0 ? (
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
              {currentClassObj
                ? `${currentClassObj.class_name} - ${currentClassObj.division}`
                : 'this class'}
            </span>{' '}
            under{' '}
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {currentExamObj ? currentExamObj.name : 'this exam'}
            </span>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-sm overflow-hidden animate-card-enter">
          {/* Context banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-[#10151F] border border-[#E2E8F0] dark:border-[#253044] text-[#0F172A] dark:text-[#F8FAFC] shadow-2xs">
                {currentClassObj?.class_name} - Div {currentClassObj?.division}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-[#1769FF] dark:text-[#3B82F6]">
                {currentExamObj?.name}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                {students.length} {students.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#475569] dark:text-[#94A3B8]">
              <Edit3 className="w-3.5 h-3.5 text-[#1769FF] dark:text-[#3B82F6]" />
              <span>Click any mark to edit & auto-save</span>
            </div>
          </div>

          {/* Unconfigured subjects banner */}
          {unconfiguredSubjects.length > 0 && (
            <div className="px-5 py-3 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200">
              <span className="font-bold">Not configured: </span>
              {unconfiguredSubjects.map((s) => s.name).join(', ')}
              <span className="ml-1 opacity-80">
                — configure them under Max Marks Config.
              </span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]">
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] sticky left-0 z-20 bg-[#F8FAFC] dark:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] w-20 min-w-20"
                  >
                    Roll No
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] sticky left-20 z-20 bg-[#F8FAFC] dark:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] min-w-44 shadow-xs"
                  >
                    Student
                  </th>

                  {subjects.map((subj) => {
                    const colSpan =
                      subj.components.length > 0 ? subj.components.length + 1 : 1;
                    return (
                      <th
                        key={subj.id}
                        colSpan={colSpan}
                        className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center border-r border-[#E2E8F0] dark:border-[#253044]"
                      >
                        {subj.name}
                      </th>
                    );
                  })}

                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-24 border-r border-[#E2E8F0] dark:border-[#253044]"
                  >
                    Total
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-20 border-r border-[#E2E8F0] dark:border-[#253044]"
                  >
                    %
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-20"
                  >
                    Grade
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-16"
                  >
                    Result
                  </th>
                </tr>
                <tr className="border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]">
                  {subjects.map((subj) => {
                    if (subj.components.length === 0) {
                      return (
                        <th
                          key={`${subj.id}-na`}
                          className="px-2 py-2 text-[10px] font-medium italic text-slate-400 dark:text-slate-500 text-center border-r border-[#E2E8F0] dark:border-[#253044]"
                        >
                          Not configured
                        </th>
                      );
                    }
                    return (
                      <React.Fragment key={subj.id}>
                        {subj.components.map((c) => (
                          <th
                            key={`${subj.id}-${c.component_code}`}
                            className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-center min-w-16 border-r border-[#E2E8F0] dark:border-[#253044]"
                          >
                            <div className="truncate">{c.display_label}</div>
                            <div className="text-[9px] font-mono font-normal text-slate-400 dark:text-slate-500">
                              /{c.max_marks}
                            </div>
                          </th>
                        ))}
                        <th
                          key={`${subj.id}-sub`}
                          className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1769FF] dark:text-[#3B82F6] text-center min-w-16 border-r border-[#E2E8F0] dark:border-[#253044]"
                        >
                          एकूण
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#253044]">
                {students.map((student, index) => {
                  const overall = getStudentOverall(student.student_id);
                  const status = computeResultStatus(student.student_id, subjects, marks);
                  const hasAny = overall.max > 0;
                  return (
                    <tr
                      key={student.student_id}
                      className="group hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors duration-150 animate-card-enter"
                      style={{ animationDelay: `${Math.min(index * 25, 400)}ms` }}
                    >
                      <td className="px-4 py-2 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] sticky left-0 z-10 bg-white dark:bg-[#10151F] group-hover:bg-blue-50/40 dark:group-hover:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] transition-colors">
                        {student.roll_no}
                      </td>
                      <td className="px-4 py-2 text-xs md:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] sticky left-20 z-10 bg-white dark:bg-[#10151F] group-hover:bg-blue-50/40 dark:group-hover:bg-[#161D29] border-r border-[#E2E8F0] dark:border-[#253044] transition-colors shadow-xs">
                        {student.name}
                      </td>

                      {subjects.map((subj) => {
                        if (subj.components.length === 0) {
                          return (
                            <td
                              key={`${subj.id}-na`}
                              className="px-2 py-2 text-center text-slate-300 dark:text-slate-600 border-r border-[#E2E8F0] dark:border-[#253044]"
                            >
                              —
                            </td>
                          );
                        }
                        const subtotal = getSubjectSubtotal(
                          student.student_id,
                          subj.id,
                          subj.components
                        );
                        return (
                          <React.Fragment key={subj.id}>
                            {subj.components.map((c) => {
                              const key = `${student.student_id}_${subj.id}_${c.component_code}`;
                              return (
                                <td
                                  key={`${subj.id}-${c.component_code}`}
                                  className="px-1.5 py-1.5 text-center border-r border-[#E2E8F0] dark:border-[#253044]"
                                >
                                  <ComponentCell
                                    value={marks[key] ?? ''}
                                    maxMarks={c.max_marks}
                                    onCommit={(val) =>
                                      handleComponentCommit(
                                        student.student_id,
                                        subj,
                                        c.component_code,
                                        val
                                      )
                                    }
                                  />
                                </td>
                              );
                            })}
                            <td
                              key={`${subj.id}-sub`}
                              className="px-2 py-2 text-center text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] border-r border-[#E2E8F0] dark:border-[#253044] bg-blue-50/30 dark:bg-blue-950/10"
                            >
                              {subtotal > 0 ? subtotal : '—'}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      <td className="px-3 py-2 text-center text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] border-r border-[#E2E8F0] dark:border-[#253044] font-heading">
                        {hasAny ? (
                          <span>
                            {overall.obt}{' '}
                            <span className="text-[#475569] dark:text-[#94A3B8] font-normal">
                              / {overall.max}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#475569] dark:text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] border-r border-[#E2E8F0] dark:border-[#253044] font-heading">
                        {hasAny ? (
                          `${overall.pct.toFixed(1)}%`
                        ) : (
                          <span className="text-[#475569] dark:text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {hasAny ? (
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold border ${getGradeBadgeStyle(
                              overall.grade
                            )}`}
                          >
                            {overall.grade}
                          </span>
                        ) : (
                          <span className="text-[#475569] dark:text-[#94A3B8] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold border ${
                            status === 'P'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                              : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-900/60'
                          }`}
                        >
                          {status}
                        </span>
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
