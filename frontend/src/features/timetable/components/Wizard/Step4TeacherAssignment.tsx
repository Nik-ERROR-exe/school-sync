import React, { useState } from 'react';
import api from '../../../../api';
import { useWizard, WizardState } from '../../WizardContext';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ApiSlot } from '../../types';

interface Step4Props {
  onPrev: () => void;
  onGenerateComplete: (schedule: ApiSlot[], wizardState: WizardState) => void;
}

export default function Step4TeacherAssignment({ onPrev, onGenerateComplete }: Step4Props) {
  const { state } = useWizard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    // Guards
    if (!state.ptSubjectId) {
      setError("PT Subject is not selected. Go back to Step 2 and select the PT subject.");
      return;
    }
    if (!state.selectedClassIds || state.selectedClassIds.length === 0) {
      setError("No classes selected. Go back to Step 2 and select classes.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const classesRes = await api.get('/admin/classes/');
      const allClasses = classesRes.data;

      // Pre-flight check: each selected class must have at least one weekly requirement in context
      for (const classId of state.selectedClassIds) {
        const hasReq = state.weeklyRequirements.some(r => r.class_id === classId && r.periods_per_week > 0);
        if (!hasReq) {
          const cls = allClasses.find((c: any) => c.id === classId);
          const className = cls ? `${cls.class_name}-${cls.division}` : `#${classId}`;
          setError(`Class ${className} has no weekly requirements configured. Go back to Step 3.`);
          setIsGenerating(false);
          return;
        }
      }

      const targetClasses = allClasses
        .filter((c: any) => state.selectedClassIds.includes(c.id))
        .map((c: any) => ({
          id: c.id,
          class_name: c.class_name,
          division: c.division
        }));

      const body = {
        school_days: state.schoolDays,
        periods_per_day: state.periodsPerDay,
        lunch_period: state.lunchPeriod,
        pt_subject_id: state.ptSubjectId,
        classes: targetClasses,
      };

      const response = await api.post('/admin/timetable/generate', body);
      
      // Save settings to localStorage upon successful generation
      localStorage.setItem('school_days', JSON.stringify(state.schoolDays));
      localStorage.setItem('periods_per_day', String(state.periodsPerDay));
      localStorage.setItem('saturday_periods', String(state.saturdayPeriods));
      localStorage.setItem('start_time', state.startTime);
      localStorage.setItem('period_duration', String(state.periodDuration));
      localStorage.setItem('lunch_period', state.lunchPeriod !== null ? String(state.lunchPeriod) : '');
      localStorage.setItem('pt_subject_id', state.ptSubjectId !== null ? String(state.ptSubjectId) : '');
      localStorage.setItem('selected_class_ids', JSON.stringify(state.selectedClassIds));

      onGenerateComplete(response.data.schedule, state);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join('; '));
      } else {
        setError('Timetable generation failed. Please go back and adjust your settings.');
      }
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 4: Generate Timetable</h2>
        <p className="text-sm text-slate-500 mt-1">Ready to run the automated scheduler engine.</p>
      </div>

      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 border-8 border-blue-100/50">
          <Sparkles className="text-blue-600" size={32} />
        </div>
        
        <h3 className="text-2xl font-extrabold text-slate-900 mb-3">All Set!</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
          The constraint-satisfaction solver will analyze all configured classes, teachers, and weekly requirements to generate the optimal timetable.
        </p>

        {/* Generation config summary */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.schoolDays.length} days
          </span>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.periodsPerDay} periods/day
          </span>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.selectedClassIds.length} classes selected
          </span>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {state.selectedTeacherIds.length} teachers
          </span>
          {state.lunchPeriod && (
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Lunch: P{state.lunchPeriod}
            </span>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-5 py-4 rounded-xl mb-6 text-left max-w-lg">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Generation Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg shadow-blue-600/20 transition-all ${
            isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'
          }`}
        >
          {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
          {isGenerating ? 'Generating Timetable…' : 'Generate Timetable'}
        </button>

        {isGenerating && (
          <p className="text-xs text-slate-400 mt-4 animate-pulse">
            This may take up to 30 seconds depending on the number of classes and constraints…
          </p>
        )}
      </div>

      <div className="flex justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
        <button 
          onClick={onPrev} 
          disabled={isGenerating}
          className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
        >
          Back
        </button>
      </div>
    </div>
  );
}
