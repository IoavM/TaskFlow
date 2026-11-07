from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.repositories.task_repository import TaskRepository
from app.services.builders.task_builder import TaskBuilder
from app.models.task import Task
from app.models.work_block import WorkBlock
from app.schemas.task import TaskCreate, TaskUpdate

def _block_from_deadline(deadline: datetime, notes: Optional[str] = None, color: Optional[str] = "blue") -> WorkBlock:
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
        notes=notes or "Horario programado",
        color=color or "blue"
    )

def _resolve_block_date(day_name: str, start_time: Optional[str], deadline: datetime) -> Optional[datetime]:
    if not deadline or not day_name:
        return None
    days_map = {
        "lunes": 0, "martes": 1, "miercoles": 2, "miércoles": 2,
        "jueves": 3, "viernes": 4, "sabado": 5, "sábado": 5, "domingo": 6
    }
    norm_day = day_name.strip().lower()
    if norm_day not in days_map:
        return deadline
    dl_day = deadline.weekday()
    monday = deadline.date() - timedelta(days=dl_day)
    target_day = monday + timedelta(days=days_map[norm_day])
    s_hour, s_min = 14, 0
    if start_time and ":" in start_time:
        parts = start_time.split(":")
        try:
            s_hour, s_min = int(parts[0]), int(parts[1])
        except ValueError:
            pass
    return datetime(target_day.year, target_day.month, target_day.day, s_hour, s_min, tzinfo=deadline.tzinfo)

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
            .set_color(task_in.color or "blue")
        )

        task_color = task_in.color or "blue"
        is_rec = bool(task_in.is_recurring)
        if task_in.work_blocks and len(task_in.work_blocks) > 0:
            for block in task_in.work_blocks:
                b_date = block.block_date
                if not b_date and task_in.deadline and not is_rec:
                    b_date = _resolve_block_date(block.day_name, block.start_time, task_in.deadline)
                builder.add_work_block(
                    day_name=block.day_name,
                    start_time=block.start_time,
                    end_time=block.end_time,
                    block_date=b_date,
                    notes=block.notes,
                    color=block.color or task_color
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
                notes=task_in.title,
                color=task_color
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
            # Bidirectional completion sync: if task marked completed, complete all work blocks
            if task.work_blocks:
                is_completed = (task_in.status == "completed")
                for b in task.work_blocks:
                    b.completed = is_completed

        if task_in.color is not None:
            task.color = task_in.color

        effective_color = task_in.color or task.color or "blue"
        effective_deadline = task_in.deadline or task.deadline
        is_rec = task_in.is_recurring if task_in.is_recurring is not None else task.is_recurring
        if task_in.work_blocks is not None and len(task_in.work_blocks) > 0:
            blocks = []
            for b in task_in.work_blocks:
                b_date = b.block_date
                if not b_date and effective_deadline and not is_rec:
                    b_date = _resolve_block_date(b.day_name, b.start_time, effective_deadline)
                blocks.append(
                    WorkBlock(
                        day_name=b.day_name,
                        start_time=b.start_time,
                        end_time=b.end_time,
                        block_date=b_date,
                        notes=b.notes,
                        completed=b.completed,
                        color=b.color or effective_color
                    )
                )
            task.work_blocks = blocks
        elif task_in.work_blocks is not None and len(task_in.work_blocks) == 0 and effective_deadline:
            task.work_blocks = [_block_from_deadline(effective_deadline, task.title, effective_color)]
        elif len(task.work_blocks) == 0 and effective_deadline:
            task.work_blocks = [_block_from_deadline(effective_deadline, task.title, effective_color)]

        return self.task_repo.save(task)

    def update_block_status(self, block_id: int, user_id: int, completed: Optional[bool] = None, notes: Optional[str] = None, color: Optional[str] = None) -> Optional[WorkBlock]:
        # Allows completing individual days early or recording notes or changing individual block color
        block = self.task_repo.update_work_block(block_id, user_id, completed=completed, notes=notes, color=color)
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
            else:
                self.task_repo.update_task_status(parent_task.id, user_id, "pending")

        return block

    def delete_task(self, task_id: int, user_id: int) -> bool:
        return self.task_repo.delete(task_id, user_id)
