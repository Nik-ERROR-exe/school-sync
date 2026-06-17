from pydantic import BaseModel, Field
from typing import Optional

class WeeklyRequirementCreate(BaseModel):
    class_id: int
    subject_id: int
    periods_per_week: int = Field(..., ge=1, description="Number of lectures required per week")

class WeeklyRequirementUpdate(BaseModel):
    periods_per_week: int = Field(..., ge=1)

class WeeklyRequirementResponse(BaseModel):
    id: int
    class_id: int
    class_name: Optional[str] = None
    division: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    periods_per_week: int

    class Config:
        from_attributes = True
