from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.repositories.task_repository import TaskRepository
from app.services.builders.task_builder import TaskBuilder
from app.models.task import Task
from app.models.work_block import WorkBlock
from app.schemas.task import TaskCreate, TaskUpdate

def _block_from_deadline(deadline: datetime, notes: Optional[str] = None) -> WorkBlock:
    days_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    day_name = days_es[deadline.weekday()]
    start_t = deadline.strftime("%H:%M")
    end_dt = deadline + timedelta(hours=1)
    end_t = end_dt.strftime("%H:%M")
    return WorkBlock(
        day_name=day_name,
        start_time=start_t,
        end_time=end_t,
        block_date=deadline,
        notes=notes or "Horario programado"
    )

class TaskService:
    def __init__(self, db: Session):
        self.task_repo = TaskRepository(db)

    def create_task(self, user_id: int, task_in: TaskCreate) -> Task:
        # Applying the Builder Pattern to construct the task entity
        builder = (
            TaskBuilder()
            .set_user_id(user_id)
            .set_title(task_in.title)
            .set_description(task_in.description)
            .set_deadline(task_in.deadline)
            .set_recurrence(task_in.is_recurring, task_in.recurrence_rule)
        )

        if task_in.work_blocks and len(task_in.work_blocks) > 0:
            for block in task_in.work_blocks:
                builder.add_work_block(
                    day_name=block.day_name,
                    start_time=block.start_time,
                    end_time=block.end_time,
                    block_date=block.block_date,
                    notes=block.notes
                )
        elif task_in.deadline:
            days_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
            day_name = days_es[task_in.deadline.weekday()]
            start_t = task_in.deadline.strftime("%H:%M")
            end_t = (task_in.deadline + timedelta(hours=1)).strftime("%H:%M")
            builder.add_work_block(
                day_name=day_name,
                start_time=start_t,
                end_time=end_t,
                block_date=task_in.deadline,
                notes=task_in.title
            )

        task = builder.build()
        return self.task_repo.save(task)

    def get_user_tasks(self, user_id: int) -> List[Task]:
        return self.task_repo.get_user_tasks(user_id)

    def get_task(self, task_id: int, user_id: int) -> Optional[Task]:
        return self.task_repo.get_by_id(task_id, user_id)

    def update_task(self, task_id: int, user_id: int, task_in: TaskUpdate) -> Optional[Task]:
        task = self.task_repo.get_by_id(task_id, user_id)
        if not task:
            return None
        if task_in.title is not None:
            task.title = task_in.title
        if task_in.description is not None:
            task.description = task_in.description
        if task_in.deadline is not None:
            task.deadline = task_in.deadline
        if task_in.is_recurring is not None:
            task.is_recurring = task_in.is_recurring
        if task_in.recurrence_rule is not None:
            task.recurrence_rule = task_in.recurrence_rule
        if task_in.status is not None:
            task.status = task_in.status

        effective_deadline = task_in.deadline or task.deadline
        if task_in.work_blocks is not None and len(task_in.work_blocks) > 0:
            self.task_repo.db.query(WorkBlock).filter(WorkBlock.task_id == task.id).delete()
            self.task_repo.db.flush()
            task.work_blocks.clear()
            for b in task_in.work_blocks:
                task.work_blocks.append(
                    WorkBlock(
                        task_id=task.id,
                        day_name=b.day_name,
                        start_time=b.start_time,
                        end_time=b.end_time,
                        block_date=b.block_date,
                        notes=b.notes,
                        completed=b.completed
                    )
                )
        elif task_in.work_blocks is not None and len(task_in.work_blocks) == 0 and effective_deadline:
            self.task_repo.db.query(WorkBlock).filter(WorkBlock.task_id == task.id).delete()
            self.task_repo.db.flush()
            task.work_blocks.clear()
            task.work_blocks.append(_block_from_deadline(effective_deadline, task.title))
        elif len(task.work_blocks) == 0 and effective_deadline:
            task.work_blocks.append(_block_from_deadline(effective_deadline, task.title))

        return self.task_repo.save(task)

    def update_block_status(self, block_id: int, user_id: int, completed: bool, notes: Optional[str] = None) -> Optional[WorkBlock]:
        # Allows completing individual days early or recording notes
        block = self.task_repo.update_work_block(block_id, user_id, completed=completed, notes=notes)
        if not block:
            return None

        # Check if all blocks of the parent task are completed
        parent_task = self.task_repo.get_by_id(block.task_id, user_id)
        if parent_task and parent_task.work_blocks:
            all_done = all(b.completed for b in parent_task.work_blocks)
            if all_done:
                self.task_repo.update_task_status(parent_task.id, user_id, "completed")
            elif any(b.completed for b in parent_task.work_blocks):
                self.task_repo.update_task_status(parent_task.id, user_id, "in_progress")

        return block

    def delete_task(self, task_id: int, user_id: int) -> bool:
        return self.task_repo.delete(task_id, user_id)
