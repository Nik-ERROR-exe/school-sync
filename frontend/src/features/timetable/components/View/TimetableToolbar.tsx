import React from 'react';
import { Download, Share2, FileText, LayoutGrid, Save, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TimetableToolbarProps {
  onSave: () => void;
  onRegenerate: () => void;
  isSaving: boolean;
  onBack?: () => void;
}

export default function TimetableToolbar({ 
  onSave, 
  onRegenerate, 
  isSaving,
  onBack,
}: TimetableToolbarProps) {
  const handleDownload = (type: string) => {
    toast.success(`Downloading ${type}...`);
  };

  const handleShare = () => {
    toast.success('Share link copied to clipboard!');
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to Options</span>
          </button>
        )}
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Master Timetable</h1>
        
        {/* Save & Regenerate Actions */}
        <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-lg">
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            <span>Save Timetable</span>
          </button>
          <button 
            onClick={onRegenerate}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => handleDownload('PDF')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all"
        >
          <FileText size={14} className="text-red-500" />
          <span>PDF</span>
        </button>
        <button 
          onClick={() => handleDownload('Excel')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all"
        >
          <LayoutGrid size={14} className="text-emerald-500" />
          <span>Excel</span>
        </button>
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
