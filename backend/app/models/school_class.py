from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.database import Base

class SchoolClass(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_name: Mapped[str] = mapped_column(String(50), nullable=False)
    division: Mapped[str] = mapped_column(String(50), nullable=False)
    class_teacher_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teachers.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("class_name", "division", name="uq_class_division"),
    )

    # --- KEEP THIS RELATIONSHIP ---
    students: Mapped[List["Student"]] = relationship("Student", back_populates="school_class", cascade="all, delete-orphan")