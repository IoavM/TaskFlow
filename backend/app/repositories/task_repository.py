from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.task import Task
from app.models.work_block import WorkBlock

class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, task_id: int, user_id: int) -> Optional[Task]:
        return (
            self.db.query(Task)
            .options(joinedload(Task.work_blocks))
            .filter(Task.id == task_id, Task.user_id == user_id)
            .first()
        )

    def get_user_tasks(self, user_id: int) -> List[Task]:
        return (
            self.db.query(Task)
            .options(joinedload(Task.work_blocks))
            .filter(Task.user_id == user_id)
            .order_by(Task.deadline.asc().nullslast(), Task.id.desc())
            .all()
        )

    def save(self, task: Task) -> Task:
        self.db.add(task)
        self.db.commit()
        fresh = self.get_by_id(task.id, task.user_id)
        return fresh if fresh is not None else task

    def update_task_status(self, task_id: int, user_id: int, status: str) -> Optional[Task]:
        task = self.get_by_id(task_id, user_id)
        if not task:
            return None
        task.status = status
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_work_block(self, block_id: int, user_id: int, completed: Optional[bool] = None, notes: Optional[str] = None, color: Optional[str] = None) -> Optional[WorkBlock]:
        block = (
            self.db.query(WorkBlock)
            .join(Task)
            .filter(WorkBlock.id == block_id, Task.user_id == user_id)
            .first()
        )
        if not block:
            return None
        if completed is not None:
            block.completed = completed
        if notes is not None:
            block.notes = notes
        if color is not None:
            block.color = color
        self.db.commit()
        self.db.refresh(block)
        return block

    def delete(self, task_id: int, user_id: int) -> bool:
        task = self.get_by_id(task_id, user_id)
        if not task:
            return False
        self.db.delete(task)
        self.db.commit()
        return True
