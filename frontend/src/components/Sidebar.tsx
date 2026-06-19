import React, { useState, useEffect } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Clock, 
  UserCheck, 
  ArrowUpCircle, 
  Settings, 
  LogOut,
  X,
  GraduationCap
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const routerState = useRouterState();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  // Close sidebar on path change (useful on mobile drawer)
  useEffect(() => {
    setIsOpen(false);
  }, [routerState.location.pathname]);

  const navItems = [
    {
      to: '/dashboard',
      label: t('common.dashboard'),
      icon: LayoutDashboard,
      roles: ['ADMIN', 'TEACHER']
    },
    {
      to: '/results',
      label: t('common.results'),
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'TEACHER']
    },
    {
      to: '/timetable',
      label: t('common.timetable'),
      icon: Clock,
      roles: ['ADMIN', 'TEACHER']
    },
    {
      to: '/substitute',
      label: t('common.substitute'),
      icon: UserCheck,
      roles: ['ADMIN', 'TEACHER']
    },
    {
      to: '/promotion',
      label: t('common.promotion'),
      icon: ArrowUpCircle,
      roles: ['ADMIN'] // Admin only
    },
    {
      to: '/settings',
      label: t('common.settings'),
      icon: Settings,
      roles: ['ADMIN', 'TEACHER']
    }
  ];

  const activePath = routerState.location.pathname;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-300 ease-in-out md:static md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/60">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-accent" />
            <span className="font-heading text-lg font-bold text-white tracking-wide">
              Amarkor ERP
            </span>
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-900 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems
            .filter(item => user && item.roles.includes(user.role))
            .map(item => {
              const Icon = item.icon;
              const isActive = activePath === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                      : 'hover:bg-slate-900 hover:text-white text-slate-400'}
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* User profile & Logout */}
        {user && (
          <div className="border-t border-slate-800/60 p-4 bg-slate-950/40">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 font-heading text-sm font-semibold text-accent border border-slate-700">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate mb-1">{user.email}</p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-accent border border-accent/20 uppercase">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900/60 hover:bg-red-950/40 border border-slate-800/80 hover:border-red-900/30 px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-red-400 transition-all duration-200"
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
