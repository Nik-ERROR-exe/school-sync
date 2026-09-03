"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import schoolLogo from '../assets/school_logo.png';
import schoolAssembly from '../assets/school-assembly.jpg';
import { TextReveal } from '@/components/unlumen-ui/primitives/text-reveal';
import { AnimatedThemeToggler } from '../components/ui/AnimatedThemeToggler';
import {
  AuthInput,
  AuthCheckbox,
  AuthButton,
  PasswordToggle,
  SegmentedControl,
  LanguageSelector,
} from '../components/ui/auth-primitives';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ idOrEmail?: string; password?: string }>({});

  const triggerShake = () => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { idOrEmail?: string; password?: string } = {};

    if (!idOrEmail.trim()) {
      errors.idOrEmail = t('login.error.emailRequired', 'Required');
    }
    if (!password) {
      errors.password = t('login.error.passRequired', 'Required');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShake();
      toast.error(t('login.error.credentials', 'Please enter your credentials.'));
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const success = await login(idOrEmail, password, rememberMe);
      if (success) {
        toast.success(t('login.success', 'Welcome back!'));
        navigate({ to: '/dashboard' });
      } else {
        triggerShake();
        toast.error(t('login.error.invalid', 'Invalid ID/Email or password.'));
      }
    } catch (err: unknown) {
      triggerShake();
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
    <div
      className="relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-10 transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-color)' }}
    >
      {/* ── Outer Card ── */}
      <div
        className="relative z-10 w-full max-w-[1060px] overflow-hidden rounded-[22px] border transition-all duration-300"
        style={{
          backgroundColor: 'var(--surface-color)',
          borderColor: 'var(--border-color)',
          boxShadow: '0 16px 48px -12px rgba(0,0,0,0.08), 0 4px 12px -2px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex flex-col lg:flex-row min-h-[600px]">

          {/* ════════════════════════════════════════════
              LEFT IMAGE PANEL
             ════════════════════════════════════════════ */}
          <div
            className="relative hidden lg:flex flex-col justify-between overflow-hidden lg:w-[50%] p-10 text-white"
          >
            {/* Background image + cinematic gradient */}
            <div className="absolute inset-0">
              <img
                src={schoolAssembly}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Cinematic multi-layer gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/85" />
              {/* Vignette */}
              <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4)' }} />
            </div>

            {/* Header Brand */}
            <div className="relative z-10 flex items-center gap-3.5 auth-enter auth-enter-d1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-md">
                <img src={schoolLogo} alt="Amarkor Vidyalaya" className="h-full w-full object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                  Amarkor Vidyalaya
                </h2>
                <p className="text-[11px] font-medium text-slate-300/75 tracking-wide">Bhandup West · Est. School</p>
              </div>
            </div>

            {/* Center Content */}
            <div className="relative z-10 my-auto py-8">
              <TextReveal
                text="Your School, One Portal"
                as="h1"
                splitBy="words"
                staggerDelay={0.05}
                duration={0.5}
                once={true}
                className="text-[2.25rem] font-bold tracking-tight text-white leading-[1.15]"
                style={{ fontFamily: 'var(--font-heading)' }}
              />

              <TextReveal
                text="Everything you need, right at your fingertips."
                as="p"
                splitBy="words"
                staggerDelay={0.035}
                duration={0.5}
                once={true}
                className="mt-3.5 text-[15px] font-medium text-slate-200/85 leading-relaxed max-w-[380px]"
              />
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-slate-300/60 font-medium auth-enter auth-enter-d3">
              <p>© 2026 Amarkor Vidyalaya</p>
              <p className="tracking-wide">ज्ञान संस्कार चारित्र्य</p>
            </div>
          </div>

          {/* ════════════════════════════════════════════
              MOBILE IMAGE BANNER (visible < lg)
             ════════════════════════════════════════════ */}
          <div className="relative lg:hidden h-44 overflow-hidden">
            <img src={schoolAssembly} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-900/80" />
            <div className="relative z-10 flex h-full flex-col justify-end p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 p-1 backdrop-blur-md">
                  <img src={schoolLogo} alt="Amarkor Vidyalaya" className="h-full w-full object-contain" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                    Amarkor Vidyalaya
                  </h2>
                  <p className="text-[10px] font-medium text-slate-300/70">Bhandup West · Est. School</p>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT FORM PANEL
             ════════════════════════════════════════════ */}
          <div
            className="flex flex-1 flex-col justify-between p-6 sm:p-8 lg:p-10"
            style={{ backgroundColor: 'var(--surface-color)' }}
          >
            {/* ── Top Controls ── */}
            <div className="flex items-center justify-between gap-3 auth-enter auth-enter-d1">
              <SegmentedControl
                active="login"
                onSwitch={(tab) => {
                  if (tab === 'register') navigate({ to: '/register' });
                }}
              />

              <div className="flex items-center gap-2">
                <LanguageSelector currentLang={i18n.language} onChange={changeLanguage} />
                <AnimatedThemeToggler size="sm" variant="circle" />
              </div>
            </div>

            {/* ── Form Area ── */}
            <div className={`mx-auto my-auto w-full max-w-[360px] py-6 ${shakeForm ? 'animate-shake' : ''}`}>
              {/* Heading */}
              <div className="mb-7 auth-enter auth-enter-d2">
                <h2
                  className="text-[22px] font-bold tracking-tight"
                  style={{ color: 'var(--text-color)', fontFamily: 'var(--font-heading)' }}
                >
                  Sign In
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--secondary-text)' }}>
                  Enter your credentials to access your account
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="auth-enter auth-enter-d3">
                  <AuthInput
                    id="id-email"
                    label={t('login.emailLabel', 'Teacher ID or Email')}
                    type="text"
                    value={idOrEmail}
                    onChange={(v) => {
                      setIdOrEmail(v);
                      if (fieldErrors.idOrEmail) setFieldErrors((p) => ({ ...p, idOrEmail: undefined }));
                    }}
                    autoComplete="username"
                    icon={<Mail size={15} />}
                    error={fieldErrors.idOrEmail}
                  />
                </div>

                <div className="auth-enter auth-enter-d4">
                  <AuthInput
                    id="password"
                    label={t('login.passLabel', 'Password')}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(v) => {
                      setPassword(v);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    autoComplete="current-password"
                    icon={<Lock size={15} />}
                    error={fieldErrors.password}
                    rightSlot={
                      <PasswordToggle
                        visible={showPassword}
                        onToggle={() => setShowPassword((s) => !s)}
                      />
                    }
                  />
                </div>

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between pt-0.5 auth-enter auth-enter-d5">
                  <AuthCheckbox
                    id="remember-me"
                    checked={rememberMe}
                    onChange={setRememberMe}
                    label={t('login.remember', 'Remember me')}
                  />
                  <button
                    type="button"
                    className="text-[12px] font-semibold transition-opacity duration-200 hover:opacity-75"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    {t('login.forgot', 'Forgot Password?')}
                  </button>
                </div>

                {/* Submit */}
                <div className="pt-1.5 auth-enter auth-enter-d6">
                  <AuthButton loading={loading} loadingText={t('login.signingIn', 'Signing in…')}>
                    <span>{t('login.cta', 'Sign in to Portal')}</span>
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </AuthButton>
                </div>
              </form>

              {/* Register link */}
              <div className="mt-6 text-center text-[12.5px] auth-enter auth-enter-d7" style={{ color: 'var(--secondary-text)' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate({ to: '/register' })}
                  className="font-semibold underline-offset-2 hover:underline"
                  style={{ color: 'var(--primary-color)' }}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="text-center text-[11px] font-medium auth-enter auth-enter-d8" style={{ color: 'var(--secondary-text)' }}>
              © 2026 Amarkor Vidyalaya · School Management Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;