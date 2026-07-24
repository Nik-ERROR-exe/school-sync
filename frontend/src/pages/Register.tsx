import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { GraduationCap, Lock, Mail, User, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../api';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

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

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4 font-body">
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />
      </div>

      {/* Main Card */}
      <div className={`relative w-full max-w-5xl transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex flex-col lg:flex-row overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-200/50 ring-1 ring-slate-200/50">
          
          {/* Left Panel - Branding */}
          <div className="relative lg:w-5/12 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-10 lg:p-14 flex flex-col justify-between min-h-[300px] lg:min-h-[500px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-xl tracking-tight">Amarkor</h1>
                  <p className="text-blue-300/70 text-[10px] font-medium tracking-widest uppercase">Vidyalaya</p>
                </div>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                Join Our Team
              </h2>
              <p className="mt-3 text-blue-200/80 text-sm max-w-xs leading-relaxed">
                Register to become a teacher at Amarkor Vidyalaya. Your account will be reviewed by an admin.
              </p>

              <div className="mt-8 space-y-3">
                {['✅ Quick Registration', '⏳ Admin Approval Process', '🔐 Secure Access'].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-blue-200/70 text-sm">
                    <span className="text-blue-400">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="relative z-10 text-blue-300/50 text-xs mt-8">
              © 2026 Amarkor Vidyalaya, Bhandup West
            </p>
          </div>

          {/* Right Panel - Registration Form */}
          <div className="flex-1 p-8 lg:p-12">
            <div className="max-w-sm mx-auto">
              {/* Header */}
              <div className="mb-8">
                <button
                  onClick={() => navigate({ to: '/login' })}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
                <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate({ to: '/login' })}
                    className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>

              {/* Success Message */}
              {registered ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Registration Complete!</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Your account is pending admin approval.
                    You will be notified once approved.
                  </p>
                  <p className="text-xs text-slate-400 mt-4">
                    Redirecting to login in a moment...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm"
                        placeholder="john@school.com"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm"
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>ℹ️ Note:</strong> After registration, your account will be in <strong>Pending</strong> status.
                      An admin must approve it before you can log in.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <>
                        Register
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;