from datetime import datetime
from typing import Optional, List
from app.models.task import Task
from app.models.work_block import WorkBlock

class TaskBuilder:
    """
    Builder Pattern: Constructs a complex Task step-by-step
    with its associated daily WorkBlocks and schedule constraints.
    """
    def __init__(self):
        self._user_id: Optional[int] = None
        self._title: Optional[str] = None
        self._description: Optional[str] = None
        self._deadline: Optional[datetime] = None
        self._is_recurring: bool = False
        self._recurrence_rule: Optional[str] = None
        self._work_blocks: List[WorkBlock] = []

    def set_user_id(self, user_id: int) -> "TaskBuilder":
        self._user_id = user_id
        return self

    def set_title(self, title: str) -> "TaskBuilder":
        self._title = title.strip() if title else ""
        return self

    def set_description(self, description: Optional[str]) -> "TaskBuilder":
        self._description = description.strip() if description else None
        return self

    def set_deadline(self, deadline: Optional[datetime]) -> "TaskBuilder":
        self._deadline = deadline
        return self

    def set_recurrence(self, is_recurring: bool, rule: Optional[str] = None) -> "TaskBuilder":
        self._is_recurring = is_recurring
        self._recurrence_rule = rule if is_recurring else None
        return self

    def add_work_block(
        self,
        day_name: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        block_date: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> "TaskBuilder":
        block = WorkBlock(
            day_name=day_name,
            start_time=start_time,
            end_time=end_time,
            block_date=block_date,
            completed=False,
            notes=notes
        )
        self._work_blocks.append(block)
        return self

    def build(self) -> Task:
        if not self._user_id:
            raise ValueError("Task requires a valid user_id")
        if not self._title:
            raise ValueError("Task title is mandatory")

        task = Task(
            user_id=self._user_id,
            title=self._title,
            description=self._description,
            deadline=self._deadline,
            is_recurring=self._is_recurring,
            recurrence_rule=self._recurrence_rule,
            status="pending"
        )
        task.work_blocks = self._work_blocks
        return task
