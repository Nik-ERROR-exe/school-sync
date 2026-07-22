from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.teacher_subjects import teacher_subjects

if TYPE_CHECKING:
    from app.models.subject import Subject
    from app.models.class_ import SchoolClass  # adjust import path if different


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
    # availability: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationship to classes this teacher manages
    classes_managed: Mapped[List["SchoolClass"]] = relationship(
        "SchoolClass",
        back_populates="class_teacher",
        lazy="select"
    )

    # Relationship to subjects this teacher is qualified to teach,
    # via the teacher_subjects association table.
    # Named to match the `hasattr(data, "subjects_expertise")` check
    # in TeacherResponse's model_validator.
    subjects_expertise: Mapped[List["Subject"]] = relationship(
        "Subject",
        secondary=teacher_subjects,
        lazy="selectin"
    )