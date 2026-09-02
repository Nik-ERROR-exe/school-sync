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
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white dark:bg-[#10151F] text-[#0F172A] dark:text-[#F8FAFC] transition-transform duration-300 ease-in-out md:static md:translate-x-0 border-r border-[#E2E8F0] dark:border-[#253044] shadow-md
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {/* 🏫 SIDEBAR HEADER */}
        <div className="flex flex-col pt-5 pb-4 px-4 border-b border-[#E2E8F0] dark:border-[#253044]">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="group flex items-center gap-3">
              {/* 40px x 40px School Emblem Logo */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8FAFC] dark:bg-[#161D29] border border-[#E2E8F0] dark:border-[#253044] p-1 transition-transform duration-300 group-hover:scale-105 shadow-xs">
                <img
                  src={schoolLogo}
                  alt="Amarkor Vidyalaya Emblem"
                  className="h-full w-full object-contain"
                />
              </div>

              {/* School Name & Subtitle */}
              <div className="flex flex-col min-w-0">
                <span className="font-heading text-[17px] font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate leading-tight group-hover:text-[#1769FF] dark:group-hover:text-[#3B82F6] transition-colors">
                  Amarkor Vidyalaya
                </span>
                <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] font-medium tracking-wide truncate">
                  Bhandup West
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#161D29] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] md:hidden"
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
                        ? 'bg-[#1769FF] dark:bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                        : 'hover:bg-[#F8FAFC] dark:hover:bg-[#161D29] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#64748B] dark:text-[#94A3B8]'
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
          <div className="border-t border-[#E2E8F0] dark:border-[#253044] p-3.5 bg-[#F8FAFC]/50 dark:bg-[#10151F]">
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-[#161D29] font-heading text-xs font-bold text-[#1769FF] dark:text-[#3B82F6] border border-[#E2E8F0] dark:border-[#253044] shadow-xs">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate leading-snug">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate mb-0.5">
                  {user.email}
                </p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-[#1769FF] dark:text-[#3B82F6] border border-blue-200 dark:border-blue-800/60 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white dark:bg-[#161D29] hover:bg-red-50 dark:hover:bg-red-950/30 border border-[#E2E8F0] dark:border-[#253044] hover:border-red-200 dark:hover:border-red-900/40 px-3 py-2 text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
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