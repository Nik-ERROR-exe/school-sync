import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PromotionService } from '../features/promotion/services';
import { PromotionPreview } from '../features/promotion/types';
import { toast } from 'react-hot-toast';
import {
  ArrowUpCircle,
  ArrowRight,
  GraduationCap,
  Users,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Loader2,
  Calendar,
} from 'lucide-react';

const Promotion: React.FC = () => {
  const { t } = useTranslation();

  const [previews, setPreviews] = useState<PromotionPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await PromotionService.getPromotionPreview();
      setPreviews(data);
    } catch {
      toast.error('Failed to load student promotion data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Counts
  const totalCount = previews.length;
  const graduatingCount = useMemo(
    () => previews.filter((p) => p.action === 'graduate').length,
    [previews]
  );
  const advancingCount = totalCount - graduatingCount;

  // Filtered list for search
  const filteredList = useMemo(() => {
    if (!search.trim()) return previews;
    const q = search.toLowerCase();
    return previews.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.rollNo.toLowerCase().includes(q) ||
        p.currentClassName.toLowerCase().includes(q)
    );
  }, [previews, search]);

  const handlePromote = async () => {
    setIsPromoting(true);
    const toastId = toast.loading('Promoting students...');
    try {
      const success = await PromotionService.promoteStudents(previews);
      if (success) {
        toast.dismiss(toastId);
        toast.success(t('promotion.success_toast') || 'Students successfully promoted!');
        setShowModal(false);
        await loadData();
      } else {
        toast.dismiss(toastId);
        toast.error('Promotion failed. Please try again.');
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('Promotion failed');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-body text-[#0F172A] dark:text-[#F8FAFC]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#253044] pb-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            {t('promotion.title') || 'Student Promotion'}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Promote students to their next standard for the upcoming academic year.
          </p>
        </div>

        {/* Academic Year Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#10151F] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#253044] self-start sm:self-auto shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[#1769FF] dark:text-[#3B82F6]" />
          <span>AY 2026–27 → 2027–28</span>
        </div>
      </div>

      {/* ── Summary Stats (3 Simple Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Students */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <Users className="w-4 h-4 text-[#1769FF] dark:text-[#3B82F6]" />
            <span>Total Students</span>
          </div>
          <p className="mt-2 text-3xl font-heading font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
            {loading ? '...' : totalCount}
          </p>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
            Enrolled across all classes
          </p>
        </div>

        {/* Card 2: Advancing */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Moving to Next Class</span>
          </div>
          <p className="mt-2 text-3xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400">
            {loading ? '...' : advancingCount}
          </p>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
            Standard 1 to 9 students
          </p>
        </div>

        {/* Card 3: Graduating */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Graduating</span>
          </div>
          <p className="mt-2 text-3xl font-heading font-extrabold text-amber-600 dark:text-amber-400">
            {loading ? '...' : graduatingCount}
          </p>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
            Standard 10 students
          </p>
        </div>
      </div>

      {/* ── What Happens Next & Promote Action ── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <h3 className="font-heading font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            Ready to promote students?
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-xl leading-relaxed">
            Students in Standard 1–9 will advance to the next standard (e.g., Standard 1 → Standard 2).
            Standard 10 students will be marked as graduated.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={loading || totalCount === 0}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-heading text-sm font-bold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 shrink-0"
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>Promote Students</span>
        </button>
      </div>

      {/* ── Student Preview Roster ── */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-xs overflow-hidden">
        {/* Search header */}
        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#253044] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-[#161D29]">
          <span className="font-heading font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
            Student Preview List ({filteredList.length})
          </span>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] text-xs outline-none focus:border-[#1769FF] dark:focus:border-[#3B82F6]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#253044] text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider bg-[#F8FAFC]/50 dark:bg-[#161D29]/50">
                <th className="px-5 py-3 w-24">Roll No</th>
                <th className="px-5 py-3">Student Name</th>
                <th className="px-5 py-3">Current Class</th>
                <th className="px-5 py-3 text-center w-16"></th>
                <th className="px-5 py-3">Next Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#253044]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#64748B] dark:text-[#94A3B8]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1769FF] dark:text-[#3B82F6]" />
                    <span>Loading student records...</span>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#64748B] dark:text-[#94A3B8]">
                    No matching students found.
                  </td>
                </tr>
              ) : (
                filteredList.slice(0, 50).map((p, idx) => {
                  const isGrad = p.action === 'graduate';
                  return (
                    <tr
                      key={p.studentId || idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {p.rollNo}
                      </td>
                      <td className="px-5 py-3 font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                        {p.studentName}
                      </td>
                      <td className="px-5 py-3 text-[#64748B] dark:text-[#94A3B8]">
                        Standard {p.currentClassName}{p.currentDivision}
                      </td>
                      <td className="px-5 py-3 text-center text-[#64748B] dark:text-[#94A3B8]">
                        <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {isGrad ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            <GraduationCap className="w-3 h-3" />
                            <span>Graduated</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-[#1769FF] dark:text-[#3B82F6] border border-blue-200 dark:border-blue-800/60 font-mono">
                            Standard {p.nextClassName}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        {filteredList.length > 50 && (
          <div className="p-3 text-center text-xs text-[#64748B] dark:text-[#94A3B8] border-t border-[#E2E8F0] dark:border-[#253044] bg-[#F8FAFC] dark:bg-[#161D29]">
            Showing first 50 of {filteredList.length} students. Use search to find specific students.
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] dark:border-[#253044] bg-white dark:bg-[#10151F] shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1769FF] dark:text-[#3B82F6]">
                  <ArrowUpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
                    Confirm Promotion
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    AY 2026–27 → 2027–28
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation box */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#161D29] border border-[#E2E8F0] dark:border-[#253044] text-xs space-y-2 text-[#64748B] dark:text-[#94A3B8]">
              <p>
                • <strong className="text-emerald-600 dark:text-emerald-400">{advancingCount} students</strong> (Std 1–9) will advance to the next standard.
              </p>
              <p>
                • <strong className="text-amber-600 dark:text-amber-400">{graduatingCount} students</strong> (Std 10) will graduate.
              </p>
              <p className="text-slate-500 dark:text-slate-400 pt-1 text-[11px]">
                Note: This updates all student classes for the new academic year.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isPromoting}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#253044] text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromote}
                disabled={isPromoting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1769FF] hover:bg-[#0F5AE6] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] cursor-pointer disabled:opacity-50"
              >
                {isPromoting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Promoting...</span>
                  </>
                ) : (
                  <span>Confirm Promotion</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promotion;