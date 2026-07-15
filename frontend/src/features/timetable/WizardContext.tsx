import React, { createContext, useContext, useState, useCallback } from 'react';

export interface WeeklyReqEntry {
  id?: number;
  class_id: number;
  subject_id: number;
  periods_per_week: number;
  subject_name?: string | null;
  class_name?: string | null;
  division?: string | null;
}

export interface WizardState {
  // From Step 1 (School Settings)
  schoolDays: string[];
  periodsPerDay: number;
  saturdayPeriods: number;
  startTime: string;
  endTime: string;
  periodDuration: number;
  lunchPeriod: number | null;

  // From Step 2 (Select Teachers)
  selectedTeacherIds: number[];

  // For generation
  ptSubjectId: number | null;
  selectedClassId: number | null; // null means 'All Classes'
  selectedClassIds: number[];
  weeklyRequirements: WeeklyReqEntry[];

  // Cached data fetched in Step 2 (shared with Step 3 Review)
  _teachersCache: ApiTeacher[];
  _subjectsCache: ApiSubject[];
}

export function computeMaxRequirements(
  schoolDays: string[],
  periodsPerDay: number,
  lunchPeriod: number | null
): number {
  const totalSlots = schoolDays.length * periodsPerDay;
  const lunchSlots = lunchPeriod !== null ? schoolDays.length : 0;
  return totalSlots - lunchSlots - 1; // -1 reserves 1 free period
}

/** Shape of a teacher returned by GET /admin/teachers/ */
export interface ApiTeacher {
  id: number;
  teacher_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  max_lectures_per_day: number;
  subject_expertise: number[];
  subjects?: ApiSubject[];
}

/** Shape of a subject returned by GET /admin/subjects/ */
export interface ApiSubject {
  id: number;
  subject_name: string;
  code: string;
}

const defaultState: WizardState = {
  schoolDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  periodsPerDay: 8,
  saturdayPeriods: 4,
  startTime: '08:00',
  endTime: '14:30',
  periodDuration: 40,
  lunchPeriod: 4,
  selectedTeacherIds: [],
  ptSubjectId: null,
  selectedClassId: null,
  selectedClassIds: [],
  weeklyRequirements: [],
  _teachersCache: [],
  _subjectsCache: [],
};

interface WizardContextValue {
  state: WizardState;
  updateState: (partial: Partial<WizardState>) => void;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export const WizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WizardState>(defaultState);

  const updateState = useCallback((partial: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <WizardContext.Provider value={{ state, updateState }}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = (): WizardContextValue => {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard must be used inside <WizardProvider>');
  }
  return ctx;
};
