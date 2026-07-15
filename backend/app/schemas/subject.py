from pydantic import BaseModel, Field

class SubjectCreate(BaseModel):
    subject_name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    code: str

    class Config:
        from_attributes = True
