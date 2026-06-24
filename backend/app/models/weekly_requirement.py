from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class WeeklyRequirement(Base):
    __tablename__ = "weekly_requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    periods_per_week: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", name="uq_class_subject_requirement"),
    )

    # Relationships
    # school_class: Mapped["SchoolClass"] = relationship()
    # subject: Mapped["Subject"] = relationship()
