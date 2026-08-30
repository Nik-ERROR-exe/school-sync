import React, { useState, useEffect } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import schoolLogo from '../assets/school_logo.png';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Clock,
  ArrowUpCircle,
  Settings,
  LogOut,
  X,
  GraduationCap,
  Users,
  UserPlus,
  UserCircle,
  UserMinus,
  BookOpen,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const routerState = useRouterState();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  // Close sidebar on path change (useful on mobile drawer)
  useEffect(() => {
    setIsOpen(false);
  }, [routerState.location.pathname]);

  // Fetch pending count for admin
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const fetchPendingCount = async () => {
      try {
        const res = await api.get('/admin/teachers/pending');
        setPendingCount(res.data.length);
      } catch {
        setPendingCount(0);
      }
    };
    fetchPendingCount();
    // Re-fetch every 60 seconds
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const navItems = [
    {
      to: '/dashboard',
      label: t('common.dashboard'),
      icon: LayoutDashboard,
      roles: ['ADMIN', 'TEACHER'],
      badge: null,
    },
    // TEACHER ONLY: Results Entry
    {
      to: '/teacher/results-entry',
      label: 'Enter Results',
      icon: FileSpreadsheet,
      roles: ['TEACHER'],
      badge: null,
    },
    // ADMIN: Review & Approve Results
    {
      to: '/admin/results',
      label: 'Review Results',
      icon: FileSpreadsheet,
      roles: ['ADMIN'],
      badge: null,
    },
    {
      to: '/timetable',
      label: t('common.timetable'),
      icon: Clock,
      roles: ['ADMIN', 'TEACHER'],
      badge: null,
    },
    // ADMIN: Substitute Management
    {
      to: '/admin/substitute',
      label: 'Substitute Mgmt',
      icon: UserMinus,
      roles: ['ADMIN'],
      badge: null,
    },
    // Teacher only: My Substitutions
    {
      to: '/teacher/substitute',
      label: 'My Substitutions',
      icon: BookOpen,
      roles: ['TEACHER'],
      badge: null,
    },
    {
      to: '/promotion',
      label: t('common.promotion'),
      icon: ArrowUpCircle,
      roles: ['ADMIN'],
      badge: null,
    },
    // Admin Only: Student Management
    {
      to: '/admin/students',
      label: 'Students',
      icon: Users,
      roles: ['ADMIN'],
      badge: null,
    },
    // Admin Only: Class-Subject Mapping
    {
      to: '/admin/class-subject-mapping',
      label: 'Class-Subject',
      icon: Users,
      roles: ['ADMIN'],
      badge: null,
    },
    // Admin Only: Subject Max Marks Config
    {
      to: '/admin/subject-max-marks',
      label: 'Max Marks Config',
      icon: Settings,
      roles: ['ADMIN'],
      badge: null,
    },

    {
      to: '/admin/teachers/pending',
      label: 'Pending Approvals',
      icon: UserPlus,
      roles: ['ADMIN'],
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      to: '/admin/teachers',
      label: 'All Teachers',
      icon: Users,
      roles: ['ADMIN'],
      badge: null,
    },
    {
      to: '/admin/class-management',
      label: 'Class Management',
      icon: GraduationCap,
      roles: ['ADMIN'],
      badge: null,
    },
    {
      to: '/teacher/profile',
      label: 'My Profile',
      icon: UserCircle,
      roles: ['TEACHER', 'ADMIN'],
      badge: null,
    },
    {
      to: '/settings',
      label: t('common.settings'),
      icon: Settings,
      roles: ['ADMIN', 'TEACHER'],
      badge: null,
    },
  ];

  const activePath = routerState.location.pathname;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 dark:bg-slate-950 text-slate-300 transition-transform duration-300 ease-in-out md:static md:translate-x-0 border-r border-slate-800/80 dark:border-slate-800/80 shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {/* 🏫 SIDEBAR HEADER — Premium School Emblem Logo Formatting */}
        <div className="flex flex-col pt-5 pb-4 px-4 border-b border-slate-800/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="group flex items-center gap-3">
              {/* Official 40px x 40px School Emblem Logo */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 p-1 transition-transform duration-300 group-hover:scale-105 shadow-md">
                <img
                  src={schoolLogo}
                  alt="Amarkor Vidyalaya Emblem"
                  className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                />
              </div>

              {/* School Name & Subtitle */}
              <div className="flex flex-col min-w-0">
                <span className="font-heading text-[17px] font-bold text-white tracking-tight truncate leading-tight group-hover:text-blue-400 transition-colors">
                  Amarkor Vidyalaya
                </span>
                <span className="text-[12px] text-slate-400 font-medium tracking-wide truncate">
                  Bhandup West
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-5 overflow-y-auto">
          {navItems
            .filter(item => user && item.roles.includes(user.role))
            .map(item => {
              const Icon = item.icon;
              const isActive =
                activePath === item.to || activePath.startsWith(item.to + '/');
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200
                    ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'hover:bg-slate-900/90 hover:text-white text-slate-400'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className="inline-flex items-center justify-center h-4.5 min-w-4.5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* User Profile & Logout Section */}
        {user && (
          <div className="border-t border-slate-800/80 p-3.5 bg-slate-950/60">
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-heading text-xs font-bold text-blue-400 border border-slate-800 shadow-xs">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-snug">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate mb-0.5">
                  {user.email}
                </p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-950 text-blue-300 border border-blue-800/60 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900/80 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/40 px-3 py-2 text-xs font-bold text-slate-400 hover:text-red-400 transition-all duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('common.logout')}</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;