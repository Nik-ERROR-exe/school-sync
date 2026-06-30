from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    roll_no: str = Field(..., max_length=50, description="Unique roll number")
    name: str = Field(..., max_length=100, description="Student full name")
    class_id: int = Field(..., description="ID of the class")

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    roll_no: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=100)
    class_id: Optional[int] = None

class StudentResponse(StudentBase):
    id: int
    created_at: Optional[datetime] = None
    class_name: Optional[str] = None
    division: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def enrich_with_class_data(cls, data: any) -> any:
        """Add class_name and division from the related SchoolClass"""
        if hasattr(data, "school_class"):
            class_obj = getattr(data, "school_class", None)
            if class_obj:
                data_dict = {}
                for field_name in cls.model_fields:
                    if hasattr(data, field_name):
                        data_dict[field_name] = getattr(data, field_name)
                data_dict["class_name"] = class_obj.class_name
                data_dict["division"] = class_obj.division
                return data_dict
        return data

    class Config:
        from_attributes = True

class StudentListResponse(BaseModel):
    students: list[StudentResponse]
    total: int
    page: int
    per_page: int