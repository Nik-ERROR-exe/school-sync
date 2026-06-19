import { TimetableSlot, WeeklyRequirement, SubjectMapping } from '../types';
import { initialClasses, initialSubjects } from '../../results/mockData';

// Expand teachers specifically for timetable mapping
export interface TimetableTeacher {
  id: number;
  name: string;
  subjects: number[]; // subjectIds
  max_lectures_per_day: number;
  availability: { [day: string]: number[] }; // Day of week -> available periods
}

export const timetableTeachers: TimetableTeacher[] = [
  {
    id: 2,
    name: 'Rahul Sir',
    subjects: [2], // Maths
    max_lectures_per_day: 5,
    availability: {
      Monday: [1, 2, 3, 4, 5, 6, 7, 8],
      Tuesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Wednesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Thursday: [1, 2, 3, 4, 5, 6, 7, 8],
      Friday: [1, 2, 3, 4, 5, 6, 7, 8],
      Saturday: [1, 2, 3, 4]
    }
  },
  {
    id: 3,
    name: 'Priya Madam',
    subjects: [1], // English
    max_lectures_per_day: 5,
    availability: {
      Monday: [1, 2, 3, 4, 5, 6, 7, 8],
      Tuesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Wednesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Thursday: [1, 2, 3, 4, 5, 6, 7, 8],
      Friday: [1, 2, 3, 4, 5, 6, 7, 8],
      Saturday: [1, 2, 3, 4]
    }
  },
  {
    id: 4,
    name: 'Vikram Sir',
    subjects: [5], // Science
    max_lectures_per_day: 4,
    availability: {
      Monday: [1, 2, 3, 4, 5],
      Tuesday: [1, 2, 3, 4, 5],
      Wednesday: [1, 2, 3, 4, 5],
      Thursday: [1, 2, 3, 4, 5],
      Friday: [1, 2, 3, 4, 5],
      Saturday: [1, 2]
    }
  },
  {
    id: 5,
    name: 'Amit Sir',
    subjects: [3], // Marathi
    max_lectures_per_day: 5,
    availability: {
      Monday: [1, 2, 3, 4, 5, 6, 7, 8],
      Tuesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Wednesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Thursday: [1, 2, 3, 4, 5, 6, 7, 8],
      Friday: [1, 2, 3, 4, 5, 6, 7, 8],
      Saturday: [1, 2, 3, 4]
    }
  },
  {
    id: 6,
    name: 'Kavita Madam',
    subjects: [4], // EVS
    max_lectures_per_day: 4,
    availability: {
      Monday: [1, 2, 3, 4, 5, 6],
      Tuesday: [1, 2, 3, 4, 5, 6],
      Wednesday: [1, 2, 3, 4, 5, 6],
      Thursday: [1, 2, 3, 4, 5, 6],
      Friday: [1, 2, 3, 4, 5, 6],
      Saturday: [1, 2, 3]
    }
  },
  {
    id: 7,
    name: 'Rajesh Sir',
    subjects: [6], // History
    max_lectures_per_day: 4,
    availability: {
      Monday: [2, 3, 4, 5, 6, 7, 8],
      Tuesday: [2, 3, 4, 5, 6, 7, 8],
      Wednesday: [2, 3, 4, 5, 6, 7, 8],
      Thursday: [2, 3, 4, 5, 6, 7, 8],
      Friday: [2, 3, 4, 5, 6, 7, 8],
      Saturday: [3, 4]
    }
  },
  {
    id: 8,
    name: 'Sunita Madam',
    subjects: [7], // Geography
    max_lectures_per_day: 4,
    availability: {
      Monday: [1, 2, 3, 4, 5, 6, 7, 8],
      Tuesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Wednesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Thursday: [1, 2, 3, 4, 5, 6, 7, 8],
      Friday: [1, 2, 3, 4, 5, 6, 7, 8],
      Saturday: [1, 2, 3, 4]
    }
  },
  {
    id: 9,
    name: 'Manoj Sir',
    subjects: [8], // Computer
    max_lectures_per_day: 4,
    availability: {
      Monday: [3, 4, 5, 6, 7, 8],
      Tuesday: [3, 4, 5, 6, 7, 8],
      Wednesday: [3, 4, 5, 6, 7, 8],
      Thursday: [3, 4, 5, 6, 7, 8],
      Friday: [3, 4, 5, 6, 7, 8],
      Saturday: [1, 2]
    }
  },
  {
    id: 10,
    name: 'Kiran Sir',
    subjects: [9], // PT
    max_lectures_per_day: 6,
    availability: {
      Monday: [1, 2, 3, 4, 5, 6, 7, 8],
      Tuesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Wednesday: [1, 2, 3, 4, 5, 6, 7, 8],
      Thursday: [1, 2, 3, 4, 5, 6, 7, 8],
      Friday: [1, 2, 3, 4, 5, 6, 7, 8],
      Saturday: [1, 2, 3, 4]
    }
  }
];

// Generate subject mappings (Rahul Sir -> Maths for 8A, 8B, 9A, etc.)
export const initialSubjectMappings: SubjectMapping[] = [];
let mappingIdCounter = 1;

initialClasses.forEach(schoolClass => {
  const isPrimary = parseInt(schoolClass.class_name, 10) <= 4;
  
  if (isPrimary) {
    // English -> Priya Madam
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 3, subject_id: 1, class_id: schoolClass.id });
    // Maths -> Rahul Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 2, subject_id: 2, class_id: schoolClass.id });
    // Marathi -> Amit Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 5, subject_id: 3, class_id: schoolClass.id });
    // EVS -> Kavita Madam
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 6, subject_id: 4, class_id: schoolClass.id });
    // PT -> Kiran Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 10, subject_id: 9, class_id: schoolClass.id });
  } else {
    // English -> Priya Madam
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 3, subject_id: 1, class_id: schoolClass.id });
    // Maths -> Rahul Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 2, subject_id: 2, class_id: schoolClass.id });
    // Marathi -> Amit Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 5, subject_id: 3, class_id: schoolClass.id });
    // Science -> Vikram Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 4, subject_id: 5, class_id: schoolClass.id });
    // History -> Rajesh Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 7, subject_id: 6, class_id: schoolClass.id });
    // Geography -> Sunita Madam
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 8, subject_id: 7, class_id: schoolClass.id });
    // Computer -> Manoj Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 9, subject_id: 8, class_id: schoolClass.id });
    // PT -> Kiran Sir
    initialSubjectMappings.push({ id: mappingIdCounter++, teacher_id: 10, subject_id: 9, class_id: schoolClass.id });
  }
});

// Generate weekly requirements
export const initialWeeklyRequirements: WeeklyRequirement[] = [];
let reqIdCounter = 1;

initialClasses.forEach(schoolClass => {
  const isPrimary = parseInt(schoolClass.class_name, 10) <= 4;
  if (isPrimary) {
    initialWeeklyRequirements.push(
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 1, periods_per_week: 8 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 2, periods_per_week: 8 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 3, periods_per_week: 6 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 4, periods_per_week: 6 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 9, periods_per_week: 2 } // PT
    );
  } else {
    initialWeeklyRequirements.push(
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 1, periods_per_week: 6 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 2, periods_per_week: 6 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 3, periods_per_week: 5 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 5, periods_per_week: 6 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 6, periods_per_week: 4 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 7, periods_per_week: 4 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 8, periods_per_week: 3 },
      { id: reqIdCounter++, class_id: schoolClass.id, subject_id: 9, periods_per_week: 2 } // PT
    );
  }
});

// Generate a valid base timetable schedule
export const generateBaseTimetable = (): TimetableSlot[] => {
  const slots: TimetableSlot[] = [];
  const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  let idCounter = 1;

  initialClasses.forEach((schoolClass) => {
    const isPrimary = parseInt(schoolClass.class_name, 10) <= 4;
    const mappings = initialSubjectMappings.filter(m => m.class_id === schoolClass.id);
    
    days.forEach(day => {
      const isSat = day === 'Saturday';
      const periodsCount = isSat ? 4 : 8;

      for (let period = 1; period <= periodsCount; period++) {
        // Pick mapping deterministically based on period & class
        let mappingIndex = (period + schoolClass.id) % mappings.length;
        let mapping = mappings[mappingIndex];

        // Ensure PT is not scheduled for more than 2 classes simultaneously.
        // We will schedule PT at period 1 and 2 for class 1 and 2, but keep it constrained.
        if (mapping.subject_id === 9) {
          // If Kiran Sir (PT) has already taught more than 2 classes in this slot, switch to another subject
          const ptCount = slots.filter(s => s.day_of_week === day && s.period_number === period && s.subject_id === 9).length;
          if (ptCount >= 2) {
            // Find a non-PT mapping
            const nonPtMapping = mappings.find(m => m.subject_id !== 9);
            if (nonPtMapping) mapping = nonPtMapping;
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

  // Let's introduce a couple of deliberate conflicts for testing constraints:
  // 1. Teacher Overlap: Teacher Rahul Sir (id: 2) teaching Class 1A (id: 1) and Class 1B (id: 2) on Monday Period 1.
  const mondayP1Slot1A = slots.find(s => s.class_id === 1 && s.day_of_week === 'Monday' && s.period_number === 1);
  const mondayP1Slot1B = slots.find(s => s.class_id === 2 && s.day_of_week === 'Monday' && s.period_number === 1);
  
  if (mondayP1Slot1A && mondayP1Slot1B) {
    mondayP1Slot1A.teacher_id = 2; // Rahul Sir
    mondayP1Slot1A.subject_id = 2; // Maths
    
    mondayP1Slot1B.teacher_id = 2; // Rahul Sir
    mondayP1Slot1B.subject_id = 2; // Maths
  }

  // 2. PT Ground Constraint Overload: Have 3 classes schedule PT on Tuesday Period 3.
  const tuesdayP3Classes = [1, 2, 3];
  tuesdayP3Classes.forEach(cid => {
    const slot = slots.find(s => s.class_id === cid && s.day_of_week === 'Tuesday' && s.period_number === 3);
    if (slot) {
      slot.subject_id = 9; // PT
      slot.teacher_id = 10; // Kiran Sir
    }
  });

  return slots;
};
