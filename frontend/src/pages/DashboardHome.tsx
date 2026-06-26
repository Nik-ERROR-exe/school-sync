import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ResultsService } from '../features/results/services';
import { TimetableService } from '../features/timetable/services';
import { SubstituteService } from '../features/substitute/services';
import { Link } from '@tanstack/react-router';
import { 
  Users, 
  FileSpreadsheet, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Bell
} from 'lucide-react';

const DashboardHome: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    studentsCount: 0,
    classesCount: 0,
    pendingSubmissions: 0,
    timetableSatisfied: true,
    substitutionsToday: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const students = await ResultsService.getStudents();
        const classes = await ResultsService.getClasses();
        const subs = await ResultsService.getSubmissions();
        const timetable = await TimetableService.getTimetable();
        const substitutes = await SubstituteService.getAssignments();

        const pending = subs.filter(s => s.status === 'pending').length;
        const constraintCheck = timetable.length > 0 
          ? TimetableService.checkConstraints(timetable)
          : { overallSatisfied: true };
        
        setStats({
          studentsCount: students.filter(s => s.status === 'ACTIVE').length,
          classesCount: classes.length,
          pendingSubmissions: pending,
          timetableSatisfied: constraintCheck.overallSatisfied,
          substitutionsToday: substitutes.filter(s => s.date === new Date().toISOString().split('T')[0]).length
        });
      } catch (e) {
        // If mock data fails, leave defaults as 0
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-8 font-body">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-8 text-white sm:px-12 sm:py-10 shadow-premium border border-slate-800">
        {/* Abstract shapes */}
        <div className="absolute right-0 top-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
        <div className="absolute bottom-0 right-1/4 -mb-8 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-accent">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Amarkor Vidyalaya, Bhandup West</span>
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">
              {t('common.welcome')}, {user?.name}!
            </h2>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Welcome back to your school ERP dashboard. Check schedules, enter academic results, or arrange class substitutions instantly.
            </p>
          </div>
          <div className="shrink-0 flex gap-3">
            <Link 
              to="/results"
              className="flex items-center gap-2 rounded-xl bg-white text-slate-900 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition shadow-sm"
            >
              <span>{t('common.results')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stat 1: Students */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Students</span>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-slate-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{stats.studentsCount}</span>
            <span className="ml-1.5 text-xs font-semibold text-slate-500">enrolled</span>
          </div>
        </div>

        {/* Stat 2: Classes */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Divisions</span>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-slate-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{stats.classesCount}</span>
            <span className="ml-1.5 text-xs font-semibold text-slate-500">1A to 10B</span>
          </div>
        </div>

        {/* Stat 3: Results Submissions */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-slate-700">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{stats.pendingSubmissions}</span>
            <span className="ml-1.5 text-xs font-semibold text-slate-500">submissions</span>
          </div>
        </div>

        {/* Stat 4: Timetable Solver State */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timetable Constraints</span>
            <div className={`rounded-lg p-2 border ${
              stats.timetableSatisfied 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                : 'bg-amber-50 border-amber-100 text-amber-600'
            }`}>
              {stats.timetableSatisfied ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`text-sm font-extrabold tracking-wide uppercase px-2 py-0.5 rounded border ${
              stats.timetableSatisfied 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                : 'bg-amber-50 text-amber-700 border-amber-200/60'
            }`}>
              {stats.timetableSatisfied ? 'Satisfied' : 'Violated'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Modules Shortcut Cards */}
      <div className="space-y-4">
        <h3 className="font-heading text-base font-bold text-slate-900">
          Module Shortcuts
        </h3>
        
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1: Results */}
          <Link 
            to="/results"
            className="group flex flex-col justify-between p-6 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 shadow-sm hover:shadow-premium transition-all duration-300"
          >
            <div>
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-blue-700 transition group-hover:scale-105">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h4 className="font-heading text-sm font-bold text-slate-950">
                {t('common.results')}
              </h4>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {user?.role === 'ADMIN' 
                  ? 'Review marks submitted by teachers, approve report cards, or manage student registries.'
                  : 'Select your class, division, and exam type to enter student marks into the grid.'}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-slate-950 group-hover:text-accent transition-colors">
              <span>Go to Module</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Timetable */}
          <Link 
            to="/timetable"
            className="group flex flex-col justify-between p-6 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 shadow-sm hover:shadow-premium transition-all duration-300"
          >
            <div>
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 p-2.5 text-indigo-700 transition group-hover:scale-105">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="font-heading text-sm font-bold text-slate-950">
                {t('common.timetable')}
              </h4>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {user?.role === 'ADMIN'
                  ? 'Configure teacher preferences, mapping, and generate timetables with constraint solvers.'
                  : 'View your personalized weekly lecture schedule, periods, and subject allocations.'}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-slate-950 group-hover:text-accent transition-colors">
              <span>Go to Module</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Substitute Teacher */}
          <Link 
            to="/substitute"
            className="group flex flex-col justify-between p-6 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 shadow-sm hover:shadow-premium transition-all duration-300"
          >
            <div>
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-amber-700 transition group-hover:scale-105">
                <UserCheck className="h-5 w-5" />
              </div>
              <h4 className="font-heading text-sm font-bold text-slate-950">
                {t('common.substitute')}
              </h4>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {user?.role === 'ADMIN'
                  ? 'Identify and assign substitute teachers for absent staff members during specific lectures.'
                  : 'Check notifications and list the substitute lecture assignments assigned to you.'}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-slate-950 group-hover:text-accent transition-colors">
              <span>Go to Module</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
