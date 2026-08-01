import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PromotionService } from '../features/promotion/services';
import { PromotionPreview } from '../features/promotion/types';
import { toast } from 'react-hot-toast';
import {
  ArrowUpCircle,
  ArrowUpRight,
  ArrowRight,
  CheckSquare,
  GraduationCap,
  HelpCircle,
  Inbox,
  Layers,
  ShieldCheck,
  X,
} from 'lucide-react';

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

  // Group previews by current class to show neat cohort counts
  const getCohortSummary = () => {
    const summary: { [className: string]: { promote: number, graduate: number } } = {};
    previews.forEach(p => {
      if (!summary[p.currentClassName]) {
        summary[p.currentClassName] = { promote: 0, graduate: 0 };
      }
      if (p.action === 'promote') {
        summary[p.currentClassName].promote++;
      } else {
        summary[p.currentClassName].graduate++;
      }
    });
    return summary;
  };

  const cohorts = getCohortSummary();
  const totalStudents = previews.length;
  const ladder = Array.from({ length: 10 }, (_, i) => i + 1);

  const moveNotes = [
    { icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', label: 'Standards 1–9 advance a grade' },
    { icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', label: 'Standard 10 graduates & archives' },
    { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', label: 'Subject rules & timetables stay fixed' },
  ];

  return (
    <div className="space-y-6 font-body">
      {/* Hero — the promotion action, front and center */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent px-6 py-8 text-white shadow-premium border border-slate-800 sm:px-10 sm:py-10">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="absolute right-0 top-0 -mr-4 -mt-4 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 -mb-10 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/30 px-3 py-1 text-[11px] font-bold tracking-wide text-blue-100">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Academic Year 2026–27 · Year-End</span>
            </div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
              Promote Students to the Next Standard
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-blue-100/90">
              Standards 1–9 advance a grade. Standard 10 graduates and is archived. Review the
              movement below, then apply it in one step.
            </p>
          </div>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-lg transition hover:bg-slate-50 hover:shadow-xl"
          >
            <ArrowUpCircle className="h-4.5 w-4.5 text-blue-600 transition group-hover:-translate-y-0.5" />
            <span>Review &amp; Promote</span>
          </button>
        </div>
      </div>

      {/* What moves — compact, scannable */}
      <div className="flex flex-wrap gap-2.5">
        {moveNotes.map(note => (
          <div
            key={note.label}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 ${note.bg}`}
          >
            <note.icon className={`h-3.5 w-3.5 ${note.color}`} />
            <span>{note.label}</span>
          </div>
        ))}
      </div>

      {/* Cohort Movement */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 text-white shadow-sm">
            <Layers className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-base font-bold text-slate-900">Cohort Movement</h3>
          {totalStudents > 0 && (
            <span className="ml-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
              {totalStudents} students
            </span>
          )}
          <div className="hidden flex-1 border-t border-slate-200/80 sm:block" />
        </div>

        {/* Academic ladder — filled = a standard has students moving */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {ladder.map(n => {
            const info = cohorts[String(n)];
            const has = !!info;
            const isGraduate = n === 10;
            return (
              <div key={n} className="flex shrink-0 items-center gap-1.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-extrabold shadow-sm transition ${
                    has
                      ? isGraduate
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-400'
                  }`}
                  title={has ? `Standard ${n} has students moving` : `No students in Standard ${n}`}
                >
                  {isGraduate ? <GraduationCap className="h-4.5 w-4.5" /> : n}
                </div>
                {n < 10 && <ArrowRight className="h-3 w-3 text-slate-300" />}
              </div>
            );
          })}
        </div>

        {/* Cohort tiles */}
        {previews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-400">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="mt-3 font-heading text-sm font-bold text-slate-800">
              No students to promote right now
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Once the new academic year opens, the movement for every cohort will appear here for
              review.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(cohorts).map(([cName, info]) => {
                const total = info.promote + info.graduate;
                const graduates = info.graduate > 0;
                return (
                  <div
                    key={cName}
                    className={`rounded-xl p-5 text-white shadow-lg ${
                      graduates
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                          Standard {cName}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold tracking-tight">{total}</span>
                          <span className="text-xs font-semibold opacity-80">students</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/15 p-2">
                        {graduates ? (
                          <GraduationCap className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
                      <span className="text-xs font-bold">
                        {graduates
                          ? 'Graduates & exits'
                          : `Moves to Class ${Number(cName) + 1}`}
                      </span>
                      {info.promote > 0 && info.graduate > 0 && (
                        <span className="text-[10px] font-semibold opacity-80">
                          {info.graduate} graduate
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:shadow-lg"
              >
                <ArrowUpCircle className="h-4 w-4 transition group-hover:-translate-y-0.5" />
                <span>Review &amp; Promote</span>
              </button>
            </div>
          </>
        )}
      </div>

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
                    {previews.map(p => (
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
