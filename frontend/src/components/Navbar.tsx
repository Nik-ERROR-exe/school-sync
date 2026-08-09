import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouterState } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AnimatedThemeToggler } from './ui/AnimatedThemeToggler';
import {
  Menu,
  Languages,
  Check,
  Sparkles,
  Sun,
  Moon,
  Bell
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const routerState = useRouterState();
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setShowLangDropdown(false);
  };

  // Get Page Title from route
  const getPageTitle = () => {
    const path = routerState.location.pathname;
    if (path.includes('results')) return t('common.results');
    if (path.includes('timetable')) return t('common.timetable');
    if (path.includes('substitute')) return t('common.substitute');
    if (path.includes('promotion')) return t('common.promotion');
    if (path.includes('settings')) return t('common.settings');
    if (path.includes('students')) return 'Students';
    if (path.includes('class-management')) return 'Class Management';
    if (path.includes('teachers')) return 'Teachers Management';
    if (path.includes('profile')) return 'My Profile';
    return t('common.dashboard');
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-4 md:px-6 shadow-sm z-30 transition-colors duration-300">

      {/* Left side: Hamburger (mobile) & Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden border border-slate-200/60 dark:border-slate-800 transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {getPageTitle()}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 font-medium">
            Amarkor Vidyalaya, Bhandup West • Portal
          </p>
        </div>
      </div>

      {/* Right side: Academic Badge, Notifications, Theme Toggle, Language & User Role */}
      <div className="flex items-center gap-2.5 md:gap-3">

        {/* Dynamic School Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Academic Year 2026-27</span>
        </div>

        {/* Notification Bell Icon */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* 🌗 ANIMATED THEME TOGGLE BUTTON (View Transitions API + Configurable Clip-path) */}
        <AnimatedThemeToggler variant="circle" duration={500} />

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-all"
          >
            <Languages className="h-4 w-4 text-slate-400 dark:text-slate-400" />
            <span className="uppercase">{i18n.language}</span>
          </button>

          {showLangDropdown && (
            <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-xl ring-1 ring-black/5 z-40 border border-slate-100 dark:border-slate-800">
              <button
                onClick={() => changeLanguage('en')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>English</span>
                {i18n.language === 'en' && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
              </button>
              <button
                onClick={() => changeLanguage('mr')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  i18n.language === 'mr'
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>मराठी (MR)</span>
                {i18n.language === 'mr' && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
              </button>
            </div>
          )}
        </div>

        {/* User Role Quick Badge */}
        {user && (
          <div className="hidden sm:flex items-center justify-center border-l border-slate-200 dark:border-slate-800 pl-3 h-8">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 font-heading text-[10px] font-bold tracking-wider uppercase border border-slate-800 dark:border-slate-700 shadow-xs">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
