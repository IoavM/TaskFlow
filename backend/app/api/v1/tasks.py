from typing import List, Union
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

@router.post("/ai-create", response_model=Union[TaskResponse, List[TaskResponse]], status_code=status.HTTP_201_CREATED)
def create_task_directly_with_ai(
    payload: AITaskPrompt,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Direct autonomous task creation by Groq: parses instruction and builds the task(s) directly in DB.
    Seamlessly handles single-task instructions as well as multi-task batch requests.
    """
    adapter = GroqAdapter()
    plan_data = adapter.parse_task_prompt(payload.prompt)

    # Normalize response to a list of individual task dictionaries
    task_dicts = []
    if isinstance(plan_data, list):
        task_dicts = [item for item in plan_data if isinstance(item, dict)]
    elif isinstance(plan_data, dict):
        if "tasks" in plan_data and isinstance(plan_data["tasks"], list):
            task_dicts = [item for item in plan_data["tasks"] if isinstance(item, dict)]
        else:
            task_dicts = [plan_data]

    if not task_dicts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo interpretar ninguna tarea a partir de la instrucción proporcionada."
        )

    service = TaskService(db)
    created_tasks = []

    for item in task_dicts:
        blocks_in = []
        for b in item.get("work_blocks", []):
            if isinstance(b, dict):
                blocks_in.append(WorkBlockCreate(
                    day_name=b.get("day_name", "Lunes"),
                    start_time=b.get("start_time"),
                    end_time=b.get("end_time"),
                    notes=b.get("notes")
                ))

        task_in = TaskCreate(
            title=item.get("title", "Tarea programada con IA"),
            description=item.get("description"),
            deadline=item.get("deadline"),
            is_recurring=item.get("is_recurring", False),
            recurrence_rule=item.get("recurrence_rule"),
            color=item.get("color", "blue"),
            work_blocks=blocks_in
        )
        created_task = service.create_task(current_user.id, task_in)
        created_tasks.append(created_task)

    if len(created_tasks) == 1:
        return created_tasks[0]
    return created_tasks

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
        completed=block_in.completed,
        notes=block_in.notes,
        color=block_in.color
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
