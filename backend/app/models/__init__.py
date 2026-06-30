from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.student import Student
from app.models.result import Result
from app.models.teacher_class_subject import TeacherClassSubject
from app.models.exam_type import ExamType
from app.models.notification import Notification
from app.models.substitute_assignment import SubstituteAssignment
from app.models.timetable import TimetableSlot
from app.models.weekly_requirement import WeeklyRequirement

__all__ = [
    "Teacher",
    "SchoolClass",
    "Subject",
    "Student",
    "Result",
    "TeacherClassSubject",
    "ExamType",
    "Notification",
    "SubstituteAssignment",
    "TimetableSlot",
    "WeeklyRequirement"
]