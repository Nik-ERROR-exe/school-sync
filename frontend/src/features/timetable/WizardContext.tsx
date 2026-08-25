import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface DiagnosticIssue {
  step: number;
  field: string;
  message: string;
  severity: string;
  suggestion: string;
  redirect_step?: number;
  highlight_field?: string;
  class_id?: number;
  subject_id?: number;
  teacher_id?: number;
}

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
  schoolDays: string[];
  periodsPerDay: number;
  saturdayPeriods: number;
  startTime: string;
  endTime: string;
  periodDuration: number;
  lunchPeriod: number | null;

  selectedTeacherIds: number[];
  ptSubjectId: number | null;
  selectedClassId: number | null;
  weeklyRequirements: WeeklyReqEntry[];

  diagnosticIssues: DiagnosticIssue[];

  _teachersCache: ApiTeacher[];
  _subjectsCache: ApiSubject[];
}

export function computePeriodsPerDay(
  startTime: string,
  endTime: string,
  periodDuration: number
): number {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const total = toMinutes(endTime) - toMinutes(startTime);
  if (total <= 0 || periodDuration <= 0) return 8;
  return Math.max(1, Math.floor(total / periodDuration));
}

export function computeMaxRequirements(
  schoolDays: string[],
  periodsPerDay: number,
  lunchPeriod: number | null
): number {
  const totalSlots = schoolDays.length * periodsPerDay;
  const lunchSlots = lunchPeriod !== null ? schoolDays.length : 0;
  return totalSlots - lunchSlots - 1;
}

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
  weeklyRequirements: [],
  diagnosticIssues: [],
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
    setState(prev => {
      const next = { ...prev, ...partial };
      if (partial.startTime || partial.endTime || partial.periodDuration) {
        next.periodsPerDay = computePeriodsPerDay(next.startTime, next.endTime, next.periodDuration);
      }
      return next;
    });
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
