// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import logo from '../assets/hero.png';

/* ─────────────────────────────────────────────
   Tailwind safelist note:
   All classes below use static strings only —
   no dynamic template literals.
───────────────────────────────────────────── */

/* Floating-label input component */
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  animDelay: string;
  mounted: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  id, label, type, value, onChange, autoComplete,
  icon, rightSlot, animDelay, mounted,
}) => {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div
      className="relative group transition-all duration-500 ease-out"
      style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transitionDelay: animDelay }}
    >
      {/* Glow ring */}
      <span
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
        style={{ background: 'linear-gradient(135deg,#2563eb44,#1e40af44)', filter: 'blur(6px)' }}
      />

      <div className="relative rounded-xl border border-slate-200 bg-white transition-all duration-200 focus-within:border-blue-600 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]">
        {/* Leading icon */}
        <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focused ? 'text-blue-600' : 'text-slate-400'}`}>
          {icon}
        </span>

        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          placeholder=" "
          aria-label={label}
          className="peer block w-full rounded-xl bg-transparent pb-2 pl-10 pr-11 pt-5 text-sm text-slate-900 outline-none placeholder-transparent"
        />

        {/* Floating label */}
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-10 select-none font-medium transition-all duration-200
            ${floated
              ? 'top-1.5 text-[10px] tracking-widest uppercase text-blue-600'
              : 'top-1/2 -translate-y-1/2 text-sm text-slate-400'
            }`}
        >
          {label}
        </label>

        {/* Right slot */}
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─────────── Main Login ─────────── */
const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idOrEmail.trim() || !password) {
      toast.error(t('login.error.credentials', 'Please enter your credentials.'));
      return;
    }
    setLoading(true);
    try {
      const success = await login(idOrEmail, password, rememberMe);
      if (success) {
        toast.success(t('login.success', 'Welcome back!'));
        navigate({ to: '/dashboard' });
      } else {
        // If login returns false, show a generic error
        toast.error(t('login.error.invalid', 'Invalid ID/Email or password.'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during login.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 font-body lg:p-8">

      {/* ── Subtle page-level blobs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-slate-500/10 blur-3xl" />
      </div>

      {/* ── Card ── */}
      <div
        className="relative z-10 w-full max-w-5xl transition-all duration-700 ease-out"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)' }}
      >
        <div className="flex flex-col overflow-hidden rounded-3xl shadow-2xl shadow-slate-900/30 ring-1 ring-slate-900/5 lg:flex-row lg:min-h-[600px]">

          {/* ══════════════════════════════════════════
              LEFT PANEL — Dark Blue/Slate Gradient (Enterprise Look)
          ══════════════════════════════════════════ */}
          <div className="relative flex flex-col justify-between overflow-hidden lg:w-5/12">

            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
            
            {/* Subtle glass overlay */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
            
            {/* Accent line at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400/50 via-blue-600 to-slate-400/50" />

            <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12">

              {/* TOP — Logo + Brand */}
              <div
                className="transition-all duration-700 ease-out"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-14px)', transitionDelay: '0.1s' }}
              >
                {/* Logo + School Name side-by-side */}
                <div className="flex items-center gap-3 mb-8">
                  <img
                    src={logo}
                    alt="Amarkor Vidyalaya"
                    className="h-12 w-auto object-contain drop-shadow-xl"
                  />
                  <div>
                    <h2 className="text-xl font-bold leading-tight text-white tracking-tight">
                      Amarkor Vidyalaya
                    </h2>
                    <p className="text-[10px] font-medium text-blue-200/70 tracking-[0.15em] uppercase">
                      {t('brand.tag', 'School ERP System')}
                    </p>
                  </div>
                </div>

                <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-4xl">
                  {t('login.h1a', 'Welcome back')}
                </h1>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">
                  {t('login.sub', 'Sign in to manage timetables, results, and substitutions.')}
                </p>
              </div>

              {/* ── Features section removed per request ── */}

              {/* BOTTOM — Footer */}
              <p
                className="text-xs text-slate-500 transition-all duration-700"
                style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.75s' }}
              >
                {t('footer', '© 2026 Amarkor Vidyalaya, Bhandup West')}
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              RIGHT PANEL — Clean White Form
          ══════════════════════════════════════════ */}
          <div className="flex flex-1 flex-col justify-center bg-white px-8 py-12 lg:px-14">
            <div className="mx-auto w-full max-w-sm">

              {/* Header */}
              <div
                className="mb-8 transition-all duration-500 ease-out"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transitionDelay: '0.18s' }}
              >
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {t('login.title', 'Sign in')}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {t('login.newHere', 'New teacher?')}{' '}
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/register' })}
                    className="font-semibold text-blue-600 underline-offset-2 transition-colors duration-150 hover:text-blue-800 hover:underline"
                  >
                    {t('login.registerLink', 'Register here')}
                  </button>
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">

                <InputField
                  id="id-email"
                  label={t('login.emailLabel', 'Teacher ID or Email')}
                  type="text"
                  value={idOrEmail}
                  onChange={setIdOrEmail}
                  autoComplete="username"
                  icon={<Mail size={16} />}
                  animDelay="0.28s"
                  mounted={mounted}
                />

                <InputField
                  id="password"
                  label={t('login.passLabel', 'Password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  icon={<Lock size={16} />}
                  animDelay="0.36s"
                  mounted={mounted}
                  rightSlot={
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(s => !s)}
                      className="text-slate-400 transition-colors hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                {/* Options row */}
                <div
                  className="flex items-center justify-between pt-0.5 transition-all duration-500"
                  style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.44s' }}
                >
                  {/* Checkbox */}
                  <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
                    <span className="relative flex h-4 w-4 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white transition checked:border-blue-600 checked:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                      />
                      <svg
                        className="pointer-events-none absolute inset-0 hidden h-4 w-4 text-white peer-checked:block"
                        viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                      >
                        <polyline points="3,8 6.5,11.5 13,4.5" />
                      </svg>
                    </span>
                    {t('login.remember', 'Remember me')}
                  </label>

                  {/* Language pill */}
                  <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(['en', 'mr'] as const).map(code => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => changeLanguage(code)}
                        className={`rounded-md px-3 py-1 text-xs font-bold transition-all duration-200 ${
                          i18n.language === code
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {code === 'en' ? 'EN' : 'मर'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div
                  className="pt-2 transition-all duration-500"
                  style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transitionDelay: '0.52s' }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:-translate-y-px hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {/* shimmer */}
                    <span className="absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20 transition-transform duration-700 group-hover:translate-x-[120%]" />

                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          {t('login.signingIn', 'Signing in…')}
                        </>
                      ) : (
                        <>
                          {t('login.cta', 'Sign in')}
                          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>

              {/* Footer note */}
              <p
                className="mt-8 text-center text-[11px] text-slate-400 transition-all duration-700"
                style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.7s' }}
              >
                {t('login.legal', "By signing in you agree to the school's data policies.")}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;