from app.models.teacher import Teacher
from app.models.student import Student
from app.models.school_class import SchoolClass, class_subjects
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.timetable import TimetableSlot
from app.models.result import Result
from app.models.substitute_assignment import SubstituteAssignment
from app.models.weekly_requirement import WeeklyRequirement
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.timetable_settings import TimetableSettings

__all__ = [
    "Teacher",
    "Student",
    "SchoolClass",
    "class_subjects",
    "Subject",
    "ExamType",
    "TimetableSlot",
    "Result",
    "SubstituteAssignment",
    "WeeklyRequirement",
    "TeacherClassSubject",
    "TimetableSettings",
]
