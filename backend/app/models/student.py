from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    roll_no: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)

    # --- ONLY KEEP THIS RELATIONSHIP ---
    school_class: Mapped["SchoolClass"] = relationship("SchoolClass", back_populates="students")
    
    # --- REMOVE THE 'results' RELATIONSHIP TO AVOID CIRCULAR IMPORT ---
    # results: Mapped[List["Result"]] = relationship("Result", back_populates="student", cascade="all, delete-orphan")