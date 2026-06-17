from sqlalchemy import String, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from app.database import Base

class ExamType(Base):
    __tablename__ = "exam_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    weightage: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Relationships
    results: Mapped[List["Result"]] = relationship(back_populates="exam_type")
