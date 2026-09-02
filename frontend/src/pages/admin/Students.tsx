import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Upload,
  Download,
  Loader2,
  Check,
  Users,
  ChevronDown,
  School,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { studentApi, Student, StudentCreate, StudentBulkUploadResponse } from '../../api/students';
import api from '../../api';

interface Class {
  id: number;
  class_name: string;
  division: string;
}

// FastAPI errors: HTTPException detail is a string, 422 validation detail is
// an array of {type, loc, msg, input} objects. Normalize to a readable string.
function getApiErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => d?.msg ?? 'Invalid field').join('; ');
  }
  return fallback;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM ACCESSIBLE CLASS DROPDOWN
   - Matches height, radius, and typography of the search bar
   - Full keyboard navigation (Arrow keys, Enter, Escape, Space)
   - Works cleanly in both light and dark themes
   ───────────────────────────────────────────────────────────────────────────── */
interface ClassDropdownOption {
  value: number | '';
  label: string;
}

interface ClassDropdownProps {
  id: string;
  options: ClassDropdownOption[];
  value: number | '';
  onChange: (val: number | '') => void;
  placeholder: string;
}

const ClassDropdown: React.FC<ClassDropdownProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder,
}) => {
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
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (val: number | '') => {
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
    <div className="relative font-body w-full sm:w-64 shrink-0" ref={containerRef}>
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
          transition-all duration-200 outline-hidden select-none cursor-pointer text-xs md:text-sm
          ${isOpen
            ? 'border-[#1769FF] dark:border-[#3B82F6] ring-2 ring-[#1769FF]/20 dark:ring-[#3B82F6]/25 bg-white dark:bg-[#161D29] shadow-xs'
            : 'border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-xs'
          }
          focus-visible:ring-2 focus-visible:ring-[#1769FF] dark:focus-visible:ring-[#3B82F6] focus-visible:border-transparent
        `}
      >
        <span className="truncate pr-2">
          {selectedOption && selectedOption.value !== '' ? (
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-[#475569] dark:text-[#94A3B8] font-normal">
              {placeholder}
            </span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[#475569] dark:text-[#94A3B8] transition-transform duration-200 ease-out ${isOpen ? 'rotate-180 text-[#1769FF] dark:text-[#3B82F6]' : ''
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
          className="absolute right-0 left-0 sm:left-auto sm:w-72 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-1.5 shadow-xl ring-1 ring-black/5 animate-dropdown-reveal"
        >
          {options.map((opt, idx) => {
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
                  ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1769FF] dark:text-[#3B82F6] font-semibold'
                    : isHighlighted
                      ? 'bg-[#F1F5F9] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC]'
                      : 'text-[#0F172A] dark:text-[#F8FAFC]'
                  }
                `}
              >
                <span className="truncate pr-3">{opt.label}</span>
                {isSelected && (
                  <Check
                    className="w-4 h-4 shrink-0 text-[#1769FF] dark:text-[#3B82F6]"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN STUDENTS COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student>>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClassId, setUploadClassId] = useState<number | ''>('');
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<StudentBulkUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.append('class_id', selectedClass.toString());
      if (search) params.append('search', search);

      const studentsRes = await api.get(`/admin/students/?${params.toString()}`);
      setStudents(studentsRes.data);

      const classesRes = await api.get('/admin/classes/');
      setClasses(classesRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass, search]);

  const handleAdd = () => {
    setEditingStudent({ name: '', roll_no: '', class_id: classes[0]?.id || 0 });
    setIsModalOpen(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentApi.deleteStudent(id);
      toast.success('Student deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const handleSave = async () => {
    if (!editingStudent.name || !editingStudent.roll_no || !editingStudent.class_id) {
      toast.error('All fields are required');
      return;
    }

    try {
      if (editingStudent.id) {
        await studentApi.updateStudent(editingStudent.id, editingStudent);
        toast.success('Student updated successfully');
      } else {
        await studentApi.createStudent(editingStudent as StudentCreate);
        toast.success('Student added successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to save student'));
    }
  };

  const getClassDisplay = (class_id: number) => {
    const cls = classes.find((c) => c.id === class_id);
    return cls ? `Standard ${cls.class_name} - Div ${cls.division}` : 'Unknown';
  };

  const openUpload = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploadClassId(classes[0]?.id || '');
    setIsUploadOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const blob = await studentApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2400);
      toast.success('Template downloaded');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to download template'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Please choose a file');
      return;
    }
    if (!uploadClassId) {
      toast.error('Please select a default class');
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await studentApi.uploadStudents(uploadFile, uploadClassId);
      setUploadResult(result);
      toast.success(`Upload complete: ${result.inserted} added, ${result.skipped} skipped`);
      fetchData();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-7 animate-hero-enter">
      {/* ───────────────────────────────────────────────────────────────────────
          PAGE HEADER: Title & Coherent Top Action Group
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#253044] pb-5">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Student Management
          </h1>
          <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] font-medium mt-1">
            Manage student enrollments, records, and batch imports
          </p>
        </div>

        {/* Coherent Action Group */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start sm:self-auto">
          {/* Download Template Button (satyamchaudharydev-inspired interaction, theme-aware blue) */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            aria-label="Download Excel template"
            className={`
              group relative inline-flex items-center justify-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl
              font-heading text-xs font-semibold select-none cursor-pointer
              transition-all duration-200 ease-out active:scale-[.98]
              border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]
              text-[#0F172A] dark:text-[#F8FAFC]
              hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:text-[#1769FF] dark:hover:text-[#3B82F6]
              focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769FF] dark:focus-visible:ring-[#3B82F6]
              shadow-2xs hover:shadow-xs
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {downloadingTemplate ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1769FF] dark:text-[#3B82F6] shrink-0" />
                <span>Downloading...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 animate-fade-in" />
                <span className="text-emerald-700 dark:text-emerald-400 animate-fade-in">Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#475569] dark:text-[#94A3B8] group-hover:text-[#1769FF] dark:group-hover:text-[#3B82F6] shrink-0 transition-transform duration-200 ease-out group-hover:translate-y-0.5" />
                <span>Download Template</span>
              </>
            )}
          </button>

          {/* Upload Excel Button (omar49511 reference: expanding subtle hover background, blue palette, NO green) */}
          <button
            type="button"
            onClick={openUpload}
            aria-label="Upload Excel sheet"
            className={`
              group relative overflow-hidden inline-flex items-center justify-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl
              font-heading text-xs font-semibold select-none cursor-pointer
              transition-all duration-250 ease-out active:scale-[.98]
              border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30
              text-[#1769FF] dark:text-[#3B82F6]
              hover:border-[#1769FF] dark:hover:border-[#3B82F6]
              focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769FF] dark:focus-visible:ring-[#3B82F6]
              shadow-2xs
            `}
          >
            {/* Background sweep expansion */}
            <span className="absolute inset-0 bg-blue-100/80 dark:bg-blue-900/40 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-2">
              <Upload className="w-4 h-4 shrink-0 transition-transform duration-200 ease-out group-hover:-translate-y-0.5" />
              <span>Upload Excel</span>
            </span>
          </button>

          {/* Add Student Button (Primary Blue, subtle hover lift, rotating plus, scale on press) */}
          <button
            type="button"
            onClick={handleAdd}
            aria-label="Add new student"
            className={`
              group relative inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl
              font-heading text-xs font-semibold text-white select-none cursor-pointer
              bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] active:bg-[#0C4EC7]
              transition-all duration-200 ease-out active:scale-[.98] hover:-translate-y-0.5
              shadow-xs hover:shadow-md hover:shadow-blue-500/25
              focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769FF] dark:focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10151F]
            `}
          >
            <Plus className="w-4 h-4 shrink-0 transition-transform duration-200 ease-out group-hover:rotate-90" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          UNIFIED FILTERING TOOLBAR
          Search & Class Selector
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input with proper alignment and contrast */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569] dark:text-[#94A3B8] pointer-events-none" />
          <input
            type="text"
            placeholder="Search students by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`
              w-full h-10 pl-10 pr-9 rounded-xl border text-xs md:text-sm font-medium
              transition-all duration-200 outline-hidden font-body
              border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27]
              text-[#0F172A] dark:text-[#F8FAFC]
              placeholder-[#475569] dark:placeholder-[#94A3B8]
              hover:border-blue-400/60 dark:hover:border-blue-500/60
              focus:border-[#1769FF] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25
            `}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Class Selector Dropdown */}
        <ClassDropdown
          id="student-class-filter"
          placeholder="All Classes"
          options={[
            { value: '', label: 'All Classes' },
            ...classes.map((c) => ({
              value: c.id,
              label: `Standard ${c.class_name} - Div ${c.division}`,
            })),
          ]}
          value={selectedClass}
          onChange={(val) => setSelectedClass(val)}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          DATA GRID / STUDENT TABLE
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-sm overflow-hidden animate-card-enter">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]">
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] w-32">
                  Roll No
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                  Name
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                  Class
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] text-right w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#253044]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-2.5" />
                    <p className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      Loading student records...
                    </p>
                    <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                      Retrieving registered enrollments from database
                    </p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-[#1769FF] dark:text-[#3B82F6] mx-auto mb-3 shadow-2xs">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading text-sm md:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      No students found
                    </h3>
                    <p className="mt-1 text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] max-w-sm mx-auto">
                      Try changing the class filter or adjusting your search query.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((s, index) => (
                  <tr
                    key={s.id}
                    className="group hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors duration-150 animate-card-enter"
                    style={{ animationDelay: `${Math.min(index * 25, 350)}ms` }}
                  >
                    <td className="px-6 py-4 font-semibold text-xs font-heading text-[#0F172A] dark:text-[#F8FAFC]">
                      {s.roll_no}
                    </td>
                    <td className="px-6 py-4 font-medium text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                      {s.name}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[#475569] dark:text-[#94A3B8]">
                      {getClassDisplay(s.class_id)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          title="Edit student"
                          aria-label={`Edit ${s.name}`}
                          className="p-1.5 rounded-lg text-[#1769FF] dark:text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-transparent hover:border-blue-200/80 dark:hover:border-blue-800/60 transition-all duration-150 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1769FF]"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          title="Delete student"
                          aria-label={`Delete ${s.name}`}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-transparent hover:border-rose-200/80 dark:hover:border-rose-800/60 transition-all duration-150 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer count */}
        {!loading && students.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/60 text-xs font-medium text-[#475569] dark:text-[#94A3B8]">
            <span>Showing total of {students.length} {students.length === 1 ? 'student' : 'students'}</span>
            <span className="hidden sm:inline-block">Click action icons to edit or remove records</span>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          ADD / EDIT STUDENT MODAL (THEME-AWARE)
          ─────────────────────────────────────────────────────────────────────── */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#10151F] border border-[#E2E8F0] dark:border-[#253044] rounded-2xl p-6 w-full max-w-md shadow-xl animate-dropdown-reveal">
              <div className="flex justify-between items-center mb-5 border-b border-[#E2E8F0] dark:border-[#253044] pb-4">
                <h2 className="font-heading text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {editingStudent.id ? 'Edit Student' : 'Add Student'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#161D29] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={editingStudent.roll_no || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, roll_no: e.target.value })
                    }
                    placeholder="e.g. 101"
                    className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 focus:border-[#1769FF] dark:focus:border-[#3B82F6] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={editingStudent.name || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, name: e.target.value })
                    }
                    placeholder="Full name of student"
                    className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 focus:border-[#1769FF] dark:focus:border-[#3B82F6] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                    Class & Division
                  </label>
                  <select
                    value={editingStudent.class_id || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, class_id: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 focus:border-[#1769FF] dark:focus:border-[#3B82F6] transition-all cursor-pointer"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Standard {c.class_name} - Division {c.division}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-6 border-t border-[#E2E8F0] dark:border-[#253044] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1f2937] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] text-xs font-semibold transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-10 px-5 rounded-xl bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white text-xs font-semibold shadow-sm transition-all duration-150 active:scale-[.98]"
                >
                  Save Student
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ───────────────────────────────────────────────────────────────────────
          BULK UPLOAD MODAL (THEME-AWARE, BLUE PRIMARY, NO GREEN)
          ─────────────────────────────────────────────────────────────────────── */}
      {isUploadOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#10151F] border border-[#E2E8F0] dark:border-[#253044] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl animate-dropdown-reveal">
              <div className="flex justify-between items-center mb-5 border-b border-[#E2E8F0] dark:border-[#253044] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1769FF] dark:text-[#3B82F6] border border-blue-100 dark:border-blue-900/40">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h2 className="font-heading text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Bulk Upload Students
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="p-1 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#161D29] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                    Spreadsheet File (.xlsx or .csv)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs md:text-sm text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] rounded-xl p-2.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1769FF] dark:file:bg-blue-950/60 dark:file:text-[#3B82F6] file:cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                    Default Class (for rows without class info)
                  </label>
                  <select
                    value={uploadClassId}
                    onChange={(e) =>
                      setUploadClassId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1769FF]/20 dark:focus:ring-[#3B82F6]/25 focus:border-[#1769FF] dark:focus:border-[#3B82F6] transition-all cursor-pointer"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Standard {c.class_name} - Division {c.division}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-[#1769FF] dark:text-[#3B82F6] shrink-0" />
                    <span>Tip: For rows with class, use exact name & division (e.g. "10" / "A").</span>
                  </p>
                </div>
              </div>

              {/* Upload summary badges */}
              {uploadResult && (
                <div className="mt-5 space-y-3 p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]/50">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/50">
                      {uploadResult.inserted} inserted
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/50">
                      {uploadResult.skipped} skipped
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#161D29] text-[#475569] dark:text-[#94A3B8] border border-slate-200 dark:border-[#253044]">
                      {uploadResult.total_rows} total rows
                    </span>
                  </div>

                  {uploadResult.skipped > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-[#E2E8F0] dark:border-[#253044] rounded-lg divide-y divide-[#E2E8F0] dark:divide-[#253044] text-xs">
                      {uploadResult.results
                        .filter((r) => r.status === 'skipped')
                        .map((r, idx) => (
                          <div key={idx} className="px-3 py-1.5 bg-white dark:bg-[#10151F]">
                            <span className="text-[#475569] dark:text-[#94A3B8]">Row {r.row_number}:</span>{' '}
                            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                              {r.roll_no || '?'}
                            </span>{' '}
                            — <span className="text-rose-600 dark:text-rose-400">{r.reason}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modal footer actions */}
              <div className="flex justify-end gap-2.5 mt-6 border-t border-[#E2E8F0] dark:border-[#253044] pt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#475569] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1f2937] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] text-xs font-semibold transition-all duration-150"
                >
                  Close
                </button>
                {/* BLUE Upload button - NOT green! */}
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="h-10 px-5 rounded-xl bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white text-xs font-semibold shadow-sm transition-all duration-150 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-white" />
                      <span>Upload Sheet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Students;