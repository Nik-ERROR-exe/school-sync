from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from app.database import Base
from app.models.teacher_subjects import teacher_subjects

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

    subjects_expertise: Mapped[List["Subject"]] = relationship(
        "Subject",
        secondary="teacher_subjects",
        lazy="select"
    )

    # --- DISABLE ALL RELATIONSHIPS ---
    # classes_managed: Mapped[List["SchoolClass"]] = relationship(...)
    # timetable_slots: Mapped[List["TimetableSlot"]] = relationship(...)