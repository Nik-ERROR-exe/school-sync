import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouterState } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  Languages,
  Check,
  Sparkles
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
    return t('common.dashboard');
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white px-6 shadow-sm z-30">

      {/* Left side: Hamburger (mobile) & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 md:hidden border border-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg md:text-xl font-bold tracking-tight text-slate-900">
            {getPageTitle()}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 font-medium">
            Amarkor Vidyalaya, Bhandup West • ERP Portal
          </p>
        </div>
      </div>

      {/* Right side: Language, Notifications & User Role indicator */}
      <div className="flex items-center gap-3">

        {/* Dynamic School Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
          <Sparkles className="h-3 w-3 text-accent" />
          <span>Academic Year 2026-27</span>
        </div>

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowLangDropdown(!showLangDropdown);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Languages className="h-4 w-4 text-slate-400" />
            <span className="uppercase">{i18n.language}</span>
          </button>

          {showLangDropdown && (
            <div className="absolute right-0 mt-2 w-32 origin-top-right rounded-xl bg-white p-1.5 shadow-premium ring-1 ring-black/5 z-40 border border-slate-100">
              <button
                onClick={() => changeLanguage('en')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors ${i18n.language === 'en' ? 'bg-slate-50 text-accent' : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <span>English</span>
                {i18n.language === 'en' && <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => changeLanguage('mr')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-left transition-colors ${i18n.language === 'mr' ? 'bg-slate-50 text-accent' : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <span>मराठी (MR)</span>
                {i18n.language === 'mr' && <Check className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* User Role Quick Badge */}
        {user && (
          <div className="hidden sm:flex items-center justify-center border-l border-slate-200 pl-3 h-8">
            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-900 text-white font-heading text-[10px] font-bold tracking-wider uppercase border border-slate-950">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
