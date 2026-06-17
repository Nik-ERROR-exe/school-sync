from sqlalchemy import String, Integer, Table, Column, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.database import Base

# Many-to-many junction table to map teachers to subjects they are qualified to teach
teacher_subjects = Table(
    "teacher_subjects",
    Base.metadata,
    Column("teacher_id", Integer, ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", Integer, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)
)

class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    teacher_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="TEACHER", nullable=False)  # 'ADMIN', 'TEACHER'
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # 'ACTIVE', 'INACTIVE'
    max_lectures_per_day: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    availability: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Day of week -> list of available periods

    # Relationships
    classes_managed: Mapped[List["SchoolClass"]] = relationship(back_populates="class_teacher")
    timetable_slots: Mapped[List["TimetableSlot"]] = relationship(back_populates="teacher")
    subjects_expertise: Mapped[List["Subject"]] = relationship(
        secondary=teacher_subjects,
        back_populates="teachers"
    )
