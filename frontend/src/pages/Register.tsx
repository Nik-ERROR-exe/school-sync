// src/pages/Register.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import {
  Mail, Lock, User, ArrowRight, ArrowLeft,
  Eye, EyeOff, CheckCircle2, XCircle, Clock,
  GraduationCap, ShieldCheck, Bell,
} from 'lucide-react';
import api from '../api';
import logo from '../assets/hero.png';

/* ─── Password strength ─── */
interface StrengthInfo { score: number; label: string; pct: number; colorClass: string; textClass: string }

function getStrength(pw: string): StrengthInfo {
  if (!pw) {
    return { score: 0, label: '', pct: 0, colorClass: 'bg-slate-200', textClass: 'text-slate-400' };
  }

  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levelIndex = Math.min(score - 1, 4);
  const levels: StrengthInfo[] = [
    { score: 1, label: 'Very weak',   pct: 20,  colorClass: 'bg-red-400',     textClass: 'text-red-500'     },
    { score: 2, label: 'Weak',        pct: 40,  colorClass: 'bg-orange-400',  textClass: 'text-orange-500'  },
    { score: 3, label: 'Fair',        pct: 60,  colorClass: 'bg-yellow-400',  textClass: 'text-yellow-600'  },
    { score: 4, label: 'Strong',      pct: 80,  colorClass: 'bg-blue-400',    textClass: 'text-blue-600'    },
    { score: 5, label: 'Very strong', pct: 100, colorClass: 'bg-blue-600',    textClass: 'text-blue-600'    },
  ];
  return levels[levelIndex];
}

/* ─── Step dots ─── */
const Steps: React.FC<{ current: number; mounted: boolean }> = ({ current, mounted }) => (
  <div
    className="mb-6 flex items-center gap-2 transition-all duration-700"
    style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.16s' }}
  >
    {([1, 2, 3] as const).map(step => (
      <React.Fragment key={step}>
        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
          step < current
            ? 'bg-emerald-500 text-white'
            : step === current
              ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-500/30'
              : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
        }`}>
          {step < current ? <CheckCircle2 size={12} aria-hidden="true" /> : step}
        </div>
        {step < 3 && (
          <div className={`h-px flex-1 max-w-[28px] rounded-full transition-all duration-300 ${step < current ? 'bg-emerald-400' : 'bg-slate-200'}`} />
        )}
      </React.Fragment>
    ))}
    <span className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      Step {current} of 3
    </span>
  </div>
);

/* ─── Floating-label input ─── */
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  hasError?: boolean;
  animDelay: string;
  mounted: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  id, label, type, value, onChange, autoComplete,
  icon, rightSlot, hasError = false, animDelay, mounted,
}) => {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div
      className="relative group transition-all duration-500 ease-out"
      style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transitionDelay: animDelay }}
    >
      <span
        className="pointer-events-none absolute -inset-px rounded-xl transition-opacity duration-300"
        style={{
          background: hasError
            ? 'linear-gradient(135deg,#ef444430,#ef444420)'
            : 'linear-gradient(135deg,#2563eb33,#1e40af33)',
          filter: 'blur(5px)',
          opacity: hasError ? 1 : undefined,
        }}
      />

      <div className={`relative rounded-xl border bg-white transition-all duration-200 ${
        hasError
          ? 'border-red-300 focus-within:border-red-400 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
          : 'border-slate-200 focus-within:border-blue-600 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]'
      }`}>
        <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
          hasError ? 'text-red-400' : focused ? 'text-blue-600' : 'text-slate-400'
        }`}>
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
          aria-invalid={hasError ? true : undefined}
          className="peer block w-full rounded-xl bg-transparent pb-2 pl-10 pr-11 pt-5 text-sm text-slate-900 outline-none placeholder-transparent"
        />

        <label
          htmlFor={id}
          className={
            floated && hasError
              ? 'pointer-events-none absolute left-10 select-none font-medium transition-all duration-200 top-1.5 text-[10px] tracking-widest uppercase text-red-400'
              : floated
                ? 'pointer-events-none absolute left-10 select-none font-medium transition-all duration-200 top-1.5 text-[10px] tracking-widest uppercase text-blue-600'
                : 'pointer-events-none absolute left-10 select-none font-medium transition-all duration-200 top-1/2 -translate-y-1/2 text-sm text-slate-400'
          }
        >
          {label}
        </label>

        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Left panel badge ─── */
const Badge: React.FC<{ icon: React.ReactNode; text: string; delay: string; mounted: boolean }> = ({ icon, text, delay, mounted }) => (
  <div
    className="flex items-center gap-3 transition-all duration-700 ease-out"
    style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-14px)', transitionDelay: delay }}
  >
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-200 ring-1 ring-white/10 backdrop-blur-sm">
      {icon}
    </span>
    <span className="text-sm text-slate-300">{text}</span>
  </div>
);

/* ─────────── Main Register ─────────── */
const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(id);
  }, []);

  const strength = useMemo(() => getStrength(password), [password]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordMatch   = confirmPassword.length > 0 && password === confirmPassword;

  const currentStep = !name.trim() || !email.trim() ? 1 : !password ? 2 : 3;

  interface RegisterResponse { message?: string; }
  interface ApiError { response?: { data?: { detail?: string } } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error(t('reg.err.required', 'All fields are required.'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('reg.err.mismatch', 'Passwords do not match.'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('reg.err.short', 'Password must be at least 6 characters.'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<RegisterResponse>('/auth/register', { name, email, password });
      setSubmitted(true);
      toast.success(res.data?.message || t('reg.success', 'Registration successful! Awaiting admin approval.'));
      setTimeout(() => navigate({ to: '/login' }), 3500);
    } catch (err: unknown) {
      const error = err as ApiError;
      const detail = error.response?.data?.detail;
      toast.error(detail || t('reg.err.generic', 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-12 text-center shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-slate-900">
            {t('reg.submitted', 'Registration submitted!')}
          </h2>
          <p className="text-sm leading-relaxed text-slate-500">
            {t('reg.pendingMsg', "Your account is pending admin approval. You'll be redirected to login shortly.")}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600">
            <Clock size={15} className="animate-pulse" aria-hidden="true" />
            {t('reg.redirecting', 'Redirecting to login…')}
          </div>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 font-body lg:p-8">

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-500/10 blur-3xl" />
      </div>

      <div
        className="relative z-10 w-full max-w-5xl transition-all duration-700 ease-out"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)' }}
      >
        <div className="flex flex-col overflow-hidden rounded-3xl shadow-2xl shadow-slate-900/30 ring-1 ring-slate-900/5 lg:flex-row lg:min-h-[640px]">

          {/* ══════════════════════════════════════════
              LEFT PANEL — Dark Blue/Slate Gradient
          ══════════════════════════════════════════ */}
          <div className="relative flex flex-col justify-between overflow-hidden lg:w-5/12">
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400/50 via-blue-600 to-slate-400/50" />

            <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-12">

              <div
                className="transition-all duration-700 ease-out"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-14px)', transitionDelay: '0.1s' }}
              >
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
                  {t('reg.h1a', 'Start your')}
                  <br />
                  <span className="bg-gradient-to-r from-blue-200 to-slate-200 bg-clip-text text-transparent">
                    {t('reg.h1b', 'journey here')}
                  </span>
                </h1>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">
                  {t('reg.sub', 'Create your teacher account and access the full Amarkor ERP ecosystem.')}
                </p>
              </div>

              <div className="my-8 space-y-3">
                <div
                  className="mb-4 h-px w-12 bg-gradient-to-r from-blue-400/60 to-transparent transition-all duration-700"
                  style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.3s' }}
                />
                {[
                  { icon: <GraduationCap size={15} />, text: t('reg.b1', 'Accredited institution'),   delay: '0.35s' },
                  { icon: <ShieldCheck size={15} />,   text: t('reg.b2', 'Admin review required'),    delay: '0.43s' },
                  { icon: <Bell size={15} />,           text: t('reg.b3', 'Approval within 24 hours'), delay: '0.51s' },
                ].map(b => (
                  <Badge key={b.text} icon={b.icon} text={b.text} delay={b.delay} mounted={mounted} />
                ))}
              </div>

              <p
                className="text-xs text-slate-500 transition-all duration-700"
                style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.7s' }}
              >
                {t('footer', '© 2026 Amarkor Vidyalaya, Bhandup West')}
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              RIGHT PANEL — Form
          ══════════════════════════════════════════ */}
          <div className="flex flex-1 flex-col justify-center bg-white px-8 py-12 lg:px-14">
            <div className="mx-auto w-full max-w-sm">

              <div
                className="mb-7 transition-all duration-500 ease-out"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transitionDelay: '0.18s' }}
              >
                <button
                  type="button"
                  onClick={() => navigate({ to: '/login' })}
                  className="group mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
                >
                  <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                  {t('reg.back', 'Back to login')}
                </button>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {t('reg.title', 'Create account')}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {t('reg.subtitle', 'Fill in your details to register as a teacher.')}
                </p>
              </div>

              <Steps current={currentStep} mounted={mounted} />

              <form onSubmit={handleSubmit} noValidate className="space-y-4">

                <InputField
                  id="reg-name"
                  label={t('reg.nameLabel', 'Full name')}
                  type="text"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  icon={<User size={16} />}
                  animDelay="0.28s"
                  mounted={mounted}
                />

                <InputField
                  id="reg-email"
                  label={t('reg.emailLabel', 'Email address')}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  icon={<Mail size={16} />}
                  animDelay="0.34s"
                  mounted={mounted}
                />

                <InputField
                  id="reg-password"
                  label={t('reg.passLabel', 'Password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  icon={<Lock size={16} />}
                  animDelay="0.40s"
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

                {password.length > 0 && (
                  <div
                    className="space-y-1.5 px-0.5 transition-all duration-500"
                    style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.42s' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${strength.colorClass}`}
                          style={{ width: `${strength.pct}%` }}
                        />
                      </div>
                      <span className={`min-w-[5rem] text-right text-[10px] font-bold ${strength.textClass}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {[
                        { ok: password.length >= 6,                              label: 'Min 6 chars' },
                        { ok: /[A-Z]/.test(password) && /[a-z]/.test(password), label: 'Upper & lower' },
                        { ok: /\d/.test(password),                               label: 'Number' },
                        { ok: /[^A-Za-z0-9]/.test(password),                    label: 'Special char' },
                      ].map(({ ok, label }) => (
                        <span key={label} className={`flex items-center gap-1 text-[10px] font-medium transition-colors duration-200 ${ok ? 'text-emerald-600' : 'text-slate-300'}`}>
                          {ok ? <CheckCircle2 size={10} aria-hidden="true" /> : <XCircle size={10} aria-hidden="true" />}
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <InputField
                  id="reg-confirm"
                  label={t('reg.confirmLabel', 'Confirm password')}
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  icon={<Lock size={16} />}
                  hasError={passwordMismatch}
                  animDelay="0.46s"
                  mounted={mounted}
                  rightSlot={
                    <>
                      {passwordMatch    && <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" aria-hidden="true" />}
                      {passwordMismatch && <XCircle size={15} className="text-red-400 flex-shrink-0" aria-hidden="true" />}
                      <button
                        type="button"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        onClick={() => setShowConfirm(s => !s)}
                        className="text-slate-400 transition-colors hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </>
                  }
                />
                {passwordMismatch && (
                  <p className="-mt-2 ml-0.5 text-[11px] font-medium text-red-500">
                    {t('reg.mismatch', "Passwords don't match")}
                  </p>
                )}

                <div
                  className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-700 transition-all duration-500"
                  style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.52s' }}
                >
                  <span className="font-semibold">ℹ️ {t('reg.noteTitle', 'Pending review')}: </span>
                  {t('reg.noteBody', "Your account will be in Pending status until an admin approves it. You'll receive an email once approved.")}
                </div>

                <div
                  className="pt-1 transition-all duration-500"
                  style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transitionDelay: '0.58s' }}
                >
                  <button
                    type="submit"
                    disabled={loading || passwordMismatch}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:-translate-y-px hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20 transition-transform duration-700 group-hover:translate-x-[120%]" />

                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          {t('reg.registering', 'Registering…')}
                        </>
                      ) : (
                        <>
                          {t('reg.cta', 'Create account')}
                          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>

              <p
                className="mt-6 text-center text-[11px] text-slate-400 transition-all duration-700"
                style={{ opacity: mounted ? 1 : 0, transitionDelay: '0.74s' }}
              >
                {t('reg.legal', 'By registering, you confirm this is an official school email.')}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;