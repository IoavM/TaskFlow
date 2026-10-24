from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.work_block import WorkBlockCreate, WorkBlockResponse

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Título de la tarea")
    description: Optional[str] = Field(None, max_length=3000, description="Descripción de la tarea")
    deadline: Optional[datetime] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field("blue", max_length=30)

class TaskCreate(TaskBase):
    work_blocks: Optional[List[WorkBlockCreate]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=3000)
    deadline: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field(None, max_length=30)
    color: Optional[str] = Field(None, max_length=30)
    work_blocks: Optional[List[WorkBlockCreate]] = None

class TaskResponse(TaskBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    work_blocks: List[WorkBlockResponse] = []

    class Config:
        from_attributes = True

class AITaskPrompt(BaseModel):
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=1500,
        description="Instrucción en lenguaje natural para la IA (máximo 1500 caracteres para mitigar abusos)"
    )
