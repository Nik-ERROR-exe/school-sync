from sqlalchemy import Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime
from app.database import Base

class Result(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    exam_type_id: Mapped[int] = mapped_column(ForeignKey("exam_types.id"), nullable=False)
    class_id: Mapped[Optional[int]] = mapped_column(ForeignKey("classes.id"), nullable=True)
    
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    
    submitted_by_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teachers.id"), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # --- REMOVE ALL RELATIONSHIPS TO AVOID CIRCULAR IMPORT ---
    # student: Mapped["Student"] = relationship("Student", back_populates="results")
    # subject: Mapped["Subject"] = relationship("Subject", back_populates="results")
    # exam_type: Mapped["ExamType"] = relationship("ExamType", back_populates="results")