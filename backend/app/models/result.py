from sqlalchemy import Integer, Float, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.database import Base

class Result(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    exam_type_id: Mapped[int] = mapped_column(ForeignKey("exam_types.id"), nullable=False)
    
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # 'pending', 'submitted', 'approved'
    
    submitted_by_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teachers.id"), nullable=True)

    # Relationships
    # student: Mapped["Student"] = relationship(back_populates="results")
    # subject: Mapped["Subject"] = relationship(back_populates="results")
    # exam_type: Mapped["ExamType"] = relationship(back_populates="results")
    # submitted_by: Mapped["Teacher"] = relationship(foreign_keys=[submitted_by_id])
    # approved_by: Mapped[Optional["Teacher"]] = relationship(foreign_keys=[approved_by_id])
