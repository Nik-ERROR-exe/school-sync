from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    roll_no: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)

    school_class: Mapped["SchoolClass"] = relationship(
        "SchoolClass",
        back_populates="students",
        lazy="select"
    )

    __table_args__ = (
        UniqueConstraint("class_id", "roll_no", name="uq_class_roll_no"),
    )