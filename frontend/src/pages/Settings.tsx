import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  Languages, 
  User, 
  ShieldAlert, 
  HelpCircle,
  Check
} from 'lucide-react';

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="space-y-8 font-body animate-fade-in">
      
      {/* Settings Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm max-w-3xl">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
            <Languages className="h-5 w-5 text-accent" />
            <span>Multi Language Configuration</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
            Select system interface display language
          </p>
        </div>

        {/* Language Toggler Buttons */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* English Selector */}
          <button
            onClick={() => changeLanguage('en')}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition shadow-sm ${
              i18n.language === 'en' 
                ? 'border-accent bg-blue-50/20 text-accent font-bold ring-2 ring-accent/10' 
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div>
              <span className="text-sm block">English</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Standard English (US)</span>
            </div>
            {i18n.language === 'en' && (
              <div className="rounded-full bg-accent p-1 text-white shadow-sm">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>

          {/* Marathi Selector */}
          <button
            onClick={() => changeLanguage('mr')}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition shadow-sm ${
              i18n.language === 'mr' 
                ? 'border-accent bg-blue-50/20 text-accent font-bold ring-2 ring-accent/10' 
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div>
              <span className="text-sm block">मराठी (Marathi)</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">प्रादेशिक भाषा (Maharashtra)</span>
            </div>
            {i18n.language === 'mr' && (
              <div className="rounded-full bg-accent p-1 text-white shadow-sm">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      {user && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm max-w-3xl">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              <span>User Profile Details</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
              Current login session properties
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</span>
              <span className="text-xs font-extrabold text-slate-900 sm:col-span-2">{user.name}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</span>
              <span className="text-xs font-semibold text-slate-900 sm:col-span-2">{user.email}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff ID</span>
              <span className="text-xs font-mono font-bold text-slate-900 sm:col-span-2">{user.teacherId}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Role</span>
              <span className="sm:col-span-2">
                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-950 text-white border border-slate-900">
                  {user.role}
                </span>
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</span>
              <span className="sm:col-span-2">
                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {user.status}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Security alert context */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm max-w-3xl flex gap-3.5">
        <ShieldAlert className="h-5.5 w-5.5 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">Security & API Mode</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            This application is running in mock offline mode. JWTs, profile objects, and marks uploads are persisted locally in the web browser database. When connected to FastAPI & PostgreSQL later, actions will authenticate over HTTPS using OAuth2 protocols.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Settings;
