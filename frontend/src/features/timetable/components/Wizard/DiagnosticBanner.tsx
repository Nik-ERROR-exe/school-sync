import React from 'react';
import { DiagnosticIssue } from '../../WizardContext';
import { AlertCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface DiagnosticBannerProps {
  issues: DiagnosticIssue[];
  stepNumber: number;
  onFixIssue?: () => void;
}

export default function DiagnosticBanner({ issues, stepNumber, onFixIssue }: DiagnosticBannerProps) {
  const stepIssues = issues.filter(i => i.step === stepNumber);
  if (stepIssues.length === 0) return null;

  const hasErrors = stepIssues.some(i => i.severity === 'error');

  return (
    <div className={`rounded-xl border p-4 mt-4 mb-6 relative z-30 animate-in fade-in slide-in-from-top-3 duration-500 ${
      hasErrors
        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60'
        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        {hasErrors ? (
          <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
        ) : (
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
        )}
        <h4 className={`text-xs font-bold uppercase tracking-wider ${
          hasErrors ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
        }`}>
          {stepIssues.length} Issue{stepIssues.length !== 1 ? 's' : ''} Preventing Timetable Generation
        </h4>
      </div>

      <div className="space-y-2.5">
        {stepIssues.map((issue, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 rounded-lg p-3 ${
              issue.severity === 'error'
                ? 'bg-white/80 dark:bg-[#10151F]/80 border border-red-100 dark:border-red-900/40'
                : 'bg-white/80 dark:bg-[#10151F]/80 border border-amber-100 dark:border-amber-900/40'
            }`}
          >
            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
              issue.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">{issue.message}</p>
              {issue.suggestion && (
                <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-1 flex items-start gap-1">
                  <ArrowRight size={10} className="shrink-0 mt-0.5" />
                  {issue.suggestion}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
        Fix the issue{stepIssues.length !== 1 ? 's' : ''} above, then go back to the Generate step to retry.
      </p>
    </div>
  );
}
