import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PromotionService } from '../features/promotion/services';
import { PromotionPreview } from '../features/promotion/types';
import { ResultsService } from '../features/results/services';
import { SchoolClass } from '../features/results/types';
import { toast } from 'react-hot-toast';
import { 
  ArrowUpCircle, 
  HelpCircle, 
  CheckSquare, 
  Plus, 
  Trash2, 
  ArrowRight,
  GraduationCap,
  Sparkles,
  X
} from 'lucide-react';

const Promotion: React.FC = () => {
  const { t } = useTranslation();
  
  // State
  const [previews, setPreviews] = useState<PromotionPreview[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  
  // Preview / Confirm Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  // New admission states
  const [newStudentName, setNewStudentName] = useState('');
  const [newRollNo, setNewRollNo] = useState('');
  const [newDivision, setNewDivision] = useState<'A' | 'B'>('A');

  const loadPromotionData = async () => {
    const previewData = await PromotionService.getPromotionPreview();
    const classData = await ResultsService.getClasses();
    setPreviews(previewData);
    setClasses(classData);
  };

  useEffect(() => {
    loadPromotionData();
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
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error('Student promotion failed');
    } finally {
      setIsPromoting(false);
    }
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newRollNo) {
      toast.error('Please enter Student Name and Roll No');
      return;
    }

    try {
      const student = await PromotionService.admitFirstStandardStudents(
        newStudentName,
        newRollNo,
        newDivision
      );
      if (student) {
        toast.success(`Successfully admitted ${newStudentName} to Class 1${newDivision}!`);
        setNewStudentName('');
        setNewRollNo('');
        
        // Reload lists
        await loadPromotionData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Admission failed');
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

  return (
    <div className="space-y-8 font-body">
      
      {/* Promotion Controls Block */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-accent" />
              <span>Academic Year-End Promotion</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
              Bulk promotion of student cohorts to next standard
            </p>
          </div>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 px-4.5 py-2.5 text-xs font-bold text-white shadow-sm transition self-start"
          >
            <ArrowUpCircle className="h-4.5 w-4.5 text-accent" />
            <span>{t('promotion.promote_btn')}</span>
          </button>
        </div>

        {/* Informative alert banner */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-150/60 text-xs text-slate-600 leading-relaxed mb-6">
          <span className="font-bold text-slate-900 block mb-1">How Promotion Works:</span>
          <ul className="list-disc list-inside space-y-1">
            <li>Standard <strong className="text-slate-900">1 to 9</strong> students are promoted to the next grade (e.g. 1A → 2A, 8B → 9B).</li>
            <li>Standard <strong className="text-slate-900">10</strong> students graduate and are removed from active schedules.</li>
            <li>Subject criteria, class rules, and timetables remain <strong className="text-slate-900">fixed</strong>. Only student associations move.</li>
            <li>Use the admissions form below to enroll new Standard 1 admissions into standard registry database.</li>
          </ul>
        </div>

        {/* Cohorts summary list */}
        <h4 className="font-heading text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Current Student Registry Status
        </h4>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {Object.entries(cohorts).map(([cName, info]) => (
            <div key={cName} className="rounded-xl border border-slate-150 p-4 bg-white shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Standard {cName}</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">
                  {info.promote + info.graduate}
                </span>
                <span className="text-xs text-slate-500 font-semibold">students</span>
              </div>
              <span className="mt-2 block text-[10px] text-slate-500 font-medium">
                {info.graduate > 0 ? 'Will Graduate & Exit' : `Will promote to Class ${Number(cName) + 1}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* New Admissions registry */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            <span>{t('promotion.new_admissions')}</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
            Admit new students into 1st standard registry
          </p>
        </div>

        <form onSubmit={handleAdmit} className="grid gap-4 md:grid-cols-4 items-end max-w-5xl">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Student Name</label>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="e.g. Atharva Kulkarni"
              className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Roll No</label>
            <input
              type="text"
              value={newRollNo}
              onChange={(e) => setNewRollNo(e.target.value)}
              placeholder="e.g. 106"
              className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Division Allocation</label>
            <select
              value={newDivision}
              onChange={(e) => setNewDivision(e.target.value as any)}
              className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-sm"
              required
            >
              <option value="A">Division A</option>
              <option value="B">Division B</option>
            </select>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 py-3 px-4 text-xs font-bold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Admit Student</span>
          </button>
        </form>
      </div>

      {/* Promotion Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-premium border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5.5 w-5.5 text-accent" />
                <h3 className="font-heading text-sm font-bold text-slate-950">
                  {t('promotion.preview_title')}
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List Preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
                <HelpCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Please review student movements carefully:</span>
                  <span>Confirming this will move all active students to their next class and archive standard 10 graduates. This action is bulk applied and cannot be undone directly.</span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Roll No</th>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">{t('promotion.current_class')}</th>
                      <th className="px-6 py-3 text-center">Movement</th>
                      <th className="px-6 py-3">{t('promotion.next_class')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {previews.map(p => (
                      <tr key={p.studentId} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-bold text-slate-400">{p.rollNo}</td>
                        <td className="px-6 py-3 font-bold text-slate-900">{p.studentName}</td>
                        <td className="px-6 py-3">Standard {p.currentClassName}{p.currentDivision}</td>
                        <td className="px-6 py-3 text-center">
                          <ArrowRight className="h-3.5 w-3.5 mx-auto text-slate-400" />
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            p.action === 'graduate' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {p.action === 'graduate' ? t('promotion.graduated') : p.nextClassName}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              
              <button
                onClick={handlePromoteSubmit}
                disabled={isPromoting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-950 px-4.5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                <CheckSquare className="h-4.5 w-4.5" />
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
