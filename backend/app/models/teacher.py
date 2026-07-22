from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.teacher_subjects import teacher_subjects

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

    # --- classes_managed: no longer requires SchoolClass to have "class_teacher" ---
    # Use the foreign key column directly, no back_populates needed.
    classes_managed: Mapped[List["SchoolClass"]] = relationship(
        "SchoolClass",
        foreign_keys="[SchoolClass.class_teacher_id]",
        lazy="select"
    )

    # --- subjects_expertise: unchanged ---
    subjects_expertise: Mapped[List["Subject"]] = relationship(
        "Subject",
        secondary=teacher_subjects,
        lazy="selectin"
    )