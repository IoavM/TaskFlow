from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class WorkBlockBase(BaseModel):
    day_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    block_date: Optional[datetime] = None
    completed: bool = False
    notes: Optional[str] = None
    color: Optional[str] = None

class WorkBlockCreate(WorkBlockBase):
    pass

class WorkBlockUpdate(BaseModel):
    completed: Optional[bool] = None
    notes: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: Optional[str] = None

class WorkBlockResponse(WorkBlockBase):
    id: int
    task_id: int
    created_at: datetime

    class Config:
        from_attributes = True
