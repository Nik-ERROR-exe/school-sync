from pydantic import BaseModel
from typing import Optional, List

class StudentCreate(BaseModel):
    roll_no: str
    name: str
    class_id: int

class StudentUpdate(BaseModel):
    roll_no: Optional[str] = None
    name: Optional[str] = None
    class_id: Optional[int] = None

class StudentResponse(BaseModel):
    id: int
    roll_no: str
    name: str
    class_id: int

    class Config:
        from_attributes = True


class BulkRowResult(BaseModel):
    row_number: int
    roll_no: Optional[str] = None
    name: Optional[str] = None
    status: str
    reason: Optional[str] = None


class StudentBulkUploadResponse(BaseModel):
    total_rows: int
    inserted: int
    skipped: int
    results: List[BulkRowResult]
