from sqlalchemy import Integer, String, SmallInteger, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import date as pydate
from app.database import Base

class SubstituteAssignment(Base):
    __tablename__ = "substitute_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[Optional[pydate]] = mapped_column(Date, nullable=True)
    day_of_week: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)  # 1=Monday .. 7=Sunday
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    original_teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)
    substitute_teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    # Relationships
    school_class: Mapped["SchoolClass"] = relationship()
    subject: Mapped["Subject"] = relationship()
    original_teacher: Mapped["Teacher"] = relationship(foreign_keys=[original_teacher_id])
    substitute_teacher: Mapped["Teacher"] = relationship(foreign_keys=[substitute_teacher_id])
