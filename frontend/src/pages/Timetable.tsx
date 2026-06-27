import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WizardLayout } from '../features/timetable/components/Wizard/WizardLayout';
import TimetableGrid from '../features/timetable/components/View/TimetableGrid';
import TeacherTimetableGrid from '../features/timetable/components/View/TeacherTimetableGrid';
import ConstraintStatusPanel from '../features/timetable/components/View/ConstraintStatusPanel';
import TimetableToolbar from '../features/timetable/components/View/TimetableToolbar';
import { TimetableService } from '../features/timetable/service';
import { TimetableData, TimetableSlot } from '../features/timetable/types';
import { mockTeachers } from '../features/timetable/mock';

export default function Timetable() {
  const [isGenerated, setIsGenerated] = useState(false);
  const [isAdminView, setIsAdminView] = useState(true);

  // In a real app we'd fetch this to see if a timetable already exists for this academic year
  const { data: timetableData, setData: setTimetableData } = useQuery({
    queryKey: ['timetable'],
    queryFn: () => TimetableService.getGeneratedTimetable(),
  }) as any; // Using basic state below for the mock mutation

  const { data: constraintStatuses } = useQuery({
    queryKey: ['constraint-statuses'],
    queryFn: () => TimetableService.getConstraintStatuses(),
    enabled: isGenerated,
  });

  const [localData, setLocalData] = useState<TimetableData | null>(null);

  const handleGenerateComplete = async () => {
    // Generate returns a new mock data object
    const generated = await TimetableService.generateTimetable();
    setLocalData(generated);
    setIsGenerated(true);
  };

  const handleUpdateSlot = (updatedSlot: TimetableSlot) => {
    if (!localData) return;
    const newSlots = localData.slots.map(s => s.id === updatedSlot.id ? updatedSlot : s);
    // If it's a new slot not in list
    if (!localData.slots.find(s => s.id === updatedSlot.id)) {
      newSlots.push(updatedSlot);
    }
    setLocalData({ ...localData, slots: newSlots });
  };

  if (!isGenerated || !localData) {
    return <WizardLayout onGenerateComplete={handleGenerateComplete} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <TimetableToolbar 
        isAdmin={isAdminView} 
        onToggleView={() => setIsAdminView(!isAdminView)} 
      />

      <div className="flex flex-1 overflow-hidden gap-6">
        <div className="flex-1 overflow-hidden">
          {isAdminView ? (
            <TimetableGrid 
              data={localData} 
              onUpdateSlot={handleUpdateSlot} 
            />
          ) : (
            <TeacherTimetableGrid 
              data={localData} 
              teacherId={mockTeachers[0].id} // Default to first teacher for demo
            />
          )}
        </div>
        
        {isAdminView && constraintStatuses && (
          <ConstraintStatusPanel statuses={constraintStatuses} />
        )}
      </div>
    </div>
  );
}
