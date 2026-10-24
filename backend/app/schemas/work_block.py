from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class WorkBlockBase(BaseModel):
    day_name: str = Field(..., max_length=20)
    start_time: Optional[str] = Field(None, max_length=10)
    end_time: Optional[str] = Field(None, max_length=10)
    block_date: Optional[datetime] = None
    completed: bool = False
    notes: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = Field(None, max_length=30)

class WorkBlockCreate(WorkBlockBase):
    pass

class WorkBlockUpdate(BaseModel):
    completed: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)
    start_time: Optional[str] = Field(None, max_length=10)
    end_time: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, max_length=30)

class WorkBlockResponse(WorkBlockBase):
    id: int
    task_id: int
    created_at: datetime

    class Config:
        from_attributes = True
