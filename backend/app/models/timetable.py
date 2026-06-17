from sqlalchemy import Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class TimetableSlot(Base):
    __tablename__ = "timetable"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False)  # 'Monday', 'Tuesday', etc.
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)   # 1, 2, 3, etc.
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("class_id", "day_of_week", "period_number", name="uq_class_day_period"),
        UniqueConstraint("teacher_id", "day_of_week", "period_number", name="uq_teacher_day_period"),
    )

    # Relationships
    school_class: Mapped["SchoolClass"] = relationship(back_populates="timetable_slots")
    subject: Mapped["Subject"] = relationship(back_populates="timetable_slots")
    teacher: Mapped["Teacher"] = relationship(back_populates="timetable_slots")
