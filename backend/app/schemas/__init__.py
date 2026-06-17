from app.schemas.auth import LoginRequest, TokenResponse, CurrentUserResponse, MessageResponse
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse
from app.schemas.result import ResultCreate, ResultBatchCreate, ResultUpdate, ResultResponse, ResultApproval
from app.schemas.timetable import TimetableGenerateRequest, TimetableSlotResponse, TimetableResponse, TimetableSaveRequest
from app.schemas.substitute import SubstituteAssignRequest, AvailableTeacherResponse, SubstituteAssignmentResponse
from app.schemas.notification import NotificationResponse, NotificationUpdate

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "CurrentUserResponse",
    "MessageResponse",
    "TeacherCreate",
    "TeacherUpdate",
    "TeacherResponse",
    "ResultCreate",
    "ResultBatchCreate",
    "ResultUpdate",
    "ResultResponse",
    "ResultApproval",
    "TimetableGenerateRequest",
    "TimetableSlotResponse",
    "TimetableResponse",
    "TimetableSaveRequest",
    "SubstituteAssignRequest",
    "AvailableTeacherResponse",
    "SubstituteAssignmentResponse",
    "NotificationResponse",
    "NotificationUpdate",
]
