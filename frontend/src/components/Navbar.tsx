import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouterState } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { SubstituteService } from '../features/substitute/services';
import { SubstituteNotification } from '../features/substitute/types';
import {
  Menu,
  Languages,
  Bell,
  Check,
  Calendar,
  Sparkles
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const routerState = useRouterState();
  const [notifications, setNotifications] = useState<SubstituteNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // Sync notifications
  const loadNotifications = async () => {
    const data = await SubstituteService.getNotifications();
    // For teacher, show only notifications directed to them (by parsing message or matching profile)
    // Here we'll show all notifications but teacher gets a clear personalized text
    setNotifications(data);
  };

  useEffect(() => {
    loadNotifications();

    // Listen for custom substitute assignments triggers to reload notifications live
    const handleNotifReload = () => {
      loadNotifications();
    };
    window.addEventListener('reload-notifications', handleNotifReload);
    return () => window.removeEventListener('reload-notifications', handleNotifReload);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setShowLangDropdown(false);
  };

  const markAsRead = async (id: number) => {
    await SubstituteService.markNotificationAsRead(id);
    loadNotifications();
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

  const unreadCount = notifications.filter(n => !n.read).length;

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
              setShowNotifDropdown(false);
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

        {/* Notification bell (substitution alerts) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowLangDropdown(false);
            }}
            className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white p-2 shadow-premium ring-1 ring-black/5 z-40 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-xs font-bold text-slate-950">Substitution Alerts</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    No substitutions assigned.
                  </div>
                ) : (
                  [...notifications].reverse().map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`group flex items-start gap-2.5 rounded-lg p-2.5 text-left text-xs transition-colors cursor-pointer ${notif.read ? 'hover:bg-slate-50 text-slate-500' : 'bg-blue-50/50 hover:bg-blue-50 text-slate-900 font-medium'
                        }`}
                    >
                      <div className={`mt-0.5 rounded-full p-1 ${notif.read ? 'bg-slate-100 text-slate-400' : 'bg-accent/10 text-accent'}`}>
                        <Calendar className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="leading-relaxed">{notif.message}</p>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {!notif.read && (
                        <div className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
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
