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
    class_name: Mapped[str] = mapped_column(String(50), nullable=False)
    division: Mapped[str] = mapped_column(String(50), nullable=False)
    class_teacher_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teachers.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("class_name", "division", name="uq_class_division"),
    )

    # Relationships
    subjects: Mapped[List["Subject"]] = relationship(
        "Subject",
        secondary="class_subjects",
        lazy="select"
    )
    
    # ADD THESE RELATIONSHIPS (uncomment and add)
    class_teacher: Mapped[Optional["Teacher"]] = relationship(
        "Teacher",
        back_populates="classes_managed",
        lazy="select"
    )
    
    students: Mapped[List["Student"]] = relationship(
        "Student",
        back_populates="school_class",
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    timetable_slots: Mapped[List["TimetableSlot"]] = relationship(
        "TimetableSlot",
        back_populates="school_class",
        cascade="all, delete-orphan",
        lazy="select"
    )