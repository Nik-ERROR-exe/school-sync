from pydantic import BaseModel

class TeacherClassSubjectCreate(BaseModel):
    teacher_id: int
    class_id: int
    subject_id: int

class TeacherClassSubjectResponse(BaseModel):
    id: int
    teacher_id: int
    class_id: int
    subject_id: int
    
    class Config:
        from_attributes = True