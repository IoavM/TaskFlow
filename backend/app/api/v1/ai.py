from fastapi import APIRouter, Depends
from app.schemas.task import AITaskPrompt
from app.core.ai.groq_adapter import GroqAdapter
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/parse-task")
def parse_task_with_ai(payload: AITaskPrompt, current_user: User = Depends(get_current_user)):
    adapter = GroqAdapter()
    return adapter.parse_task_prompt(payload.prompt)
