import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { GraduationCap, Lock, Mail, Languages, Check, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idOrEmail || !password) {
      toast.error(t('login.error_empty'));
      return;
    }

    setLoading(true);
    try {
      const success = await login(idOrEmail, password, rememberMe);
      if (success) {
        toast.success('Successfully logged in!');
        navigate({ to: '/dashboard' });
      } else {
        toast.error(t('login.error_invalid'));
      }
    } catch (err) {
      toast.error('An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-body">
      <div className="w-full max-w-md space-y-8 bg-white p-8 md:p-10 rounded-2xl border border-slate-200/80 shadow-premium">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-accent shadow-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-5 font-heading text-2xl font-extrabold tracking-tight text-slate-900">
            {t('login.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Credentials hints card */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-500 space-y-1">
          <span className="font-bold text-slate-700 block mb-1">Mock Credentials for Testing:</span>
          <div className="flex justify-between">
            <span>Admin: <strong className="text-slate-900 font-semibold">admin@amarkor.in</strong></span>
            <span>Pass: <strong className="text-slate-900 font-semibold">admin123</strong></span>
          </div>
          <div className="flex justify-between">
            <span>Teacher: <strong className="text-slate-900 font-semibold">teacher@amarkor.in</strong></span>
            <span>Pass: <strong className="text-slate-900 font-semibold">teacher123</strong></span>
          </div>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {/* ID or Email Field */}
            <div>
              <label htmlFor="id-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('login.id_placeholder')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="id-email"
                  name="idOrEmail"
                  type="text"
                  required
                  value={idOrEmail}
                  onChange={(e) => setIdOrEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all shadow-sm"
                  placeholder="admin@amarkor.in or T101"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('login.password')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Remember me & Lang Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs font-semibold text-slate-600 cursor-pointer">
                {t('login.remember_me')}
              </label>
            </div>

            {/* Inline Toggle Language for convenience */}
            <div className="flex gap-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200/50">
              <button
                type="button"
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${
                  i18n.language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('mr')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${
                  i18n.language === 'mr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                मराठी
              </button>
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-950 py-3.5 px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-2 disabled:opacity-50 shadow-md transition-all duration-200"
            >
              <span>{loading ? t('common.loading') : t('login.sign_in')}</span>
              {!loading && <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
