from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.work_block import WorkBlockCreate, WorkBlockResponse

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    color: Optional[str] = "blue"

class TaskCreate(TaskBase):
    work_blocks: Optional[List[WorkBlockCreate]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    status: Optional[str] = None
    color: Optional[str] = None
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
    prompt: str
