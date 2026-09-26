from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal

class SubjectExamComponentCreate(BaseModel):
    class_name: str
    subject_id: int
    exam_type_id: int
    component_code: str
    display_label: str
    max_marks: Decimal = Field(gt=0)
    display_order: int = 0

class SubjectExamComponentUpdate(BaseModel):
    display_label: Optional[str] = None
    max_marks: Optional[Decimal] = Field(default=None, gt=0)
    display_order: Optional[int] = None

class SubjectExamComponentResponse(BaseModel):
    id: int
    class_name: str
    subject_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    exam_type_id: int
    exam_type_name: Optional[str] = None
    component_code: str
    display_label: str
    max_marks: Decimal
    display_order: int
    model_config = {"from_attributes": True}

class SubjectExamComponentBatch(BaseModel):
    items: List[SubjectExamComponentCreate]
