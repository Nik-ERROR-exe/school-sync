from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from app.database import Base

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

    # --- DISABLE ALL RELATIONSHIPS ---
    # classes_managed: Mapped[List["SchoolClass"]] = relationship(...)
    # timetable_slots: Mapped[List["TimetableSlot"]] = relationship(...)