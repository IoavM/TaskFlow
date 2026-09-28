from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class WorkBlock(Base):
    __tablename__ = "work_blocks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    day_name = Column(String(50), nullable=False)  # Lunes, Martes, Miércoles...
    start_time = Column(String(10), nullable=True)  # 14:00
    end_time = Column(String(10), nullable=True)    # 16:00
    block_date = Column(DateTime(timezone=True), nullable=True)
    completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    color = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    task = relationship("Task", back_populates="work_blocks")
