from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class TeacherClassSubject(Base):
    __tablename__ = "teacher_class_subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", "class_id", "subject_id", name="uq_teacher_class_subject"),
    )

    # Relationships - using string references to avoid circular imports
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="teacher_class_subjects")
    school_class: Mapped["SchoolClass"] = relationship("SchoolClass", back_populates="teacher_class_subjects")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="teacher_class_subjects")