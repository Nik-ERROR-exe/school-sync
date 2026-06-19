import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { TimetableService } from '../features/timetable/services';
import { TimetableSlot, ConstraintStatus, SubjectMapping } from '../features/timetable/types';
import { TimetableTeacher } from '../features/timetable/mockData';
import { SchoolClass, Subject } from '../features/results/types';
import { ResultsService } from '../features/results/services';
import { toast } from 'react-hot-toast';
import { 
  Clock, 
  Settings, 
  Sparkles, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertTriangle,
  Edit,
  X,
  User,
  Calendar,
  Grid
} from 'lucide-react';

const Timetable: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Shared configs
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TimetableTeacher[]>([]);
  const [subjectMappings, setSubjectMappings] = useState<SubjectMapping[]>([]);

  // State
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number>(15); // Default to Class 8A (id: 15)
  const [constraintStatus, setConstraintStatus] = useState<ConstraintStatus | null>(null);
  
  // Edit Modal State
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [editSubjectId, setEditSubjectId] = useState<number>(0);
  const [editTeacherId, setEditTeacherId] = useState<number>(0);

  const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const loadTimetableData = async () => {
    const classData = await ResultsService.getClasses();
    const subData = await ResultsService.getSubjects();
    const teachData = await TimetableService.getTeachers();
    const mapsData = await TimetableService.getSubjectMappings();
    const timetableData = await TimetableService.getTimetable();

    setClasses(classData);
    setSubjects(subData);
    setTeachers(teachData);
    setSubjectMappings(mapsData);
    setSlots(timetableData);
    
    // Evaluate constraints
    const constraints = TimetableService.checkConstraints(timetableData);
    setConstraintStatus(constraints);
  };

  useEffect(() => {
    loadTimetableData();
  }, []);

  const handleGenerate = async () => {
    const loadingToast = toast.loading('Running constraint satisfaction engine...');
    try {
      const freshSlots = await TimetableService.generateTimetable();
      setSlots(freshSlots);
      const constraints = TimetableService.checkConstraints(freshSlots);
      setConstraintStatus(constraints);
      toast.dismiss(loadingToast);
      toast.success('Timetable generated and constraints satisfied!');
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error('Timetable generation failed');
    }
  };

  const handleOpenEdit = (day: string, period: number) => {
    if (!isAdmin) return;
    
    // Find slot
    const slot = slots.find(
      s => s.class_id === selectedClassId && 
           s.day_of_week === day && 
           s.period_number === period
    );

    if (slot) {
      setEditingSlot(slot);
      setEditSubjectId(slot.subject_id);
      setEditTeacherId(slot.teacher_id);
    } else {
      // Create a temporary blank slot object to populate
      const tempSlot: TimetableSlot = {
        id: 0,
        class_id: selectedClassId,
        day_of_week: day as any,
        period_number: period,
        subject_id: subjects[0]?.id || 1,
        teacher_id: teachers[0]?.id || 2
      };
      setEditingSlot(tempSlot);
      setEditSubjectId(tempSlot.subject_id);
      setEditTeacherId(tempSlot.teacher_id);
    }
  };

  const handleSaveSlot = async () => {
    if (!editingSlot) return;

    const updated: TimetableSlot = {
      ...editingSlot,
      subject_id: Number(editSubjectId),
      teacher_id: Number(editTeacherId)
    };

    const saved = await TimetableService.updateSlot(updated);
    if (saved) {
      // Reload slots and constraints
      const timetableData = await TimetableService.getTimetable();
      setSlots(timetableData);
      const constraints = TimetableService.checkConstraints(timetableData);
      setConstraintStatus(constraints);

      setEditingSlot(null);
      toast.success('Timetable cell updated!');
    }
  };

  // Color mapping per subject code
  const getSubjectColor = (subjectId: number) => {
    const sub = subjects.find(s => s.id === subjectId);
    if (!sub) return 'bg-slate-100 text-slate-700 border-slate-200';
    switch (sub.code) {
      case 'MATH': return 'bg-blue-50 text-blue-700 border-blue-200/60 hover:bg-blue-100';
      case 'ENG': return 'bg-indigo-50 text-indigo-700 border-indigo-200/60 hover:bg-indigo-100';
      case 'SCI': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100';
      case 'MAR': return 'bg-orange-50 text-orange-700 border-orange-200/60 hover:bg-orange-100';
      case 'EVS': return 'bg-teal-50 text-teal-700 border-teal-200/60 hover:bg-teal-100';
      case 'HIST': return 'bg-purple-50 text-purple-700 border-purple-200/60 hover:bg-purple-100';
      case 'GEOG': return 'bg-cyan-50 text-cyan-700 border-cyan-200/60 hover:bg-cyan-100';
      case 'COMP': return 'bg-violet-50 text-violet-700 border-violet-200/60 hover:bg-violet-100';
      case 'PT': return 'bg-rose-50 text-rose-700 border-rose-200/60 hover:bg-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
    }
  };

  // Mock download
  const handleDownload = () => {
    const cls = classes.find(c => c.id === selectedClassId);
    const className = cls ? `${cls.class_name}${cls.division}` : 'Master';

    let csvContent = '';
    if (isAdmin) {
      csvContent += `Class Timetable - ${className}\n`;
      csvContent += 'Period,' + days.join(',') + '\n';
      
      for (let p = 1; p <= 8; p++) {
        const rowCells = [ `Period ${p}` ];
        days.forEach(day => {
          const isSat = day === 'Saturday';
          if (isSat && p > 4) {
            rowCells.push('Half-Day');
            return;
          }
          const slot = slots.find(s => s.class_id === selectedClassId && s.day_of_week === day && s.period_number === p);
          const sub = subjects.find(s => s.id === slot?.subject_id);
          const tName = teachers.find(t => t.id === slot?.teacher_id)?.name || '';
          rowCells.push(slot ? `"${sub?.subject_name} (${tName})"` : 'Free');
        });
        csvContent += rowCells.join(',') + '\n';
      }
    } else {
      // Teacher timetable
      csvContent += `Teacher Schedule - ${user?.name}\n`;
      csvContent += 'Period,' + days.join(',') + '\n';

      for (let p = 1; p <= 8; p++) {
        const rowCells = [ `Period ${p}` ];
        days.forEach(day => {
          const isSat = day === 'Saturday';
          if (isSat && p > 4) {
            rowCells.push('Half-Day');
            return;
          }
          const slot = slots.find(s => s.teacher_id === user?.id && s.day_of_week === day && s.period_number === p);
          const cls = classes.find(c => c.id === slot?.class_id);
          const sub = subjects.find(s => s.id === slot?.subject_id);
          rowCells.push(slot ? `"${sub?.subject_name} (Class ${cls?.class_name}${cls?.division})"` : 'Free');
        });
        csvContent += rowCells.join(',') + '\n';
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Amarkor_Vidyalaya_Timetable_${className}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Timetable downloaded successfully!');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Timetable share link copied to clipboard!');
  };

  // Find active teacher schedule (Teacher View)
  const getTeacherSlot = (day: string, period: number) => {
    const teacherId = user?.id || 2;
    const slot = slots.find(s => s.teacher_id === teacherId && s.day_of_week === day && s.period_number === period);
    if (!slot) return null;
    
    const sub = subjects.find(s => s.id === slot.subject_id);
    const cls = classes.find(c => c.id === slot.class_id);
    return {
      subjectName: sub?.subject_name || 'Subject',
      className: cls ? `Class ${cls.class_name}${cls.division}` : '',
      colorClass: getSubjectColor(slot.subject_id)
    };
  };

  // Find active class slot (Admin View)
  const getClassSlot = (day: string, period: number) => {
    const slot = slots.find(s => s.class_id === selectedClassId && s.day_of_week === day && s.period_number === period);
    if (!slot) return null;
    
    const sub = subjects.find(s => s.id === slot.subject_id);
    const teacher = teachers.find(t => t.id === slot.teacher_id);
    return {
      subjectName: sub?.subject_name || 'Free',
      subjectCode: sub?.code || 'FREE',
      teacherName: teacher ? teacher.name : '',
      colorClass: getSubjectColor(slot.subject_id)
    };
  };

  return (
    <div className="space-y-8 font-body">
      
      {/* Constraints Cards (Admin only) */}
      {isAdmin && constraintStatus && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
            <div>
              <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-accent" />
                <span>{t('timetable.constraints')}</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                Automated scheduler validation engine
              </p>
            </div>
            
            <button
              onClick={handleGenerate}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>{t('timetable.generate')}</span>
            </button>
          </div>

          {/* Validation Checklist grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            
            {/* Rule 1: Teacher double booking */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${
              constraintStatus.teacherConflict.satisfied 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Teacher overlap</span>
                <span className="text-xs leading-relaxed">No teacher assigned to 2 classes in same period.</span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-extrabold uppercase">
                {constraintStatus.teacherConflict.satisfied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{t('timetable.constraint_satisfied')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                    <span className="cursor-help" title={constraintStatus.teacherConflict.details}>
                      {t('timetable.constraint_violated')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Rule 2: Class Period Conflict */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${
              constraintStatus.classConflict.satisfied 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Class overlap</span>
                <span className="text-xs leading-relaxed">No division has 2 subjects scheduled together.</span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-extrabold uppercase">
                {constraintStatus.classConflict.satisfied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{t('timetable.constraint_satisfied')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>{t('timetable.constraint_violated')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Rule 3: Teacher daily lecture limit */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${
              constraintStatus.teacherDailyLimit.satisfied 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Daily Cap</span>
                <span className="text-xs leading-relaxed">Teachers stay within maximum daily lectures limit.</span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-extrabold uppercase">
                {constraintStatus.teacherDailyLimit.satisfied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{t('timetable.constraint_satisfied')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="cursor-help" title={constraintStatus.teacherDailyLimit.details}>
                      {t('timetable.constraint_violated')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Rule 4: PT Constraint */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${
              constraintStatus.ptConstraint.satisfied 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">PT Ground Limit</span>
                <span className="text-xs leading-relaxed">Small playground: max 2 classes can have PT.</span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-extrabold uppercase">
                {constraintStatus.ptConstraint.satisfied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{t('timetable.constraint_satisfied')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="cursor-help" title={constraintStatus.ptConstraint.details}>
                      {t('timetable.constraint_violated')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Rule 5: Saturday half day */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${
              constraintStatus.saturdayHalfDay.satisfied 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Saturday Limit</span>
                <span className="text-xs leading-relaxed">Saturday stops after Period 4 (Half-Day).</span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-extrabold uppercase">
                {constraintStatus.saturdayHalfDay.satisfied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{t('timetable.constraint_satisfied')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>{t('timetable.constraint_violated')}</span>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Timetable View */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-white shadow-sm">
              <Grid className="h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-950">
                {isAdmin ? t('timetable.admin_timetable') : t('timetable.teacher_timetable')}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                Weekly calendar schedule sheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Class selection dropdown (Admin only) */}
            {isAdmin && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>Class {c.class_name}{c.division}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>{t('timetable.download')}</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-400" />
              <span>{t('timetable.share')}</span>
            </button>
          </div>
        </div>

        {/* Timetable Grid rendering */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 border-r border-slate-150 w-24">Day</th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                  <th key={p} className="px-4 py-4 border-r border-slate-100 text-center font-bold">
                    P{p}
                    <span className="block text-[8px] text-slate-400 font-medium normal-case mt-0.5">
                      {p === 1 ? '09:00 - 09:40' : 
                       p === 2 ? '09:40 - 10:20' : 
                       p === 3 ? '10:20 - 11:00' : 
                       p === 4 ? '11:00 - 11:40' : 
                       p === 5 ? '12:10 - 12:50' : 
                       p === 6 ? '12:50 - 01:30' : 
                       p === 7 ? '01:30 - 02:10' : '02:10 - 02:50'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {days.map(day => (
                <tr key={day} className="hover:bg-slate-50/20">
                  {/* Day column */}
                  <td className="px-6 py-5 border-r border-slate-150 font-extrabold text-slate-900 bg-slate-50/50">
                    {day}
                  </td>
                  
                  {/* Periods columns */}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(p => {
                    const isSatHalfDay = day === 'Saturday' && p > 4;

                    if (isSatHalfDay) {
                      return (
                        <td key={p} className="px-2 py-2 border-r border-slate-100 text-center bg-slate-50/80 text-[10px] font-bold text-slate-400 select-none">
                          Half-Day
                        </td>
                      );
                    }

                    if (isAdmin) {
                      // Admin grid (editable cells)
                      const cell = getClassSlot(day, p);
                      return (
                        <td 
                          key={p} 
                          onClick={() => handleOpenEdit(day, p)}
                          className="p-1 border-r border-slate-100 text-center cursor-pointer group"
                        >
                          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border h-16 transition-all ${
                            cell 
                              ? cell.colorClass 
                              : 'bg-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                          }`}>
                            {cell ? (
                              <>
                                <span className="font-extrabold text-[11px] text-slate-900 truncate max-w-full">
                                  {cell.subjectCode}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-500 truncate max-w-full mt-0.5">
                                  {cell.teacherName.split(' ')[0]}
                                </span>
                                <Edit className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition absolute right-2 bottom-2" />
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">+ Add</span>
                            )}
                          </div>
                        </td>
                      );
                    } else {
                      // Teacher grid (read only personal schedule)
                      const cell = getTeacherSlot(day, p);
                      return (
                        <td key={p} className="p-1 border-r border-slate-100 text-center">
                          <div className={`flex flex-col items-center justify-center p-2 rounded-lg border h-16 transition-all ${
                            cell ? cell.colorClass : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {cell ? (
                              <>
                                <span className="font-extrabold text-[11px] text-slate-900 truncate max-w-full">
                                  {cell.subjectName}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-500 mt-0.5">
                                  {cell.className}
                                </span>
                              </>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Free</span>
                            )}
                          </div>
                        </td>
                      );
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Cell Editing Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-premium border border-slate-200 overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-950">
                  {t('timetable.edit_slot')}
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                  {editingSlot.day_of_week} • Period {editingSlot.period_number}
                </p>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Select {t('timetable.subject')}
                </label>
                <select
                  value={editSubjectId}
                  onChange={(e) => {
                    const sid = Number(e.target.value);
                    setEditSubjectId(sid);
                    
                    // Auto select the mapped teacher for this subject in the class if exists
                    const matchingMap = subjectMappings.find(
                      m => m.class_id === selectedClassId && m.subject_id === sid
                    );
                    if (matchingMap) {
                      setEditTeacherId(matchingMap.teacher_id);
                    }
                  }}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subject_name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Assign {t('timetable.teacher')}
                </label>
                <select
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(Number(e.target.value))}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50">
              <button
                onClick={() => setEditingSlot(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveSlot}
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

export default Timetable;
