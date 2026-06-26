import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { SubstituteService } from '../features/substitute/services';
import { TimetableService } from '../features/timetable/services';
import { ResultsService } from '../features/results/services';
import { SubstituteAssignment } from '../features/substitute/types';
import { TimetableTeacher } from '../features/timetable/mockData';
import { SchoolClass, Subject } from '../features/results/types';
import { toast } from 'react-hot-toast';
import { 
  UserCheck, 
  AlertCircle, 
  Calendar, 
  Clock, 
  UserMinus, 
  Search, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const Substitute: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Shared state
  const [teachers, setTeachers] = useState<TimetableTeacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Admin search inputs
  const [absentTeacherId, setAbsentTeacherId] = useState<number | ''>('');
  const [targetClassId, setTargetClassId] = useState<number | ''>('');
  const [targetSubjectId, setTargetSubjectId] = useState<number | ''>('');
  const [targetDay, setTargetDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | ''>('');
  const [targetPeriod, setTargetPeriod] = useState<number | ''>('');

  // Results list
  const [availableSubs, setAvailableSubs] = useState<{ teacher: TimetableTeacher; isExpert: boolean; availabilityText: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [subAssignments, setSubAssignments] = useState<SubstituteAssignment[]>([]);

  const loadSubstituteConfig = async () => {
    const teachData = await TimetableService.getTeachers();
    const classData = await ResultsService.getClasses();
    const subData = await ResultsService.getSubjects();
    const assignments = await SubstituteService.getAssignments();

    setTeachers(teachData);
    setClasses(classData);
    setSubjects(subData);
    setSubAssignments(assignments);
  };

  useEffect(() => {
    loadSubstituteConfig();
  }, []);

  // Search available substitute teachers based on criteria
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId || !targetDay || !targetPeriod || !targetSubjectId) {
      toast.error('Please specify Class, Subject, Day, and Period to check availability');
      return;
    }

    setIsSearching(true);
    try {
      const results = await SubstituteService.getAvailableTeachers(
        Number(targetClassId),
        targetDay,
        Number(targetPeriod),
        Number(targetSubjectId)
      );
      setAvailableSubs(results);
      if (results.length === 0) {
        toast.error('No free teachers found for this slot!');
      } else {
        toast.success(`Found ${results.length} available teachers!`);
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssign = async (substituteTeacherId: number) => {
    if (!targetClassId || !targetDay || !targetPeriod || !absentTeacherId || !targetSubjectId) return;

    const loadingToast = toast.loading('Assigning substitute teacher...');
    try {
      const assignment = await SubstituteService.assignSubstitute(
        Number(targetClassId),
        targetDay,
        Number(targetPeriod),
        Number(absentTeacherId),
        substituteTeacherId,
        Number(targetSubjectId)
      );

      if (assignment) {
        toast.dismiss(loadingToast);
        toast.success(t('substitute.notification_toast'));
        
        // Reload assignments list
        const assignments = await SubstituteService.getAssignments();
        setSubAssignments(assignments);

        // Reset inputs
        setAbsentTeacherId('');
        setTargetClassId('');
        setTargetSubjectId('');
        setTargetDay('');
        setTargetPeriod('');
        setAvailableSubs([]);

        // Dispath custom events to refresh navbar notifications center live
        window.dispatchEvent(new CustomEvent('reload-notifications'));
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error('Assignment failed');
    }
  };

  // Helpers for displaying names
  const getTeacherName = (id: number) => teachers.find(t => t.id === id)?.name || `Teacher #${id}`;
  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subject_name || `Subject #${id}`;
  const getClassName = (id: number) => {
    const c = classes.find(cl => cl.id === id);
    return c ? `${c.class_name}${c.division}` : `Class #${id}`;
  };

  // Filter assignments for teachers
  const myDuties = subAssignments.filter(a => a.substitute_teacher_id === user?.id);

  return (
    <div className="space-y-8 font-body">
      
      {/* Teacher View: Personal substitution assignments list */}
      {!isAdmin && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm animate-fade-in">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-accent animate-pulse" />
              <span>My Substitution Duties</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
              Assigned substitution lectures for this week
            </p>
          </div>

          {myDuties.length === 0 ? (
            <div className="rounded-lg bg-slate-50 border border-slate-250 p-8 text-center text-xs text-slate-500">
              No substitution assignments. Enjoy your free periods!
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myDuties.map(duty => (
                <div key={duty.id} className="relative overflow-hidden rounded-xl border border-blue-150 bg-gradient-to-br from-white to-blue-50/20 p-5 shadow-sm">
                  <div className="absolute right-3 top-3 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                    Active Duty
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">
                    {duty.date}
                  </span>
                  <h4 className="font-heading text-sm font-extrabold text-slate-900">
                    Class {getClassName(duty.class_id)}
                  </h4>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Period <strong className="text-slate-900 font-bold">{duty.period_number}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Subject: <strong className="text-slate-900 font-bold">{getSubjectName(duty.subject_id)}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <UserMinus className="h-3.5 w-3.5 text-slate-400" />
                      <span>Substitute for: <span className="text-slate-500 font-semibold">{getTeacherName(duty.original_teacher_id)}</span></span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin View: Scheduler and Matcher Form */}
      {isAdmin && (
        <div className="grid gap-8 lg:grid-cols-3 animate-fade-in">
          
          {/* Left panel: Substitution request details form */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm h-fit">
            <h3 className="font-heading text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-accent" />
              <span>Absent Teacher Log</span>
            </h3>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Absent Teacher</label>
                <select
                  value={absentTeacherId}
                  onChange={(e) => setAbsentTeacherId(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                  required
                >
                  <option value="">-- Select Absent Staff --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Affected Class</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                  required
                >
                  <option value="">-- Select Affected Division --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Class {c.class_name}{c.division}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Lecture Subject</label>
                <select
                  value={targetSubjectId}
                  onChange={(e) => setTargetSubjectId(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                  required
                >
                  <option value="">-- Select Target Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subject_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Target Day</label>
                  <select
                    value={targetDay}
                    onChange={(e) => setTargetDay(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                    required
                  >
                    <option value="">Day</option>
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Target Period</label>
                  <select
                    value={targetPeriod}
                    onChange={(e) => setTargetPeriod(e.target.value ? Number(e.target.value) : '')}
                    className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
                    required
                  >
                    <option value="">Period</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full flex justify-center items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 py-3 px-4 text-xs font-bold text-white shadow-sm transition"
              >
                <Search className="h-4 w-4" />
                <span>Search Free Teachers</span>
              </button>
            </form>
          </div>

          {/* Right panel: Search results & matching list */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="font-heading text-base font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
              {t('substitute.available_substitutes')}
            </h3>

            {availableSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-xs font-semibold">Select criteria in the left panel and click Search.</p>
                <p className="text-[10px] text-slate-400 mt-1">The system will dynamically cross-reference timetables to find free slots.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableSubs.map(({ teacher, isExpert, availabilityText }) => (
                  <div 
                    key={teacher.id} 
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border p-4 shadow-sm hover:shadow-md transition gap-4 ${
                      isExpert ? 'border-blue-150 bg-blue-50/10' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-extrabold text-slate-900">{teacher.name}</span>
                        {isExpert && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold uppercase border border-blue-200">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Subject Expert</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-1">{availabilityText}</p>
                    </div>
                    
                    <button
                      onClick={() => handleAssign(teacher.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>{t('substitute.assign')}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin View: Active Assignments History */}
      {isAdmin && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm animate-fade-in">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="font-heading text-sm font-bold text-slate-950 flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              <span>Substitution Log History</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Absent Teacher</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">Substitute Teacher</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                {subAssignments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-500">{a.date}</td>
                    <td className="px-6 py-4 font-bold">{getTeacherName(a.original_teacher_id)}</td>
                    <td className="px-6 py-4">Standard {getClassName(a.class_id)}</td>
                    <td className="px-6 py-4">{getSubjectName(a.subject_id)}</td>
                    <td className="px-6 py-4 text-center font-bold">Period {a.period_number}</td>
                    <td className="px-6 py-4 font-bold text-accent">{getTeacherName(a.substitute_teacher_id)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {a.status}
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
  );
};

export default Substitute;
