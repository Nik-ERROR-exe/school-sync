from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class TimetableSettings(Base):
    __tablename__ = "timetable_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    school_days = Column(String, nullable=False)  # JSON string: '["Monday","Tuesday",...]'
    saturday_periods = Column(Integer, nullable=False, default=4)
    pt_subject_id = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
