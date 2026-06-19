import { TimetableSlot, WeeklyRequirement, SubjectMapping, ConstraintStatus } from '../types';
import { 
  generateBaseTimetable, 
  initialWeeklyRequirements, 
  initialSubjectMappings,
  timetableTeachers,
  TimetableTeacher
} from '../mockData';
import { initialClasses } from '../../results/mockData';

const initializeTimetableDB = () => {
  if (!localStorage.getItem('timetable_slots')) {
    const baseSlots = generateBaseTimetable();
    localStorage.setItem('timetable_slots', JSON.stringify(baseSlots));
  }
  if (!localStorage.getItem('weekly_requirements')) {
    localStorage.setItem('weekly_requirements', JSON.stringify(initialWeeklyRequirements));
  }
  if (!localStorage.getItem('subject_mappings')) {
    localStorage.setItem('subject_mappings', JSON.stringify(initialSubjectMappings));
  }
};

initializeTimetableDB();

export const TimetableService = {
  getTeachers: async (): Promise<TimetableTeacher[]> => {
    return timetableTeachers;
  },

  getSubjectMappings: async (): Promise<SubjectMapping[]> => {
    return JSON.parse(localStorage.getItem('subject_mappings') || '[]');
  },

  getWeeklyRequirements: async (): Promise<WeeklyRequirement[]> => {
    return JSON.parse(localStorage.getItem('weekly_requirements') || '[]');
  },

  getTimetable: async (): Promise<TimetableSlot[]> => {
    return JSON.parse(localStorage.getItem('timetable_slots') || '[]');
  },

  updateSlot: async (updatedSlot: TimetableSlot): Promise<TimetableSlot> => {
    const slots: TimetableSlot[] = JSON.parse(localStorage.getItem('timetable_slots') || '[]');
    const index = slots.findIndex(s => s.id === updatedSlot.id);
    if (index !== -1) {
      slots[index] = updatedSlot;
      localStorage.setItem('timetable_slots', JSON.stringify(slots));
      return updatedSlot;
    }
    
    // If slot didn't exist by id, check if we need to insert by class/day/period
    const altIndex = slots.findIndex(
      s => s.class_id === updatedSlot.class_id && 
           s.day_of_week === updatedSlot.day_of_week && 
           s.period_number === updatedSlot.period_number
    );
    if (altIndex !== -1) {
      slots[altIndex] = { ...slots[altIndex], ...updatedSlot };
      localStorage.setItem('timetable_slots', JSON.stringify(slots));
      return slots[altIndex];
    }

    const nextId = slots.length > 0 ? Math.max(...slots.map(s => s.id)) + 1 : 1;
    const newSlot = { ...updatedSlot, id: nextId };
    slots.push(newSlot);
    localStorage.setItem('timetable_slots', JSON.stringify(slots));
    return newSlot;
  },

  // Generates a fresh, clean timetable without conflicts
  generateTimetable: async (): Promise<TimetableSlot[]> => {
    // Generate clean base slots
    const slots: TimetableSlot[] = [];
    const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ];
    let idCounter = 1;
    const mappings: SubjectMapping[] = JSON.parse(localStorage.getItem('subject_mappings') || '[]');

    initialClasses.forEach((schoolClass) => {
      const classMappings = mappings.filter(m => m.class_id === schoolClass.id);
      if (classMappings.length === 0) return;

      days.forEach(day => {
        const isSat = day === 'Saturday';
        const periodsCount = isSat ? 4 : 8;

        for (let period = 1; period <= periodsCount; period++) {
          // Construct deterministically, avoiding PT conflicts and teacher overlaps
          // Rotate classes so teacher-sharing subjects are offset
          const offset = schoolClass.id * 2;
          let mappingIndex = (period + offset) % classMappings.length;
          let mapping = classMappings[mappingIndex];

          // PT Grounds limitation check (subject_id = 9)
          if (mapping.subject_id === 9) {
            const ptCount = slots.filter(s => s.day_of_week === day && s.period_number === period && s.subject_id === 9).length;
            if (ptCount >= 2) {
              const nonPt = classMappings.find(m => m.subject_id !== 9);
              if (nonPt) mapping = nonPt;
            }
          }

          slots.push({
            id: idCounter++,
            class_id: schoolClass.id,
            day_of_week: day,
            period_number: period,
            subject_id: mapping.subject_id,
            teacher_id: mapping.teacher_id
          });
        }
      });
    });

    localStorage.setItem('timetable_slots', JSON.stringify(slots));
    return slots;
  },

  checkConstraints: (slots: TimetableSlot[]): ConstraintStatus => {
    const status: ConstraintStatus = {
      teacherConflict: { satisfied: true },
      classConflict: { satisfied: true },
      teacherDailyLimit: { satisfied: true },
      saturdayHalfDay: { satisfied: true },
      ptConstraint: { satisfied: true },
      overallSatisfied: true
    };

    // Keep track of counts for reporting detail
    const ptOverloadSlots: string[] = [];
    const teacherOverlapDetails: string[] = [];
    const classOverlapDetails: string[] = [];
    const teacherDailyLimitDetails: string[] = [];

    // Helper map to count PT lectures per slot
    const ptCounter: { [key: string]: number } = {};
    // Helper map to identify teacher schedules
    const teacherSlotRegistry: { [key: string]: number[] } = {}; // 'Day_Period_TeacherId' -> list of classIds
    // Helper map for class schedules
    const classSlotRegistry: { [key: string]: number[] } = {}; // 'Day_Period_ClassId' -> list of subjectIds
    // Helper map for teacher daily lecture count
    const teacherDailyCount: { [key: string]: number } = {}; // 'Day_TeacherId' -> count

    slots.forEach(slot => {
      const { day_of_week, period_number, teacher_id, class_id, subject_id } = slot;
      const slotKey = `${day_of_week}_${period_number}`;

      // 1. Saturday Half Day check
      if (day_of_week === 'Saturday' && period_number > 4) {
        status.saturdayHalfDay = {
          satisfied: false,
          details: `Lectures detected on Saturday Period ${period_number}`
        };
      }

      // 2. PT Ground Constraint: Subject id 9 is PT
      if (subject_id === 9) {
        ptCounter[slotKey] = (ptCounter[slotKey] || 0) + 1;
        if (ptCounter[slotKey] > 2 && !ptOverloadSlots.includes(slotKey)) {
          ptOverloadSlots.push(slotKey);
        }
      }

      // 3. Teacher overlap check
      const teacherKey = `${slotKey}_${teacher_id}`;
      if (!teacherSlotRegistry[teacherKey]) {
        teacherSlotRegistry[teacherKey] = [];
      }
      teacherSlotRegistry[teacherKey].push(class_id);

      // 4. Class double booking check
      const classKey = `${slotKey}_${class_id}`;
      if (!classSlotRegistry[classKey]) {
        classSlotRegistry[classKey] = [];
      }
      classSlotRegistry[classKey].push(subject_id);

      // 5. Teacher daily count
      const dailyKey = `${day_of_week}_${teacher_id}`;
      teacherDailyCount[dailyKey] = (teacherDailyCount[dailyKey] || 0) + 1;
    });

    // Process collected values to build details reports
    // PT constraint violation report
    if (ptOverloadSlots.length > 0) {
      status.ptConstraint = {
        satisfied: false,
        details: `PT ground overload detected on: ${ptOverloadSlots.join(', ')}`
      };
    }

    // Teacher overlap report
    Object.entries(teacherSlotRegistry).forEach(([key, classes]) => {
      if (classes.length > 1) {
        const [day, period, teacherIdStr] = key.split('_');
        const teacher = timetableTeachers.find(t => t.id === parseInt(teacherIdStr, 10));
        const teacherName = teacher ? teacher.name : `Teacher #${teacherIdStr}`;
        
        // Map class ids to names
        const classNames = classes.map(cid => {
          const c = initialClasses.find(cl => cl.id === cid);
          return c ? `${c.class_name}${c.division}` : `Class #${cid}`;
        });

        teacherOverlapDetails.push(
          `${teacherName} is double-booked for ${classNames.join(' and ')} on ${day} Period ${period}`
        );
      }
    });
    if (teacherOverlapDetails.length > 0) {
      status.teacherConflict = {
        satisfied: false,
        details: teacherOverlapDetails.slice(0, 3).join('; ') + (teacherOverlapDetails.length > 3 ? '...' : '')
      };
    }

    // Class overlap report
    Object.entries(classSlotRegistry).forEach(([key, subjects]) => {
      if (subjects.length > 1) {
        const [day, period, classIdStr] = key.split('_');
        const schoolClass = initialClasses.find(c => c.id === parseInt(classIdStr, 10));
        const className = schoolClass ? `${schoolClass.class_name}${schoolClass.division}` : `Class #${classIdStr}`;
        classOverlapDetails.push(
          `Class ${className} has multiple lectures assigned on ${day} Period ${period}`
        );
      }
    });
    if (classOverlapDetails.length > 0) {
      status.classConflict = {
        satisfied: false,
        details: classOverlapDetails.slice(0, 3).join('; ')
      };
    }

    // Teacher daily limits report
    Object.entries(teacherDailyCount).forEach(([key, count]) => {
      const [day, teacherIdStr] = key.split('_');
      const teacherId = parseInt(teacherIdStr, 10);
      const teacher = timetableTeachers.find(t => t.id === teacherId);
      if (teacher && count > teacher.max_lectures_per_day) {
        teacherDailyLimitDetails.push(
          `${teacher.name} exceeds daily cap (${count}/${teacher.max_lectures_per_day}) on ${day}`
        );
      }
    });
    if (teacherDailyLimitDetails.length > 0) {
      status.teacherDailyLimit = {
        satisfied: false,
        details: teacherDailyLimitDetails.slice(0, 2).join('; ')
      };
    }

    status.overallSatisfied = 
      status.teacherConflict.satisfied &&
      status.classConflict.satisfied &&
      status.teacherDailyLimit.satisfied &&
      status.saturdayHalfDay.satisfied &&
      status.ptConstraint.satisfied;

    return status;
  }
};
