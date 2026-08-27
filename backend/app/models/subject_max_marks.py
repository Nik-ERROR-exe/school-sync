from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.subject import Subject
    from app.models.exam_type import ExamType

class SubjectMaxMarks(Base):
    __tablename__ = "subject_max_marks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_name: Mapped[str] = mapped_column(String(50), nullable=False)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    exam_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_types.id", ondelete="CASCADE"), nullable=False)
    max_marks: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    __table_args__ = (
        UniqueConstraint("class_name", "subject_id", "exam_type_id", name="uq_subject_max_marks_class_subj_exam"),
    )

    subject: Mapped["Subject"] = relationship("Subject", foreign_keys=[subject_id], lazy="select")
    exam_type: Mapped["ExamType"] = relationship("ExamType", foreign_keys=[exam_type_id], lazy="select")
