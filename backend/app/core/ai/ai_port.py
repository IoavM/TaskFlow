from abc import ABC, abstractmethod
from typing import Dict, Any

class AITaskPlannerPort(ABC):
    @abstractmethod
    def parse_task_prompt(self, user_prompt: str) -> Dict[str, Any]:
        """
        Parses a natural language task description into structured task data
        with planned work blocks and deadline.
        """
        pass
