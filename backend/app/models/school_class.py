from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.database import Base

class SchoolClass(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., '8', '9', '10'
    division: Mapped[str] = mapped_column(String(50), nullable=False)    # e.g., 'A', 'B'
    class_teacher_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teachers.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("class_name", "division", name="uq_class_division"),
    )

    # --- REMOVE ALL RELATIONSHIPS (comment out) ---
    # class_teacher: Mapped[Optional["Teacher"]] = relationship(back_populates="classes_managed")
    # students: Mapped[List["Student"]] = relationship(back_populates="school_class", cascade="all, delete-orphan")
    # timetable_slots: Mapped[List["TimetableSlot"]] = relationship(back_populates="school_class", cascade="all, delete-orphan")
    
    # --- ADD RELATIONSHIP FOR TEACHER-CLASS-SUBJECT MAPPING ---
    teacher_class_subjects: Mapped[List["TeacherClassSubject"]] = relationship(
        "TeacherClassSubject",
        back_populates="school_class",
        cascade="all, delete-orphan"
    )