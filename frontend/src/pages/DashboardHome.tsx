import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Calendar,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  LayoutGrid,
  School,
  ShieldCheck,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

interface InfoItem {
  icon: LucideIcon;
  label: string;
  value: string;
  chip: string;
}

interface ModuleCard {
  icon: LucideIcon;
  to: string;
  title: string;
  description: string;
  chip: string;
  accent: string;
}

const DashboardHome: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Static, client-side only — no backend/database calls.
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const infoItems: InfoItem[] = [
    {
      icon: School,
      label: 'School',
      value: 'Amarkor Vidyalaya, Bhandup West',
      chip: 'from-blue-500 to-blue-600',
    },
    {
      icon: Calendar,
      label: 'Today',
      value: todayLabel,
      chip: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: GraduationCap,
      label: 'Academic Year',
      value: '2026–27',
      chip: 'from-amber-500 to-orange-600',
    },
    {
      icon: ShieldCheck,
      label: 'Role',
      value: user?.role === 'ADMIN' ? 'Administrator' : 'Teacher',
      chip: 'from-emerald-500 to-emerald-600',
    },
  ];

  const modules: ModuleCard[] = [
    {
      icon: FileSpreadsheet,
      to: user?.role === 'ADMIN' ? '/admin/results' : '/teacher/results-entry',
      title: 'Result Management',
      description:
        'Review marks submitted by teachers, approve report cards, or manage student registries.',
      chip: 'from-blue-500 to-blue-600',
      accent: 'border-t-blue-500',
    },
    {
      icon: Clock,
      to: '/timetable',
      title: 'Timetable Generation',
      description:
        'Configure teacher preferences, mapping, and generate timetables with constraint solvers.',
      chip: 'from-indigo-500 to-indigo-600',
      accent: 'border-t-indigo-500',
    },
    {
      icon: UserCheck,
      to: user?.role === 'ADMIN' ? '/admin/substitute' : '/teacher/substitute',
      title: 'Substitute Teacher',
      description:
        'Identify and assign substitute teachers for absent staff members during specific lectures.',
      chip: 'from-amber-500 to-amber-600',
      accent: 'border-t-amber-500',
    },
  ];

  return (
    <div className="space-y-8 font-body">

      {/* ────────────────────────────────────────
          PROFILE HERO CARD
          Theme-aware: light surface in light mode,
          dark surface in dark mode — no hardcoded dark colours.
          ──────────────────────────────────────── */}
      <div
        className={[
          'animate-hero-enter relative overflow-hidden rounded-2xl px-6 py-8 sm:px-12 sm:py-10',
          'shadow-premium border transition-colors duration-300',
          /* Light mode surface */
          'bg-gradient-to-br from-white via-slate-50 to-blue-50/70',
          'border-[#E2E8F0]',
          /* Dark mode overrides */
          'dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950',
          'dark:border-slate-800',
        ].join(' ')}
      >
        {/* Dot-grid texture — theme-aware via CSS class (see index.css) */}
        <div className="hero-dot-grid absolute inset-0 opacity-40 animate-drift pointer-events-none" />

        {/* Soft glow blobs */}
        <div className="absolute right-0 top-0 -mr-6 -mt-6 h-36 w-36 rounded-full bg-blue-400/10 dark:bg-blue-500/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 h-44 w-44 rounded-full bg-indigo-400/10 dark:bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-3">

            {/* School badge */}
            <div className={[
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold',
              'border border-blue-200/80 bg-blue-50 text-blue-600',
              'dark:border-slate-700 dark:bg-slate-800/80 dark:text-blue-400',
            ].join(' ')}>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Amarkor Vidyalaya, Bhandup West</span>
            </div>

            <div className="space-y-1">
              {/* Welcome heading — subtle Uiverse-style text shine via CSS class.
                  Adapts to Sora font; no font changes introduced. */}
              <h2 className="shine-text font-heading text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('common.welcome')}, {user?.name}!
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-300">
                {user?.email}
              </p>
            </div>

            {/* Teacher: Classes I Teach */}
            {user?.role === 'TEACHER' && (
              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  Classes I Teach
                </p>
                {user.classes_teaching && user.classes_teaching.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.classes_teaching.map((c) => (
                      <span
                        key={`${c.class_name}-${c.division}`}
                        className={[
                          'rounded-lg px-2.5 py-1.5 text-xs font-semibold',
                          'border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]',
                          'dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-100',
                        ].join(' ')}
                      >
                        {c.class_name} {c.division} —{' '}
                        {c.subjects.map((s) => s.subject_name).join(', ')}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#64748B] dark:text-slate-400">
                    No classes assigned yet.
                  </p>
                )}
              </div>
            )}

            {/* Admin: Stats blocks — interactive hover lift */}
            {user?.role === 'ADMIN' && user.stats && (
              <div className="grid max-w-md grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Teachers', value: user.stats.teachers_count },
                  { label: 'Classes',  value: user.stats.classes_count  },
                  { label: 'Students', value: user.stats.students_count },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={[
                      'group rounded-xl px-4 py-3 cursor-default',
                      'border transition-all duration-200',
                      /* Light */
                      'border-[#E2E8F0] bg-white/80',
                      /* Dark */
                      'dark:border-slate-700/60 dark:bg-slate-800/40',
                      /* Hover */
                      'hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/10',
                      'hover:border-blue-200 dark:hover:border-blue-800/60',
                      /* Pressed */
                      'active:scale-[.98]',
                    ].join(' ')}
                  >
                    <p className={[
                      'font-heading text-2xl font-extrabold',
                      'text-[#0F172A] dark:text-white',
                      'origin-left transition-transform duration-200 group-hover:scale-[1.06]',
                    ].join(' ')}>
                      {s.value}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avatar initial */}
          <div className="shrink-0">
            <div className={[
              'flex h-16 w-16 items-center justify-center rounded-full font-heading text-xl font-bold',
              'border-2 transition-transform duration-200 hover:scale-105',
              /* Light */
              'border-blue-200 bg-blue-100 text-[#1769FF]',
              /* Dark */
              'dark:border-white/30 dark:bg-blue-500/20 dark:text-white',
            ].join(' ')}>
              {(user?.name || '?').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────
          STATIC INFO PANEL — staggered entrance
          ──────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {infoItems.map((item, i) => (
          <div
            key={item.label}
            className={[
              'animate-card-enter group rounded-xl p-6 shadow-sm cursor-default',
              'border transition-all duration-200',
              /* Surface */
              'bg-white dark:bg-[#10151F]',
              'border-[#E2E8F0] dark:border-[#253044]',
              /* Hover */
              'hover:-translate-y-1 hover:shadow-premium',
              'hover:border-blue-100 dark:hover:border-blue-900/50',
              /* Pressed */
              'active:scale-[.98]',
            ].join(' ')}
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                {item.label}
              </span>
              <div
                className={`inline-flex rounded-lg bg-gradient-to-br p-2 text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5 ${item.chip}`}
              >
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ────────────────────────────────────────
          MODULE SHORTCUT CARDS — staggered entrance
          ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-lg bg-[#F8FAFC] dark:bg-[#161D29] border border-[#E2E8F0] dark:border-[#253044] p-1.5 text-[#0F172A] dark:text-[#F8FAFC]">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Module Shortcuts
          </h3>
          <span className="ml-1 rounded-full bg-[#F8FAFC] dark:bg-[#161D29] border border-[#E2E8F0] dark:border-[#253044] px-2 py-0.5 text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">
            {modules.length} modules
          </span>
          <div className="hidden flex-1 border-t border-[#E2E8F0] dark:border-[#253044] sm:block" />
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod, i) => (
            <Link
              key={mod.to}
              to={mod.to}
              className={[
                'animate-card-enter group flex flex-col justify-between rounded-xl p-6 shadow-sm',
                'border border-t-4 transition-all duration-250',
                /* Surface */
                'bg-white dark:bg-[#10151F]',
                'border-[#E2E8F0] dark:border-[#253044]',
                /* Hover lift + shadow */
                'hover:-translate-y-1 hover:shadow-premium',
                'hover:border-blue-100 dark:hover:border-blue-900/40',
                /* Pressed */
                'active:scale-[.98]',
                /* Focus */
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769FF] focus-visible:ring-offset-2',
                /* Top accent */
                mod.accent,
              ].join(' ')}
              style={{ animationDelay: `${180 + i * 90}ms` }}
            >
              <div>
                <div
                  className={`mb-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-br p-2.5 text-white shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-0.5 ${mod.chip}`}
                >
                  <mod.icon className="h-5 w-5" />
                </div>
                <h4 className="font-heading text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {mod.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                  {mod.description}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-200 group-hover:text-[#1769FF] dark:group-hover:text-[#3B82F6]">
                <span>Go to Module</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
