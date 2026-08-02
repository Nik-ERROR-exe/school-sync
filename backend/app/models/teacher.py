from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.subject import Subject
    from app.models.school_class import SchoolClass   # <-- corrected import


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    teacher_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="TEACHER", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    max_lectures_per_day: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    profile_image_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # availability: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # --- classes_managed: no longer requires SchoolClass to have "class_teacher" ---
    # Use the foreign key column directly, no back_populates needed.
    classes_managed: Mapped[List["SchoolClass"]] = relationship(
        "SchoolClass",
        foreign_keys="[SchoolClass.class_teacher_id]",
        lazy="select"
    )

    # --- subjects_expertise: derived from teacher_class_subjects (distinct subjects taught) ---
    # The teacher_subjects mapping table was dropped; expertise is the set of subjects a
    # teacher teaches across all classes in teacher_class_subjects.
    subjects_expertise: Mapped[List["Subject"]] = relationship(
        "Subject",
        secondary="teacher_class_subjects",
        primaryjoin="Teacher.id == TeacherClassSubject.teacher_id",
        secondaryjoin="Subject.id == TeacherClassSubject.subject_id",
        lazy="selectin",
        viewonly=True,
    )