import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouterState } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { AnimatedThemeToggler } from './ui/AnimatedThemeToggler';
import {
  Menu,
  Languages,
  Check,
  Sparkles,
  Bell
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
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
    <header className="flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] px-4 md:px-6 shadow-xs z-30 transition-colors duration-300">

      {/* Left side: Hamburger (mobile) & Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          className="rounded-xl p-2 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#161D29] dark:hover:text-[#F8FAFC] md:hidden border border-[#E2E8F0] dark:border-[#253044] transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg md:text-xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            {getPageTitle()}
          </h1>
          <p className="hidden md:block text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
            Amarkor Vidyalaya, Bhandup West • Portal
          </p>
        </div>
      </div>

      {/* Right side: Academic Badge, Notifications, Theme Toggle, Language & User Role */}
      <div className="flex items-center gap-2.5 md:gap-3">

        {/* Dynamic School Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/50 text-[#1769FF] dark:text-[#3B82F6] text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-[#1769FF] dark:text-[#3B82F6]" />
          <span>Academic Year 2026-27</span>
        </div>

        {/* Notification Bell Icon */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#121A27] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-all shadow-xs"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#1769FF] ring-2 ring-white dark:ring-[#10151F]" />
        </button>

        {/* 🌗 ANIMATED THEME TOGGLE BUTTON */}
        <AnimatedThemeToggler variant="circle" duration={500} />

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29] px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#121A27] shadow-xs transition-all"
          >
            <Languages className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
            <span className="uppercase">{i18n.language}</span>
          </button>

          {showLangDropdown && (
            <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-2xl bg-white dark:bg-[#10151F] p-1.5 shadow-xl ring-1 ring-black/5 z-40 border border-[#E2E8F0] dark:border-[#253044]">
              <button
                onClick={() => changeLanguage('en')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1769FF] dark:text-[#3B82F6]'
                    : 'text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#161D29]'
                }`}
              >
                <span>English</span>
                {i18n.language === 'en' && <Check className="h-3.5 w-3.5 text-[#1769FF] dark:text-[#3B82F6]" />}
              </button>
              <button
                onClick={() => changeLanguage('mr')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  i18n.language === 'mr'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1769FF] dark:text-[#3B82F6]'
                    : 'text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#161D29]'
                }`}
              >
                <span>मराठी (MR)</span>
                {i18n.language === 'mr' && <Check className="h-3.5 w-3.5 text-[#1769FF] dark:text-[#3B82F6]" />}
              </button>
            </div>
          )}
        </div>

        {/* User Role Quick Badge */}
        {user && (
          <div className="hidden sm:flex items-center justify-center border-l border-[#E2E8F0] dark:border-[#253044] pl-3 h-8">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#0F172A] dark:bg-[#161D29] text-white dark:text-[#F8FAFC] font-heading text-[10px] font-bold tracking-wider uppercase border border-[#0F172A] dark:border-[#253044] shadow-xs">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
