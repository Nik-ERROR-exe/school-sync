// src/pages/Register.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AnimatedThemeToggler } from '../components/ui/AnimatedThemeToggler';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sun, Moon, ShieldCheck, Sparkles, BookOpen, GraduationCap, Award, Info, CheckCircle } from 'lucide-react';
import api from '../api';
import schoolLogo from '../assets/school_logo.png';
import schoolIllustration from '../assets/school_illustration.png';

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  isDark: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  id, label, type, value, onChange, autoComplete,
  icon, rightSlot, isDark,
}) => {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className="relative group transition-all duration-200">
      {/* Focus Glow Ring */}
      <span
        className={`pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 ${
          focused ? 'opacity-100' : ''
        }`}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(147,51,234,0.4))'
            : 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(30,64,175,0.25))',
          filter: 'blur(6px)',
        }}
      />

      <div
        className="relative rounded-xl border-[1.5px] transition-all duration-200"
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
          borderColor: focused
            ? '#3B82F6'
            : isDark
            ? 'rgba(255, 255, 255, 0.12)'
            : '#E2E8F0',
          boxShadow: focused
            ? isDark
              ? '0 0 0 3px rgba(59,130,246,0.25)'
              : '0 0 0 3px rgba(59,130,246,0.12)'
            : 'none',
        }}
      >
        {/* Left Icon */}
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
          style={{ color: focused ? '#3B82F6' : isDark ? '#94A3B8' : '#64748B' }}
        >
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
          className="peer block w-full rounded-xl bg-transparent pb-2.5 pl-10 pr-11 pt-5 text-sm outline-none transition-colors"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: isDark ? '#F8FAFC' : '#0F172A',
          }}
        />

        {/* Floating Label */}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-10 select-none transition-all duration-200"
          style={{
            fontFamily: "'Inter', sans-serif",
            ...(floated
              ? {
                  top: '6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  color: '#3B82F6',
                }
              : {
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '13.5px',
                  fontWeight: 400,
                  color: isDark ? '#94A3B8' : '#64748B',
                }),
          }}
        >
          {label}
        </label>

        {/* Right Slot (Eye Icon etc.) */}
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
};

const Register: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      toast.success(res.data.message || 'Registration successful! Awaiting admin approval.');
      setRegistered(true);
      setTimeout(() => navigate({ to: '/login' }), 4000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed. Please try again.');
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
      className="relative flex min-h-screen items-center justify-center p-3 md:p-6 lg:p-10 transition-colors duration-300"
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundColor: isDark ? '#020617' : '#F1F5F9',
      }}
    >
      {/* Background Subtle Gradient Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-30 blur-3xl transition-colors duration-500"
          style={{ background: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.15)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl transition-colors duration-500"
          style={{ background: isDark ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.12)' }}
        />
      </div>

      {/* Main Split Container */}
      <div
        className="relative z-10 w-full max-w-6xl overflow-hidden rounded-3xl transition-all duration-300"
        style={{
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(59, 130, 246, 0.15)'
            : '0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 25px rgba(15, 23, 42, 0.05)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        <div className="flex flex-col lg:flex-row min-h-[640px]">

          {/* ══════════════════════════════════════════════════════
              LEFT PANEL — Branding & School Welcome (60% Width)
          ══════════════════════════════════════════════════════ */}
          <div
            className="relative lg:w-[58%] flex flex-col justify-between p-8 lg:p-12 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0B132B 100%)',
            }}
          >
            {/* Soft Ambient Overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 10% 20%, rgba(201,168,76,0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(59,130,246,0.2) 0%, transparent 50%)',
              }}
            />

            {/* Gold Top Accent Border */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: 'linear-gradient(90deg, #C9A84C 0%, #3B82F6 50%, #C9A84C 100%)',
              }}
            />

            {/* TOP HEADER — Official School Emblem Logo */}
            <div className="relative z-10 flex items-center gap-4">
              <div
                className="relative flex items-center justify-center p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg"
                style={{ width: '64px', height: '64px' }}
              >
                <img
                  src={schoolLogo}
                  alt="Amarkor Vidyalaya Emblem"
                  className="h-full w-full object-contain drop-shadow-md"
                />
              </div>
              <div>
                <h1
                  className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Amarkor Vidyalaya
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[11px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(201, 168, 76, 0.2)', color: '#FACC15', border: '1px solid rgba(201, 168, 76, 0.4)' }}
                  >
                    Bhandup West
                  </span>
                  <span className="text-xs text-blue-200/70 font-medium">Faculty & Teacher Registration</span>
                </div>
              </div>
            </div>

            {/* CENTER CONTENT — Main Heading & Visual Illustration */}
            <div className="relative z-10 my-auto py-6 text-center flex flex-col items-center">
              {/* Heading */}
              <div className="max-w-md">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-400/20 mb-3">
                  <Sparkles size={13} className="text-amber-400" /> Join Our Academic Community
                </span>
                <h2
                  className="text-3xl lg:text-4xl font-extrabold leading-tight text-white mb-3"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Create Account <br />
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                    Amarkor Vidyalaya
                  </span>
                </h2>
                <p className="text-sm text-blue-100/80 leading-relaxed max-w-sm mx-auto">
                  Register to become a faculty member at Amarkor Vidyalaya. Your profile will be verified by administration.
                </p>
              </div>

              {/* MAIN IMAGE */}
              <div className="relative mt-6 w-full max-w-sm flex items-center justify-center">
                {/* Floating Glass Badges */}
                <div className="absolute -top-3 left-2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/15 text-xs text-white shadow-xl animate-bounce" style={{ animationDuration: '4s' }}>
                  <GraduationCap size={16} className="text-amber-400" />
                  <span className="font-semibold text-[11px]">Teacher Portal</span>
                </div>

                <div className="absolute -bottom-2 right-2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-900/80 backdrop-blur-md border border-white/15 text-xs text-white shadow-xl">
                  <Award size={16} className="text-blue-400" />
                  <span className="font-semibold text-[11px]">Easy Onboarding</span>
                </div>

                {/* Illustration Image */}
                <div className="relative p-2 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl">
                  <img
                    src={schoolIllustration}
                    alt="School Learning Illustration"
                    className="w-64 lg:w-72 h-auto object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>

              {/* Feature Badges */}
              <div className="flex flex-wrap justify-center gap-3 mt-5">
                {[
                  { icon: <BookOpen size={14} className="text-amber-400" />, text: 'Quick Registration' },
                  { icon: <ShieldCheck size={14} className="text-blue-400" />, text: 'Admin Verification' },
                  { icon: <Sparkles size={14} className="text-emerald-400" />, text: 'Secure Access' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-blue-100/90 font-medium"
                  >
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FOOTER — School Location & Copyright */}
            <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/60 pt-4 border-t border-white/10">
              <p>© 2026 Amarkor Vidyalaya. All rights reserved.</p>
              <p className="font-medium text-amber-300/80">प्रयत्नांती यश: प्राप्ती</p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              RIGHT PANEL — Interactive Form Card (42% Width)
          ══════════════════════════════════════════════════════ */}
          <div
            className="lg:w-[42%] flex flex-col justify-between p-8 lg:p-12 transition-colors duration-300"
            style={{
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            }}
          >
            {/* Top Toolbar: Auth Switcher + Theme Toggle */}
            <div className="flex items-center justify-between mb-4">
              {/* Login / Register Toggle Tabs */}
              <div
                className="flex p-1 rounded-xl"
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#F1F5F9',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate({ to: '/login' })}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200"
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#3B82F6' : '#1E3A8A',
                    color: '#FFFFFF',
                  }}
                >
                  Register
                </button>
              </div>

              {/* Animated Theme Toggle Component */}
              <AnimatedThemeToggler variant="circle" duration={500} />
            </div>

            {/* Main Form Content */}
            <div className="w-full max-w-sm mx-auto my-auto">

              {/* Header with Official School Emblem Badge */}
              <div className="flex items-center gap-3 mb-5">
                <img
                  src={schoolLogo}
                  alt="Amarkor Vidyalaya Emblem"
                  className="h-11 w-auto object-contain p-1 rounded-xl border"
                  style={{
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0',
                    backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : '#F8FAFC',
                  }}
                />
                <div>
                  <h2
                    className="text-2xl font-extrabold tracking-tight"
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    }}
                  >
                    Create Account
                  </h2>
                  <p
                    className="text-xs"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  >
                    Join the Amarkor Vidyalaya faculty
                  </p>
                </div>
              </div>

              {/* Success View or Form */}
              {registered ? (
                <div className="text-center py-6">
                  <div
                    className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DEF7EC' }}
                  >
                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3
                    className="text-lg font-bold"
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    }}
                  >
                    Registration Submitted!
                  </h3>
                  <p className="text-xs mt-2" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Your account is currently in <strong>Pending</strong> status for admin review. You will be able to log in once approved.
                  </p>
                  <p className="text-[11px] text-blue-400 mt-4 font-medium">
                    Redirecting to Login page in a moment...
                  </p>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} noValidate className="space-y-3">

                  {/* Full Name */}
                  <InputField
                    id="name"
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                    icon={<User size={16} />}
                    isDark={isDark}
                  />

                  {/* Email */}
                  <InputField
                    id="email"
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    icon={<Mail size={16} />}
                    isDark={isDark}
                  />

                  {/* Password */}
                  <InputField
                    id="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    icon={<Lock size={16} />}
                    isDark={isDark}
                    rightSlot={
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(s => !s)}
                        className="transition-colors duration-200"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  {/* Confirm Password */}
                  <InputField
                    id="confirmPassword"
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    icon={<Lock size={16} />}
                    isDark={isDark}
                    rightSlot={
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowConfirmPassword(s => !s)}
                        className="transition-colors duration-200"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  {/* Info Notice */}
                  <div
                    className="rounded-xl border p-2.5 flex items-start gap-2 text-xs"
                    style={{
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                      color: isDark ? '#FCD34D' : '#92400E',
                    }}
                  >
                    <Info size={15} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>Accounts require administrator review before full login access is granted.</span>
                  </div>

                  {/* Action Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full overflow-hidden py-3.5 px-6 text-sm font-bold text-white transition-all duration-300 shadow-lg"
                      style={{
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                        boxShadow: isDark
                          ? '0 10px 25px -5px rgba(59, 130, 246, 0.4)'
                          : '0 10px 25px -5px rgba(30, 58, 138, 0.3)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.75 : 1,
                      }}
                      onMouseEnter={e => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Registering…</span>
                          </>
                        ) : (
                          <>
                            <span>Register Account</span>
                            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* Bottom Toggle Text */}
              <div className="mt-5 text-center text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate({ to: '/login' })}
                  className="font-bold underline-offset-2 hover:underline"
                  style={{ color: '#3B82F6' }}
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Language Selector Footer */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
              <span className="text-[11px]" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                Amarkor Vidyalaya Management
              </span>
              <div className="flex items-center gap-1 rounded-lg p-0.5 border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : '#F8FAFC' }}>
                {(['en', 'mr'] as const).map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => changeLanguage(code)}
                    className="px-2.5 py-0.5 text-[10px] font-bold rounded transition-all"
                    style={{
                      backgroundColor: i18n.language === code ? (isDark ? '#3B82F6' : '#1E3A8A') : 'transparent',
                      color: i18n.language === code ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
                    }}
                  >
                    {code === 'en' ? 'EN' : 'मर'}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;