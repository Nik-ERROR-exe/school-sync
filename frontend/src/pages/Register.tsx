"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { Mail, Lock, User, ArrowRight, CheckCircle, Info } from 'lucide-react';
import api from '../api';
import schoolLogo from '../assets/school_logo.png';
import schoolAssembly from '../assets/school-assembly.jpg';
import { TextReveal } from '@/components/unlumen-ui/primitives/text-reveal';
import { AnimatedThemeToggler } from '../components/ui/AnimatedThemeToggler';
import {
  AuthInput,
  AuthButton,
  PasswordToggle,
  SegmentedControl,
  LanguageSelector,
} from '../components/ui/auth-primitives';

const Register: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const triggerShake = () => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    if (!name.trim()) errors.name = 'Required';
    if (!email.trim()) errors.email = 'Required';
    if (!password) errors.password = 'Required';
    if (!confirmPassword) errors.confirmPassword = 'Required';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords don\'t match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShake();
      if (errors.confirmPassword === 'Passwords don\'t match') {
        toast.error('Passwords do not match.');
      } else {
        toast.error('All fields are required.');
      }
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await api.post('/auth/register', { name, email, password });
      toast.success(res.data.message || 'Registration successful! Awaiting admin approval.');
      setRegistered(true);
      setTimeout(() => navigate({ to: '/login' }), 4000);
    } catch (err: any) {
      triggerShake();
      toast.error(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const clearError = (field: keyof typeof fieldErrors) => {
    if (fieldErrors[field]) setFieldErrors((p) => ({ ...p, [field]: undefined }));
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
          <div className="relative hidden lg:flex flex-col justify-between overflow-hidden lg:w-[50%] p-10 text-white">
            {/* Background image + cinematic gradient */}
            <div className="absolute inset-0">
              <img
                src={schoolAssembly}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/85" />
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
                text="Join Your School Community"
                as="h1"
                splitBy="words"
                staggerDelay={0.05}
                duration={0.5}
                once={true}
                className="text-[2.25rem] font-bold tracking-tight text-white leading-[1.15]"
                style={{ fontFamily: 'var(--font-heading)' }}
              />

              <TextReveal
                text="Create your account and stay connected with everything your school has to offer."
                as="p"
                splitBy="words"
                staggerDelay={0.03}
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
              MOBILE IMAGE BANNER
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
                active="register"
                onSwitch={(tab) => {
                  if (tab === 'login') navigate({ to: '/login' });
                }}
              />

              <div className="flex items-center gap-2">
                <LanguageSelector currentLang={i18n.language} onChange={changeLanguage} />
                <AnimatedThemeToggler size="sm" variant="circle" />
              </div>
            </div>

            {/* ── Form Area ── */}
            <div className={`mx-auto my-auto w-full max-w-[360px] py-5 ${shakeForm ? 'animate-shake' : ''}`}>
              {/* Heading */}
              <div className="mb-5 auth-enter auth-enter-d2">
                <h2
                  className="text-[22px] font-bold tracking-tight"
                  style={{ color: 'var(--text-color)', fontFamily: 'var(--font-heading)' }}
                >
                  Create Account
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--secondary-text)' }}>
                  Join the Amarkor Vidyalaya community
                </p>
              </div>

              {registered ? (
                /* ── Success State ── */
                <div className="text-center py-8 auth-enter auth-enter-d3">
                  <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)' }}
                  >
                    <CheckCircle className="h-7 w-7" style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: 'var(--text-color)', fontFamily: 'var(--font-heading)' }}
                  >
                    Registration Submitted!
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--secondary-text)' }}>
                    Your account is currently in <strong style={{ color: 'var(--text-color)' }}>Pending</strong> status for admin review.
                    You will be able to log in once approved.
                  </p>
                  <p className="mt-4 text-[12px] font-semibold" style={{ color: 'var(--primary-color)' }}>
                    Redirecting to Login page in a moment…
                  </p>
                </div>
              ) : (
                /* ── Registration Form ── */
                <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                  <div className="auth-enter auth-enter-d3">
                    <AuthInput
                      id="name"
                      label="Full Name"
                      type="text"
                      value={name}
                      onChange={(v) => { setName(v); clearError('name'); }}
                      autoComplete="name"
                      icon={<User size={15} />}
                      error={fieldErrors.name}
                    />
                  </div>

                  <div className="auth-enter auth-enter-d4">
                    <AuthInput
                      id="email"
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(v) => { setEmail(v); clearError('email'); }}
                      autoComplete="email"
                      icon={<Mail size={15} />}
                      error={fieldErrors.email}
                    />
                  </div>

                  <div className="auth-enter auth-enter-d5">
                    <AuthInput
                      id="password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(v) => { setPassword(v); clearError('password'); }}
                      autoComplete="new-password"
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

                  <div className="auth-enter auth-enter-d6">
                    <AuthInput
                      id="confirmPassword"
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
                      autoComplete="new-password"
                      icon={<Lock size={15} />}
                      error={fieldErrors.confirmPassword}
                      rightSlot={
                        <PasswordToggle
                          visible={showConfirmPassword}
                          onToggle={() => setShowConfirmPassword((s) => !s)}
                        />
                      }
                    />
                  </div>

                  {/* Info notice */}
                  <div
                    className="flex items-start gap-2.5 rounded-xl border p-3 text-[12px] leading-relaxed auth-enter auth-enter-d7"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--primary-color) 6%, var(--input-bg))',
                      borderColor: 'color-mix(in srgb, var(--primary-color) 15%, var(--border-color))',
                      color: 'var(--primary-color)',
                    }}
                  >
                    <Info size={15} className="mt-0.5 shrink-0 opacity-80" />
                    <span>Your account requires admin review before full login access is granted.</span>
                  </div>

                  {/* Submit */}
                  <div className="pt-1 auth-enter auth-enter-d8">
                    <AuthButton loading={loading} loadingText="Registering…">
                      <span>Register Account</span>
                      <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </AuthButton>
                  </div>
                </form>
              )}

              {/* Sign In link */}
              <div className="mt-5 text-center text-[12.5px] auth-enter auth-enter-d8" style={{ color: 'var(--secondary-text)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate({ to: '/login' })}
                  className="font-semibold underline-offset-2 hover:underline"
                  style={{ color: 'var(--primary-color)' }}
                >
                  Sign In
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

export default Register;