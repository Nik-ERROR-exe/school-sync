import React from 'react';
import { ConstraintStatusItem } from '../../types';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ConstraintStatusPanelProps {
  statuses: ConstraintStatusItem[];
}

export default function ConstraintStatusPanel({ statuses }: ConstraintStatusPanelProps) {
  const allSatisfied = statuses.every(s => s.satisfied);

  return (
    <div className="w-80 flex flex-col bg-white border-l border-slate-200 h-full overflow-hidden shrink-0">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${allSatisfied ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Constraint Status</h3>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-0.5">Live Validation</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {statuses.map(status => (
          <div 
            key={status.id} 
            className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
              status.satisfied 
                ? 'bg-emerald-50/30 border-emerald-100/50 hover:bg-emerald-50/50' 
                : 'bg-red-50/50 border-red-100 hover:bg-red-50'
            }`}
          >
            <div className="pt-0.5">
              {status.satisfied ? (
                <CheckCircle2 className="text-emerald-500" size={16} />
              ) : (
                <AlertTriangle className="text-red-500" size={16} />
              )}
            </div>
            <div className="flex-1">
              <h4 className={`text-xs font-bold leading-none ${status.satisfied ? 'text-emerald-900' : 'text-red-900'}`}>
                {status.name}
              </h4>
              {!status.satisfied && (
                <p className="text-[10px] font-semibold text-red-600 mt-1.5 uppercase tracking-wide">
                  {status.count} Violations Found
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!allSatisfied && (
        <div className="p-4 bg-red-50 border-t border-red-100">
          <p className="text-xs font-semibold text-red-800 text-center">
            Some constraints are violated. Please resolve conflicts or re-generate.
          </p>
        </div>
      )}
    </div>
  );
}
