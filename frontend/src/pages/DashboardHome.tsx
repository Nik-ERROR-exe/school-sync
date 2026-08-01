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
  ring: string;
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
      ring: 'border-blue-100',
    },
    {
      icon: Calendar,
      label: 'Today',
      value: todayLabel,
      chip: 'from-indigo-500 to-indigo-600',
      ring: 'border-indigo-100',
    },
    {
      icon: GraduationCap,
      label: 'Academic Year',
      value: '2026–27',
      chip: 'from-amber-500 to-orange-600',
      ring: 'border-amber-100',
    },
    {
      icon: ShieldCheck,
      label: 'Role',
      value: user?.role === 'ADMIN' ? 'Administrator' : 'Teacher',
      chip: 'from-emerald-500 to-emerald-600',
      ring: 'border-emerald-100',
    },
  ];

  const modules: ModuleCard[] = [
    {
      icon: FileSpreadsheet,
      to: '/admin/results',
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
      to: '/substitute',
      title: 'Substitute Teacher',
      description:
        'Identify and assign substitute teachers for absent staff members during specific lectures.',
      chip: 'from-amber-500 to-amber-600',
      accent: 'border-t-amber-500',
    },
  ];

  return (
    <div className="space-y-8 font-body">
      {/* Welcome Banner — gradient hero band */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-premium border border-slate-800 sm:px-12 sm:py-10">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="absolute right-0 top-0 -mr-4 -mt-4 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
        <div className="absolute bottom-0 right-1/4 -mb-8 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-accent">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Amarkor Vidyalaya, Bhandup West</span>
            </div>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight md:text-3xl">
              {t('common.welcome')}, {user?.name}!
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              Welcome back to your school ERP dashboard. Check schedules, enter academic results, or
              arrange class substitutions instantly.
            </p>
          </div>
          <div className="shrink-0 flex gap-3">
            <Link
              to="/admin/results"
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              <span>{t('common.results')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Static Info Panel — no backend calls */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {infoItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm transition-all duration-200 hover:shadow-premium hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {item.label}
              </span>
              <div
                className={`inline-flex rounded-lg bg-gradient-to-br p-2 text-white shadow-sm ${item.chip}`}
              >
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-base font-bold tracking-tight text-slate-900">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Modules Shortcut Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-lg bg-slate-100 border border-slate-200 p-1.5 text-slate-700">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-base font-bold text-slate-900">Module Shortcuts</h3>
          <span className="ml-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            {modules.length} modules
          </span>
          <div className="hidden flex-1 border-t border-slate-200/80 sm:block" />
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Link
              key={mod.to}
              to={mod.to}
              className={`group flex flex-col justify-between rounded-xl border border-t-4 border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-premium ${mod.accent}`}
            >
              <div>
                <div
                  className={`mb-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-br p-2.5 text-white shadow-sm transition group-hover:scale-105 ${mod.chip}`}
                >
                  <mod.icon className="h-5 w-5" />
                </div>
                <h4 className="font-heading text-sm font-bold text-slate-950">{mod.title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{mod.description}</p>
              </div>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-slate-950 transition-colors group-hover:text-accent">
                <span>Go to Module</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
