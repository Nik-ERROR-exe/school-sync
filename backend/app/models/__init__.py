from app.database import Base
from app.models.teacher import Teacher, teacher_subjects
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.exam_type import ExamType
from app.models.result import Result
from app.models.timetable import TimetableSlot
from app.models.substitute_assignment import SubstituteAssignment
from app.models.notification import Notification
from app.models.weekly_requirement import WeeklyRequirement

__all__ = [
    "Base",
    "Teacher",
    "teacher_subjects",
    "SchoolClass",
    "Student",
    "Subject",
    "ExamType",
    "Result",
    "TimetableSlot",
    "SubstituteAssignment",
    "Notification",
    "WeeklyRequirement",
]
