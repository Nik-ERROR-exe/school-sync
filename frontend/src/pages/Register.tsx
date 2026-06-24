import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { GraduationCap, Lock, Mail, User, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../api';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      // Redirect to login after 3 seconds
      setTimeout(() => navigate({ to: '/login' }), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-body">
      <div className="w-full max-w-md space-y-8 bg-white p-8 md:p-10 rounded-2xl border border-slate-200/80 shadow-premium">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-5 font-heading text-2xl font-extrabold tracking-tight text-slate-900">
            Teacher Registration
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            Register to join Amarkor Vidyalaya. Your account will be reviewed by an administrator.
          </p>
        </div>

        {/* Back to Login */}
        <div>
          <button 
            type="button" 
            onClick={() => navigate({ to: '/login' })}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </button>
        </div>

        {/* Registration Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all shadow-sm"
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all shadow-sm"
                placeholder="john.doe@example.com"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Password
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
                placeholder="Min. 6 characters"
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all shadow-sm"
                placeholder="Re-enter your password"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
            <strong>ℹ️ Note:</strong> After registration, your account will be in <strong>Pending</strong> status. 
            An admin must approve it before you can log in.
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-950 py-3.5 px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-2 disabled:opacity-50 shadow-md transition-all duration-200"
          >
            <span>{loading ? 'Submitting...' : 'Register'}</span>
            {!loading && <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
