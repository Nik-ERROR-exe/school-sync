from __future__ import annotations
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.result import Result

class ResultComponent(Base):
    __tablename__ = "result_components"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    result_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("results.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    component_code: Mapped[str] = mapped_column(String(20), nullable=False)
    marks_obtained: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    __table_args__ = (
        UniqueConstraint("result_id", "component_code", name="uq_result_component"),
    )

    result: Mapped["Result"] = relationship(
        "Result", foreign_keys=[result_id], back_populates="components"
    )
