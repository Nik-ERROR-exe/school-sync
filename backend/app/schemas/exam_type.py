from pydantic import BaseModel, Field

class ExamTypeCreate(BaseModel):
    name: str = Field(..., max_length=50)
    weightage: float = Field(default=1.0, ge=0.0, le=1.0)

class ExamTypeUpdate(BaseModel):
    name: str = Field(None, max_length=50)
    weightage: float = Field(None, ge=0.0, le=1.0)

class ExamTypeResponse(BaseModel):
    id: int
    name: str
    weightage: float

    class Config:
        from_attributes = True
