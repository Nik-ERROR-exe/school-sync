import React from 'react';
import { Download, Share2, FileText, LayoutGrid } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TimetableToolbarProps {
  isAdmin: boolean;
  onToggleView: () => void;
}

export default function TimetableToolbar({ isAdmin, onToggleView }: TimetableToolbarProps) {
  const handleDownload = (type: string) => {
    toast.success(`Downloading ${type}...`);
  };

  const handleShare = () => {
    toast.success('Share link copied to clipboard!');
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Timetable</h1>
        <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-lg">
          <button 
            onClick={onToggleView}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isAdmin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Admin View
          </button>
          <button 
            onClick={onToggleView}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!isAdmin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Teacher View
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
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
