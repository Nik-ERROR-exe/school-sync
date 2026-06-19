import { SubstituteAssignment, SubstituteNotification } from '../types';
import { initialSubstituteAssignments, initialNotifications } from '../mockData';
import { TimetableService } from '../../timetable/services';
import { initialSubjects, initialClasses } from '../../results/mockData';
import { TimetableTeacher } from '../../timetable/mockData';

const initializeSubstituteDB = () => {
  if (!localStorage.getItem('substitute_assignments')) {
    localStorage.setItem('substitute_assignments', JSON.stringify(initialSubstituteAssignments));
  }
  if (!localStorage.getItem('substitute_notifications')) {
    localStorage.setItem('substitute_notifications', JSON.stringify(initialNotifications));
  }
};

initializeSubstituteDB();

export const SubstituteService = {
  getAssignments: async (): Promise<SubstituteAssignment[]> => {
    return JSON.parse(localStorage.getItem('substitute_assignments') || '[]');
  },

  getNotifications: async (): Promise<SubstituteNotification[]> => {
    return JSON.parse(localStorage.getItem('substitute_notifications') || '[]');
  },

  markNotificationAsRead: async (notificationId: number): Promise<boolean> => {
    const notifications: SubstituteNotification[] = JSON.parse(localStorage.getItem('substitute_notifications') || '[]');
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index].read = true;
      localStorage.setItem('substitute_notifications', JSON.stringify(notifications));
      return true;
    }
    return false;
  },

  // Core substitution engine: Find teachers who are FREE (not teaching in timetable) in dayOfWeek & periodNumber
  getAvailableTeachers: async (
    classId: number,
    dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday',
    periodNumber: number,
    subjectId: number
  ): Promise<{ teacher: TimetableTeacher; isExpert: boolean; availabilityText: string }[]> => {
    const allTeachers = await TimetableService.getTeachers();
    const timetable = await TimetableService.getTimetable();
    
    // Find who is teaching during this slot
    const busyTeacherIds = timetable
      .filter(s => s.day_of_week === dayOfWeek && s.period_number === periodNumber)
      .map(s => s.teacher_id);

    const available: { teacher: TimetableTeacher; isExpert: boolean; availabilityText: string }[] = [];

    allTeachers.forEach(teacher => {
      // Check if teacher is busy
      const isBusy = busyTeacherIds.includes(teacher.id);
      if (isBusy) return;

      // Check if teacher availability list includes this period
      const availablePeriods = teacher.availability[dayOfWeek] || [];
      const isScheduledAvailable = availablePeriods.includes(periodNumber);
      if (!isScheduledAvailable) return;

      // Check subject expertise
      const isExpert = teacher.subjects.includes(subjectId);
      
      // Determine availability description
      const expertiseList = teacher.subjects.map(sid => {
        const sub = initialSubjects.find(s => s.id === sid);
        return sub ? sub.subject_name : `Subject #${sid}`;
      });

      available.push({
        teacher,
        isExpert,
        availabilityText: `Free, Teaches: ${expertiseList.join(', ')} (Max: ${teacher.max_lectures_per_day} lecs/day)`
      });
    });

    // Sort available teachers: Experts first, then others
    return available.sort((a, b) => {
      if (a.isExpert && !b.isExpert) return -1;
      if (!a.isExpert && b.isExpert) return 1;
      return a.teacher.name.localeCompare(b.teacher.name);
    });
  },

  assignSubstitute: async (
    classId: number,
    dayOfWeek: string,
    periodNumber: number,
    originalTeacherId: number,
    substituteTeacherId: number,
    subjectId: number
  ): Promise<SubstituteAssignment> => {
    const assignments: SubstituteAssignment[] = JSON.parse(localStorage.getItem('substitute_assignments') || '[]');
    const notifications: SubstituteNotification[] = JSON.parse(localStorage.getItem('substitute_notifications') || '[]');
    
    const nextId = assignments.length > 0 ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
    const nextNotifId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
    
    const todayStr = new Date().toISOString().split('T')[0];

    const newAssignment: SubstituteAssignment = {
      id: nextId,
      date: todayStr,
      class_id: classId,
      period_number: periodNumber,
      original_teacher_id: originalTeacherId,
      substitute_teacher_id: substituteTeacherId,
      subject_id: subjectId,
      status: 'notified'
    };

    // Get helper names
    const schoolClass = initialClasses.find(c => c.id === classId);
    const className = schoolClass ? `${schoolClass.class_name}${schoolClass.division}` : `Class #${classId}`;
    const subject = initialSubjects.find(s => s.id === subjectId);
    const subjectName = subject ? subject.subject_name : `Subject #${subjectId}`;

    const newNotification: SubstituteNotification = {
      id: nextNotifId,
      message: `You are assigned Class ${className} Subject ${subjectName} Period ${periodNumber}`,
      timestamp: new Date().toISOString(),
      read: false,
      class_id: classId,
      period_number: periodNumber,
      subject_id: subjectId
    };

    // Save to local storage
    assignments.push(newAssignment);
    notifications.push(newNotification);

    localStorage.setItem('substitute_assignments', JSON.stringify(assignments));
    localStorage.setItem('substitute_notifications', JSON.stringify(notifications));

    return newAssignment;
  }
};
