import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCircle, Mail, Hash, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api';

interface ProfileData {
  id: number;
  teacher_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setProfileData(res.data);
      } catch (error) {
        // Fallback to context user
        if (user) setProfileData(user as ProfileData);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-[#E2E8F0] dark:bg-[#253044] rounded w-1/3" />
        <div className="bg-white dark:bg-[#10151F] rounded-xl border border-[#E2E8F0] dark:border-[#253044] p-8 space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-[#E2E8F0] dark:bg-[#253044]" />
            <div className="space-y-3">
              <div className="h-6 bg-[#E2E8F0] dark:bg-[#253044] rounded w-40" />
              <div className="h-4 bg-[#F8FAFC] dark:bg-[#121A27] rounded w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
          banner: null,
          badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        };
      case 'PENDING':
        return {
          icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
          banner: (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">⏳ Account Pending Approval</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Your account is awaiting admin approval. You will receive full access once approved. 
                  Please contact your school administrator if this takes too long.
                </p>
              </div>
            </div>
          ),
          badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        };
      case 'INACTIVE':
        return {
          icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
          banner: (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">⚠️ Account Deactivated</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  Your account has been deactivated. Please contact an administrator to restore access.
                </p>
              </div>
            </div>
          ),
          badge: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60',
        };
      default:
        return { icon: null, banner: null, badge: 'bg-[#F8FAFC] dark:bg-[#121A27] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#253044]' };
    }
  };

  const statusConfig = getStatusConfig(profileData.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-body">
      <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">My Profile</h1>
      
      {/* Status banner if needed */}
      {statusConfig.banner}

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#10151F] rounded-xl shadow-sm border border-[#E2E8F0] dark:border-[#253044] overflow-hidden">
        {/* Header strip */}
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        
        <div className="p-8">
          {/* Avatar & Name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            <div className="h-24 w-24 bg-[#F8FAFC] dark:bg-[#161D29] rounded-full flex items-center justify-center text-3xl font-bold text-[#1769FF] dark:text-[#3B82F6] border-2 border-[#E2E8F0] dark:border-[#253044] shrink-0">
              {profileData.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{profileData.name}</h2>
              <p className="text-[#64748B] dark:text-[#94A3B8] text-sm mt-1">{profileData.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badge}`}>
                  {profileData.status}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F8FAFC] dark:bg-[#161D29] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#253044]">
                  {profileData.role}
                </span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[#E2E8F0] dark:border-[#253044] pt-6">
            <InfoField
              icon={<Hash className="h-4 w-4" />}
              label="Teacher ID"
              value={profileData.teacher_id || 'Not Assigned (Pending Approval)'}
              highlight={!!profileData.teacher_id}
            />
            <InfoField
              icon={<UserCircle className="h-4 w-4" />}
              label="Full Name"
              value={profileData.name}
            />
            <InfoField
              icon={<Mail className="h-4 w-4" />}
              label="Email Address"
              value={profileData.email}
            />
            <InfoField
              icon={<Shield className="h-4 w-4" />}
              label="Account Role"
              value={profileData.role}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoField: React.FC<{ icon: React.ReactNode; label: string; value: string; highlight?: boolean }> = ({
  icon, label, value, highlight = false
}) => (
  <div>
    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
      {icon}
      <span>{label}</span>
    </div>
    <p className={`text-sm font-medium ${highlight ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800/60 inline-block font-mono' : 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>
      {value}
    </p>
  </div>
);

export default Profile;
