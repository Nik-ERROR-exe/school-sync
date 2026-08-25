import React from 'react';
import { AlertTriangle, AlertCircle, X, Check, ShieldAlert } from 'lucide-react';
import { ConflictDetail } from '../../utils/conflictChecker';
import { ApiSlot } from '../../types';

interface OverwriteWarningModalProps {
  isOpen: boolean;
  conflicts: ConflictDetail[];
  slot: ApiSlot;
  subjectName: string;
  teacherName: string;
  className: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function OverwriteWarningModal({
  isOpen,
  conflicts,
  slot,
  subjectName,
  teacherName,
  className,
  onConfirm,
  onCancel,
}: OverwriteWarningModalProps) {
  if (!isOpen || conflicts.length === 0) return null;

  const hasError = conflicts.some(c => c.severity === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-amber-100 bg-amber-50/80 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <ShieldAlert size={26} className="text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
              Manual Overwrite Warning
            </h3>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Constraint violations detected for this slot edit.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-amber-100/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Slot Context Info */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium gap-2">
          <span>
            Target: <strong className="text-slate-900">{className}</strong>
          </span>
          <span>
            {slot.day_of_week} • Period {slot.period_number}
          </span>
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
            {subjectName} ({teacherName})
          </span>
        </div>

        {/* Conflicts List */}
        <div className="p-6 space-y-3.5 max-h-[50vh] overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Why this manual overwrite creates a conflict:
          </p>

          {conflicts.map((conflict, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                conflict.severity === 'error'
                  ? 'bg-red-50/70 border-red-200 text-red-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              {conflict.severity === 'error' ? (
                <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-1">
                  {conflict.title}
                </h4>
                <p className="text-xs leading-relaxed">{conflict.message}</p>
              </div>
            </div>
          ))}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed mt-2">
            <span className="font-bold text-slate-800 block mb-0.5">Note on Overwrites:</span>
            Overwriting will force this assignment into the timetable. The solver checks these rules automatically during generation to prevent teacher clashes.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Cancel & Re-edit
          </button>

          <button
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
              hasError
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            }`}
          >
            <Check size={16} />
            Confirm Overwrite
          </button>
        </div>
      </div>
    </div>
  );
}
