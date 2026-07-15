from app.models.teacher import Teacher
from app.models.student import Student
from app.models.school_class import SchoolClass, class_subjects
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.timetable import TimetableSlot
from app.models.result import Result
from app.models.notification import Notification
from app.models.substitute_assignment import SubstituteAssignment
from app.models.weekly_requirement import WeeklyRequirement
from app.models.teacher_subjects import teacher_subjects

__all__ = [
    "Teacher",
    "Student",
    "SchoolClass",
    "class_subjects",
    "Subject",
    "ExamType",
    "TimetableSlot",
    "Result",
    "Notification",
    "SubstituteAssignment",
    "WeeklyRequirement",
    "teacher_subjects",
]