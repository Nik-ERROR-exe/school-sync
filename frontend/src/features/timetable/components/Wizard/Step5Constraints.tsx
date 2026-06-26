import React, { useState } from 'react';
import { mockConstraints } from '../../mock';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Step5Constraints({ onNext, onPrev }: { onNext: () => void, onPrev: () => void }) {
  const [constraints, setConstraints] = useState(mockConstraints);

  const toggleConstraint = (id: string) => {
    setConstraints(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 5: Constraints</h2>
        <p className="text-sm text-slate-500 mt-1">Configure the rules for the automated scheduling engine.</p>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {constraints.map(constraint => (
          <div 
            key={constraint.id} 
            className={`relative p-5 rounded-xl border transition-all duration-300 flex items-start gap-4 ${
              constraint.enabled 
                ? 'bg-blue-50/30 border-blue-200 shadow-sm' 
                : 'bg-slate-50 border-slate-200 opacity-75'
            }`}
          >
            <div className="pt-1">
              {constraint.enabled ? (
                <CheckCircle2 className="text-blue-600" size={20} />
              ) : (
                <XCircle className="text-slate-400" size={20} />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-bold ${constraint.enabled ? 'text-blue-950' : 'text-slate-700'}`}>
                {constraint.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed pr-8">
                {constraint.description}
              </p>
              
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                  constraint.enabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {constraint.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="absolute right-5 top-5">
              <button 
                onClick={() => toggleConstraint(constraint.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  constraint.enabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span 
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    constraint.enabled ? 'translate-x-5' : 'translate-x-1'
                  }`} 
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
        <button onClick={onPrev} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
          Back
        </button>
        <button onClick={onNext} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow">
          Save & Continue
        </button>
      </div>
    </div>
  );
}
