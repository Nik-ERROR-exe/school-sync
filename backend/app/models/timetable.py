from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.database import Base

class TimetableSlot(Base):
    __tablename__ = "timetable"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"))
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id"))
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey("teachers.id"))
    day_of_week: Mapped[str] = mapped_column(String(20))  # ✅ Keep as day_of_week
    period_number: Mapped[int] = mapped_column(Integer)

    # Relationships
    school_class: Mapped["SchoolClass"] = relationship()
    teacher: Mapped["Teacher"] = relationship()
    subject: Mapped["Subject"] = relationship()