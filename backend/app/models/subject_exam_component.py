from __future__ import annotations
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, SmallInteger, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.subject import Subject
    from app.models.exam_type import ExamType

class SubjectExamComponent(Base):
    __tablename__ = "subject_exam_components"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_name: Mapped[str] = mapped_column(String(50), nullable=False)
    subject_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    exam_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exam_types.id", ondelete="CASCADE"), nullable=False
    )
    component_code: Mapped[str] = mapped_column(String(20), nullable=False)
    display_label: Mapped[str] = mapped_column(String(50), nullable=False)
    max_marks: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    display_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint(
            "class_name", "subject_id", "exam_type_id", "component_code",
            name="uq_subject_exam_component",
        ),
    )

    subject: Mapped["Subject"] = relationship(
        "Subject", foreign_keys=[subject_id], lazy="select"
    )
    exam_type: Mapped["ExamType"] = relationship(
        "ExamType", foreign_keys=[exam_type_id], lazy="select"
    )
