from sqlalchemy import Integer, String, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date as pydate
from app.database import Base

class SubstituteAssignment(Base):
    __tablename__ = "substitute_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[pydate] = mapped_column(Date, nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    original_teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)
    substitute_teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # 'pending', 'notified', 'accepted', 'declined'

    # Relationships
    # school_class: Mapped["SchoolClass"] = relationship()
    # original_teacher: Mapped["Teacher"] = relationship(foreign_keys=[original_teacher_id])
    # substitute_teacher: Mapped["Teacher"] = relationship(foreign_keys=[substitute_teacher_id])
