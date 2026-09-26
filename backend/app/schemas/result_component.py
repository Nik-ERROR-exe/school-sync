from pydantic import BaseModel, Field

class ResultComponentEntry(BaseModel):
    component_code: str
    marks_obtained: float = Field(ge=0)

class ResultComponentResponse(ResultComponentEntry):
    id: int
    model_config = {"from_attributes": True}
