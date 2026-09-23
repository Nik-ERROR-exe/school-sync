import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Hash,
  ShieldCheck,
  GraduationCap,
  Building2,
  Calendar,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import api from '../../api';

interface ProfileData {
  id: number;
  teacher_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'ACTIVE':
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: 'Active',
        bg: 'rgba(45, 134, 89, 0.10)',
        text: '#2D8659',
        border: 'rgba(45, 134, 89, 0.25)',
        dot: '#2D8659',
      };
    case 'PENDING':
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Pending Approval',
        bg: 'rgba(217, 119, 6, 0.10)',
        text: '#D97706',
        border: 'rgba(217, 119, 6, 0.25)',
        dot: '#D97706',
      };
    case 'INACTIVE':
      return {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Inactive',
        bg: 'rgba(239, 68, 68, 0.10)',
        text: '#EF4444',
        border: 'rgba(239, 68, 68, 0.25)',
        dot: '#EF4444',
      };
    default:
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: status,
        bg: 'rgba(100, 116, 139, 0.10)',
        text: '#64748B',
        border: 'rgba(100, 116, 139, 0.25)',
        dot: '#64748B',
      };
  }
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setProfileData(res.data);
      } catch {
        if (user) {
          setProfileData(user as ProfileData);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-12 animate-pulse">
        <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!profileData) return null;

  const isAdmin = profileData.role === 'ADMIN';
  const statusCfg = getStatusConfig(profileData.status);
  const primaryAccent = isAdmin ? '#4A7BA7' : '#2D8659';

  return (
    <div className="max-w-lg mx-auto py-6 sm:py-10 px-4 font-body animate-fade-in">
      {/* Page Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-heading font-extrabold tracking-tight text-[#1A1F3A] dark:text-white">
          My Profile
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Amarkor Vidyalaya · Academic Year 2026–27
        </p>
      </div>

      {/* ── MINIMAL PROFILE CARD ── */}
      <div className="group relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#10151F] shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
        {/* Subtle Decorative Top Gradient */}
        <div
          className="h-28 w-full relative overflow-hidden flex items-center justify-end px-6"
          style={{
            background: isAdmin
              ? 'linear-gradient(135deg, #1A1F3A 0%, #2B3860 60%, #4A7BA7 100%)'
              : 'linear-gradient(135deg, #1A1F3A 0%, #1F3E32 60%, #2D8659 100%)',
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)] pointer-events-none" />

          {/* Academic Session Chip */}
          <div className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-white/90 bg-white/10 backdrop-blur-md border border-white/20">
            <Calendar className="w-3 h-3 text-white/80" />
            <span>AY 2026–27</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-6 pb-7 sm:px-8 sm:pb-8 pt-0 relative">
          {/* Avatar Section with Expanding Aura */}
          <div className="flex flex-col items-center text-center -mt-14 mb-4">
            <div className="relative group/avatar cursor-default">
              {/* Expanding Aura on Hover */}
              <div
                className="absolute inset-0 -m-2 rounded-full opacity-0 group-hover/avatar:opacity-100 group-hover/avatar:scale-125 blur-md transition-all duration-500 ease-out pointer-events-none"
                style={{
                  background: isAdmin
                    ? 'radial-gradient(circle, rgba(74,123,167,0.4) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(45,134,89,0.4) 0%, transparent 70%)',
                }}
              />

              {/* Main Avatar Bubble */}
              <div
                className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-white dark:border-[#10151F] shadow-lg transition-transform duration-300 group-hover/avatar:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #1A1F3A 0%, #242B4D 100%)',
                }}
              >
                <span className="text-3xl font-extrabold font-heading text-white tracking-tight">
                  {profileData.name.charAt(0).toUpperCase()}
                </span>

                {/* Status Indicator Dot */}
                <div
                  className="absolute bottom-1 right-1 p-0.5 bg-white dark:bg-[#10151F] rounded-full shadow-sm"
                  title={`Status: ${profileData.status}`}
                >
                  <span className="relative flex h-3.5 w-3.5">
                    {profileData.status === 'ACTIVE' && (
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: statusCfg.dot }}
                      />
                    )}
                    <span
                      className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white dark:border-[#10151F]"
                      style={{ backgroundColor: statusCfg.dot }}
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Name & Role Badges */}
            <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-[#1A1F3A] dark:text-white mt-3">
              {profileData.name}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {/* Role Pill */}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  background: isAdmin ? 'rgba(74,123,167,0.12)' : 'rgba(45,134,89,0.12)',
                  color: primaryAccent,
                  border: `1px solid ${isAdmin ? 'rgba(74,123,167,0.25)' : 'rgba(45,134,89,0.25)'}`,
                }}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <GraduationCap className="w-3.5 h-3.5" />
                )}
                <span>{isAdmin ? 'Administrator' : 'Faculty Member'}</span>
              </span>

              {/* Status Pill */}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: statusCfg.bg,
                  color: statusCfg.text,
                  border: `1px solid ${statusCfg.border}`,
                }}
              >
                {statusCfg.icon}
                <span>{statusCfg.label}</span>
              </span>
            </div>
          </div>

          {/* Details List */}
          <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl bg-slate-50/70 dark:bg-[#161D29]/60 border border-slate-200/70 dark:border-slate-800 overflow-hidden">
            {/* Teacher ID Row */}
            <div className="flex items-center justify-between p-3.5 hover:bg-slate-100/50 dark:hover:bg-[#1c2433] transition-colors">
              <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs">
                <Hash className="w-4 h-4 text-slate-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Teacher ID</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  {profileData.teacher_id || 'Not Assigned'}
                </span>
                {profileData.teacher_id && (
                  <button
                    onClick={() => handleCopy(profileData.teacher_id || '', 'id')}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Copy Teacher ID"
                  >
                    {copiedKey === 'id' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Email Row */}
            <div className="flex items-center justify-between p-3.5 hover:bg-slate-100/50 dark:hover:bg-[#1c2433] transition-colors">
              <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Email</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-[220px]">
                  {profileData.email}
                </span>
                <button
                  onClick={() => handleCopy(profileData.email, 'email')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Copy Email"
                >
                  {copiedKey === 'email' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Institution Row */}
            <div className="flex items-center justify-between p-3.5 hover:bg-slate-100/50 dark:hover:bg-[#1c2433] transition-colors">
              <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">School</span>
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Amarkor Vidyalaya, Bhandup West
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
