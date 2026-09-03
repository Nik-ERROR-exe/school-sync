import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PromotionService } from "../features/promotion/services";
import { PromotionPreview } from '../features/promotion/types';
import { toast } from 'react-hot-toast';
import {
  ArrowUpCircle,
  ArrowRight,
  CheckSquare,
  GraduationCap,
  HelpCircle,
  X,
} from 'lucide-react';

import { sortClasses } from '../utils/classSorter';

const Promotion: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [previews, setPreviews] = useState<PromotionPreview[]>([]);

  // Preview / Confirm Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const loadPromotionData = async () => {
    const previewData = await PromotionService.getPromotionPreview();
    setPreviews(previewData);
  };

  useEffect(() => {
    const load = async () => {
      await loadPromotionData();
    };
    load();
  }, []);

  // Students graduating out of Standard 10, across all divisions
  const graduatingCount = previews.filter(p => p.action === 'graduate').length;

  const handlePromoteSubmit = async () => {
    setIsPromoting(true);
    const loadingToast = toast.loading('Promoting cohorts to next standards...');
    try {
      const success = await PromotionService.promoteStudents(previews);
      if (success) {
        toast.dismiss(loadingToast);
        toast.success(t('promotion.success_toast'));
        setShowPreviewModal(false);

        // Reload new state
        await loadPromotionData();
      }
    } catch {
      toast.dismiss(loadingToast);
      toast.error('Student promotion failed');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 font-body">
      {/* Page header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold tracking-wide text-amber-700">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>Academic Year 2026–27 · Year-End</span>
        </div>
        <h1 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Promote Students
        </h1>
      </div>

      {/* Standard 10 graduating count */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-center text-white shadow-premium">
        <div className="mx-auto inline-flex rounded-xl bg-white/15 p-3">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div className="mt-4">
          <span className="text-5xl font-extrabold tracking-tight">{graduatingCount}</span>
          <span className="ml-2 text-sm font-bold text-amber-50">students</span>
        </div>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-50/90">
          Graduating · Standard 10, all divisions
        </p>
      </div>

      {/* Promote action */}
      <button
        onClick={() => setShowPreviewModal(true)}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:shadow-lg"
      >
        <ArrowUpCircle className="h-4.5 w-4.5 transition group-hover:-translate-y-0.5" />
        <span>Promote Students</span>
      </button>

      {/* Promotion Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-secondary px-6 py-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-200" />
                <h3 className="font-heading text-sm font-bold text-white">
                  {t('promotion.preview_title')}
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List Preview */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  <span className="font-bold">Review every movement before confirming.</span> This
                  advances all listed students to their next class and archives Standard 10
                  graduates. Applied in bulk — it cannot be undone.
                </span>
              </div>

              {/* Table - Only Current Class, Movement, Next Class */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-700">
                    <tr>
                      <th className="px-6 py-3">Current Class</th>
                      <th className="px-6 py-3 text-center">Movement</th>
                      <th className="px-6 py-3">Next Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {sortClasses(previews, p => `${p.currentClassName} ${p.currentDivision}`).map(p => (
                      <tr key={p.studentId} className="transition hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">
                          Standard {p.currentClassName}{p.currentDivision}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <ArrowRight className="mx-auto h-3.5 w-3.5 text-slate-400" />
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              p.action === 'graduate'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {p.action === 'graduate' ? '🎓 Graduated' : p.nextClassName}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                {t('common.cancel')}
              </button>

              <button
                onClick={handlePromoteSubmit}
                disabled={isPromoting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
              >
                <CheckSquare className="h-4 w-4" />
                <span>{t('promotion.confirm_promotion')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promotion;