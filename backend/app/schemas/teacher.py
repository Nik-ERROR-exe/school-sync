from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Dict

class TeacherBase(BaseModel):
    teacher_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    email: EmailStr
    role: str = Field(default="TEACHER")  # 'ADMIN', 'TEACHER'
    status: str = Field(default="ACTIVE")  # 'ACTIVE', 'INACTIVE'
    max_lectures_per_day: int = Field(default=4, ge=1)
    availability: Optional[Dict[str, List[int]]] = None  # Day -> List of periods

class TeacherCreate(TeacherBase):
    password: str = Field(..., min_length=6)
    subject_expertise: Optional[List[int]] = None  # List of subject IDs

class TeacherUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[str] = None
    status: Optional[str] = None
    max_lectures_per_day: Optional[int] = Field(None, ge=1)
    availability: Optional[Dict[str, List[int]]] = None
    subject_expertise: Optional[List[int]] = None

class TeacherResponse(TeacherBase):
    id: int
    subject_expertise: List[int] = []

    @model_validator(mode="before")
    @classmethod
    def extract_subject_expertise(cls, data: any) -> any:
        # Check if we are converting from an ORM model
        if hasattr(data, "subjects_expertise"):
            subjects = getattr(data, "subjects_expertise", [])
            data_dict = {}
            for field_name in cls.model_fields:
                if hasattr(data, field_name):
                    data_dict[field_name] = getattr(data, field_name)
            data_dict["id"] = data.id
            data_dict["subject_expertise"] = [sub.id for sub in subjects] if subjects else []
            return data_dict
        return data

    class Config:
        from_attributes = True
