from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from app.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Relationships
    results: Mapped[List["Result"]] = relationship(back_populates="subject")
    timetable_slots: Mapped[List["TimetableSlot"]] = relationship(back_populates="subject")
    teachers: Mapped[List["Teacher"]] = relationship(
        secondary="teacher_subjects",
        back_populates="subjects_expertise"
    )
