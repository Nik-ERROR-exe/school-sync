from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.database import Base

class_subjects = Table(
    "class_subjects",
    Base.metadata,
    Column("class_id", Integer, ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", Integer, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)

class SchoolClass(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., '8', '9', '10'
    division: Mapped[str] = mapped_column(String(50), nullable=False)    # e.g., 'A', 'B'
    class_teacher_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teachers.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("class_name", "division", name="uq_class_division"),
    )

    subjects: Mapped[List["Subject"]] = relationship(
        "Subject",
        secondary="class_subjects",
        lazy="select"
    )

    # --- REMOVE ALL RELATIONSHIPS (comment out) ---
    # class_teacher: Mapped[Optional["Teacher"]] = relationship(back_populates="classes_managed")
    # students: Mapped[List["Student"]] = relationship(back_populates="school_class", cascade="all, delete-orphan")
    # timetable_slots: Mapped[List["TimetableSlot"]] = relationship(back_populates="school_class", cascade="all, delete-orphan")