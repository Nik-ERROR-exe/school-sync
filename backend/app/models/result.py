from __future__ import annotations

from datetime import datetime               # <-- NEW import
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Integer, Float, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.subject import Subject
    from app.models.exam_type import ExamType
    from app.models.teacher import Teacher


class Result(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True, nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True, nullable=False)
    exam_type_id: Mapped[int] = mapped_column(ForeignKey("exam_types.id"), index=True, nullable=False)

    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", index=True, nullable=False
    )  # 'pending', 'submitted', 'approved'

    submitted_by_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teachers.id"), nullable=True)

    # --- NEW columns ---
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_results_student_subject_exam", "student_id", "subject_id", "exam_type_id"),
        Index("idx_results_student_exam", "student_id", "exam_type_id"),
    )

    # ---------- Relationships (decoupled, no back_populates) ----------
    student: Mapped["Student"] = relationship(
        "Student",
        foreign_keys=[student_id],
        lazy="select"
    )
    subject: Mapped["Subject"] = relationship(
        "Subject",
        foreign_keys=[subject_id],
        lazy="select"
    )
    exam_type: Mapped["ExamType"] = relationship(
        "ExamType",
        foreign_keys=[exam_type_id],
        lazy="select"
    )
    submitted_by: Mapped["Teacher"] = relationship(
        "Teacher",
        foreign_keys=[submitted_by_id],
        lazy="select"
    )
    approved_by: Mapped[Optional["Teacher"]] = relationship(
        "Teacher",
        foreign_keys=[approved_by_id],
        lazy="select"
    )