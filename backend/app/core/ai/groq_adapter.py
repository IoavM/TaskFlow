import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.core.ai.ai_port import AITaskPlannerPort
from app.core.config import settings

class GroqAdapter(AITaskPlannerPort):
    CANDIDATE_MODELS = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b"
    ]

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.client = None
        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                print(f"[GroqAdapter] Initialization error: {e}")
                self.client = None

    def parse_task_prompt(self, user_prompt: str) -> Any:
        if self.client:
            for model_name in self.CANDIDATE_MODELS:
                try:
                    today_str = datetime.now().strftime("%Y-%m-%d %A")
                    system_prompt = (
                        "Eres el motor de inteligencia artificial de TaskFlow, un planificador de productividad ultra preciso.\n"
                        "Tu objetivo es transformar la instrucción del usuario en lenguaje natural en una o varias tareas limpias y exactas.\n\n"
                        "FORMATO DE RESPUESTA:\n"
                        "- Si el usuario pide UNA SOLA TAREA, responde ÚNICAMENTE con un objeto JSON:\n"
                        "{\n"
                        '  "title": "Nombre conciso y natural de la tarea (ej: \'Fútbol\', \'Examen de Matemáticas\')",\n'
                        '  "description": "Descripción clara de la actividad",\n'
                        '  "deadline": "YYYY-MM-DDTHH:MM:SS",\n'
                        '  "is_recurring": true/false,\n'
                        '  "recurrence_rule": "semanal" o null,\n'
                        '  "work_blocks": [\n'
                        '    {"day_name": "Miércoles", "start_time": "14:00", "end_time": "16:00", "notes": "Sesión programada"}\n'
                        '  ]\n'
                        "}\n\n"
                        "- Si el usuario pide DOS O MÁS TAREAS DIFERENTES (ej: 'dos tareas para el miércoles, una de matemáticas y otra de historia'), responde con un objeto JSON con la clave 'tasks' que contenga una lista de tareas, o un arreglo JSON de tareas:\n"
                        "{\n"
                        '  "tasks": [\n'
                        '    {"title": "Matemáticas", "description": "Estudiar matemáticas", "deadline": "YYYY-MM-DDTHH:MM:SS", "is_recurring": false, "recurrence_rule": null, "work_blocks": [...]},\n'
                        '    {"title": "Historia", "description": "Estudiar historia", "deadline": "YYYY-MM-DDTHH:MM:SS", "is_recurring": false, "recurrence_rule": null, "work_blocks": [...]}\n'
                        '  ]\n'
                        "}\n\n"
                        f"Fecha actual de referencia: {today_str}\n"
                        "REGLAS OBLIGATORIAS:\n"
                        "1. TÍTULO INTELIGENTE: Extrae el nombre nuclear de la actividad. Si el usuario dice 'martes y juves tengo fútbol de 2 a 4 pm', el título DEBE ser 'Fútbol'.\n"
                        "2. CORRECCIÓN DE TIPOS Y DIAS: Si el usuario escribe errores como 'juves' (Jueves), 'miercoles' (Miércoles), 'sabdo' (Sábado), 'domngo' (Domingo), corrígelos al nombre formal.\n"
                        "3. DÍAS VÁLIDOS: 'day_name' DEBE ser exactamente uno de: 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo' (con tildes y mayúscula inicial).\n"
                        "4. CERO DÍAS FANTASMAS: Si el usuario dice 'martes y juves', genera bloques ÚNICAMENTE para Martes y Jueves. NUNCA agregues sesiones de preparación en Lunes ni Miércoles ni ningún otro día no solicitado.\n"
                        "5. HORAS: Formato 24 horas HH:MM (ej: '2 a 4 pm' -> '14:00' a '16:00').\n"
                        "6. RECURRENCIA: Si se mencionan días de la semana fijos ('martes y jueves', 'todos los viernes', 'lunes a viernes'), marca 'is_recurring': true y 'recurrence_rule': 'semanal'. Si es un día único con fecha específica, 'is_recurring': false y 'recurrence_rule': null."
                    )

                    response = self.client.chat.completions.create(
                        model=model_name,
                        response_format={"type": "json_object"},
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        temperature=0.1
                    )
                    
                    raw_content = response.choices[0].message.content.strip()
                    parsed = json.loads(raw_content)
                    
                    # Sanitize days in work_blocks across both single and multi-task responses
                    valid_days = {
                        "lunes": "Lunes", "martes": "Martes", "miercoles": "Miércoles",
                        "miércoles": "Miércoles", "jueves": "Jueves", "viernes": "Viernes",
                        "sabado": "Sábado", "sábado": "Sábado", "domingo": "Domingo"
                    }

                    def _sanitize_task_dict(t: dict):
                        if not isinstance(t, dict):
                            return
                        if "work_blocks" in t and isinstance(t["work_blocks"], list):
                            for b in t["work_blocks"]:
                                if isinstance(b, dict):
                                    raw_day = str(b.get("day_name", "")).strip().lower()
                                    if raw_day in valid_days:
                                        b["day_name"] = valid_days[raw_day]

                    if isinstance(parsed, list):
                        for item in parsed:
                            _sanitize_task_dict(item)
                    elif isinstance(parsed, dict):
                        if "tasks" in parsed and isinstance(parsed["tasks"], list):
                            for item in parsed["tasks"]:
                                _sanitize_task_dict(item)
                        else:
                            _sanitize_task_dict(parsed)
                    
                    return parsed
                except Exception as e:
                    print(f"[GroqAdapter] Model {model_name} failed: {e}. Trying next...")
                    continue

        return self._heuristic_fallback(user_prompt)

    def _heuristic_fallback(self, user_prompt: str) -> Dict[str, Any]:
        p_lower = user_prompt.lower()
        days_map = {
            "lunes": "Lunes",
            "martes": "Martes",
            "miercoles": "Miércoles",
            "miércoles": "Miércoles",
            "juves": "Jueves",
            "jueves": "Jueves",
            "vierns": "Viernes",
            "viernes": "Viernes",
            "sabdo": "Sábado",
            "sabado": "Sábado",
            "sábado": "Sábado",
            "domngo": "Domingo",
            "domingo": "Domingo"
        }
        
        detected_days: List[str] = []
        for key, val in days_map.items():
            if re.search(rf"\b{key}\b", p_lower) and val not in detected_days:
                detected_days.append(val)

        if not detected_days:
            detected_days = ["Viernes"]

        start_t = "14:00"
        end_t = "16:00"
        time_match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(?:a|to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(pm|am)?", p_lower)
        if time_match:
            h1 = int(time_match.group(1))
            m1 = time_match.group(2) or "00"
            h2 = int(time_match.group(3))
            m2 = time_match.group(4) or "00"
            is_pm = time_match.group(5) == "pm" or ("pm" in p_lower) or ("tarde" in p_lower) or (h1 < 8)

            if is_pm:
                if h1 < 12: h1 += 12
                if h2 < 12: h2 += 12
            start_t = f"{h1:02d}:{m1}"
            end_t = f"{h2:02d}:{m2}"

        # Clean title extraction
        cleaned_title = user_prompt
        # Remove time mentions
        cleaned_title = re.sub(r"(\d{1,2})(?::\d{2})?\s*(?:a|to|-)\s*(\d{1,2})(?::\d{2})?\s*(?:pm|am)?", "", cleaned_title, flags=re.IGNORECASE)
        # Remove day words
        for k in days_map.keys():
            cleaned_title = re.sub(rf"\b{k}\b", "", cleaned_title, flags=re.IGNORECASE)
        # Remove common stop phrases
        cleaned_title = re.sub(r"\b(tengo|de|a|el|la|los|las|y|en|por|para|hora|horas)\b", "", cleaned_title, flags=re.IGNORECASE)
        cleaned_title = re.sub(r"\s+", " ", cleaned_title).strip().capitalize()
        if not cleaned_title or len(cleaned_title) < 2:
            cleaned_title = "Actividad Planificada"

        blocks = [{"day_name": d, "start_time": start_t, "end_time": end_t, "notes": f"Sesión de {cleaned_title}"} for d in detected_days]
        today = datetime.now()
        target_deadline = today + timedelta(days=7 if len(detected_days) > 1 else 3)

        return {
            "title": cleaned_title,
            "description": f"Plan organizado para {cleaned_title}",
            "deadline": target_deadline.isoformat(),
            "is_recurring": len(detected_days) > 1 or "cada" in p_lower or "semana" in p_lower,
            "recurrence_rule": "semanal" if (len(detected_days) > 1 or "semana" in p_lower) else None,
            "work_blocks": blocks
        }
