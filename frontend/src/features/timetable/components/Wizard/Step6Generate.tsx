import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { TimetableService } from '../../service';

export default function Step6Generate({ onPrev, onGenerateComplete }: { onPrev: () => void, onGenerateComplete: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await TimetableService.generateTimetable();
      onGenerateComplete();
    } catch (error) {
      console.error(error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900">Step 6: Generate Timetable</h2>
        <p className="text-sm text-slate-500 mt-1">Ready to run the automated scheduler engine.</p>
      </div>

      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 border-8 border-blue-100/50">
          <Sparkles className="text-blue-600" size={32} />
        </div>
        
        <h3 className="text-2xl font-extrabold text-slate-900 mb-3">All Set!</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
          The system will now analyze all configured classes, teachers, and constraints to generate the optimal timetable.
        </p>

        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg shadow-blue-600/20 transition-all ${
            isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'
          }`}
        >
          {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
          {isGenerating ? 'Generating Timetable...' : 'Generate Timetable'}
        </button>
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
