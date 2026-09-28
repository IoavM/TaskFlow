from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, AITaskPrompt
from app.schemas.work_block import WorkBlockCreate, WorkBlockUpdate, WorkBlockResponse
from app.services.task_service import TaskService
from app.core.ai.groq_adapter import GroqAdapter
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskResponse])
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = TaskService(db)
    return service.get_user_tasks(current_user.id)

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = TaskService(db)
    try:
        return service.create_task(current_user.id, task_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/ai-create", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task_directly_with_ai(
    payload: AITaskPrompt,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Direct autonomous task creation by Groq: parses instruction and builds the task directly in DB.
    """
    adapter = GroqAdapter()
    plan = adapter.parse_task_prompt(payload.prompt)

    # Transform parsed plan into TaskCreate schema with builder
    blocks_in = []
    for b in plan.get("work_blocks", []):
        blocks_in.append(WorkBlockCreate(
            day_name=b.get("day_name", "Lunes"),
            start_time=b.get("start_time"),
            end_time=b.get("end_time"),
            notes=b.get("notes")
        ))

    task_in = TaskCreate(
        title=plan.get("title", "Tarea programada con IA"),
        description=plan.get("description"),
        deadline=plan.get("deadline"),
        is_recurring=plan.get("is_recurring", False),
        recurrence_rule=plan.get("recurrence_rule"),
        work_blocks=blocks_in
    )

    service = TaskService(db)
    return service.create_task(current_user.id, task_in)

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = TaskService(db)
    task = service.get_task(task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = TaskService(db)
    task = service.update_task(task_id, current_user.id, task_in)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task

@router.patch("/blocks/{block_id}", response_model=WorkBlockResponse)
def update_work_block(
    block_id: int,
    block_in: WorkBlockUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = TaskService(db)
    block = service.update_block_status(
        block_id=block_id,
        user_id=current_user.id,
        completed=block_in.completed if block_in.completed is not None else False,
        notes=block_in.notes
    )
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque de trabajo no encontrado")
    return block

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = TaskService(db)
    success = service.delete_task(task_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return None
