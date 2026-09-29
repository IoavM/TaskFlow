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

    def parse_task_prompt(self, user_prompt: str) -> Dict[str, Any]:
        if self.client:
            for model_name in self.CANDIDATE_MODELS:
                try:
                    today_dt = datetime.now()
                    today_str = today_dt.strftime("%Y-%m-%d %A")
                    system_prompt = (
                        "Eres el motor de inteligencia artificial de TaskFlow, un planificador de productividad ultra preciso.\n"
                        "Tu objetivo es transformar la instrucción del usuario en lenguaje natural en una estructura de tarea limpia y exacta.\n"
                        "Debes responder ÚNICAMENTE con un objeto JSON válido con este formato exacto:\n"
                        "{\n"
                        '  "title": "Nombre conciso y natural de la tarea (ej: \'Laboratorio\', \'Fútbol\', \'Examen de Matemáticas\')",\n'
                        '  "description": "Descripción clara de la actividad",\n'
                        '  "deadline": "YYYY-MM-DDTHH:MM:SS" (o null si no tiene fecha límite de entrega),\n'
                        '  "is_recurring": false,\n'
                        '  "recurrence_rule": null,\n'
                        '  "work_blocks": [\n'
                        '    {"day_name": "Lunes", "start_time": "14:00", "end_time": "16:00", "notes": "Sesión de trabajo"}\n'
                        '  ]\n'
                        "}\n\n"
                        f"Fecha y hora actual de referencia: {today_str}\n"
                        "REGLAS OBLIGATORIAS:\n"
                        "1. DISTINCIÓN CRÍTICA ENTRE ENTREGA (DEADLINE) Y SESIÓN DE TRABAJO (WORK_BLOCKS):\n"
                        "   - Si el usuario indica fecha de entrega o examen (ej: 'para entregarlo el miércoles', 'entrega el viernes', 'examen el jueves'), calcula esa fecha futura y colócala en 'deadline' (hora 23:59:00 o la hora indicada).\n"
                        "   - Si el usuario indica cuándo desea trabajarlo, estudiarlo o prepararlo (ej: 'quiero trabajarlo hoy', 'hacerlo hoy de 2 a 4', 'estudiar el martes'), los 'work_blocks' DEBEN corresponder a esos días y horas de trabajo programado (ej: si dice 'hoy', usa el día actual de la semana de la fecha de referencia).\n"
                        "   - Ejemplo: si hoy es Lunes y dice 'laboratorio para entregar el miércoles y quiero trabajarlo hoy de 2 a 4 pm': 'deadline' es el Miércoles 23:59:00, y 'work_blocks' es un bloque en 'Lunes' de '14:00' a '16:00', con is_recurring: false.\n"
                        "2. TÍTULO INTELIGENTE: Extrae el nombre nuclear de la actividad. Si el usuario dice 'hacer un laboratorio que es para entregarlo el miércoles y quería trabajarlo hoy', el título DEBE ser 'Laboratorio' (o 'Laboratorio de [Materia]' si se menciona). NUNCA pongas toda la frase como título.\n"
                        "3. DÍAS VÁLIDOS: 'day_name' DEBE ser exactamente uno de: 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo' (con tildes y mayúscula inicial).\n"
                        "4. HORAS: Formato 24 horas HH:MM (ej: '2 a 4 pm' -> '14:00' a '16:00'). Si no especifica hora, usa '14:00' a '16:00'.\n"
                        "5. RECURRENCIA: Pon is_recurring: true únicamente si se indican eventos periódicos continuos ('todos los viernes', 'lunes y miércoles fijos', 'cada semana'). Para proyectos, laboratorios, exámenes o tareas de entrega puntual, pon is_recurring: false y recurrence_rule: null."
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
                    
                    # Sanitize and ensure format
                    if "work_blocks" in parsed and isinstance(parsed["work_blocks"], list):
                        valid_days = {"lunes": "Lunes", "martes": "Martes", "miercoles": "Miércoles", "miércoles": "Miércoles", "jueves": "Jueves", "viernes": "Viernes", "sabado": "Sábado", "sábado": "Sábado", "domingo": "Domingo"}
                        for b in parsed["work_blocks"]:
                            raw_day = str(b.get("day_name", "")).strip().lower()
                            if raw_day in valid_days:
                                b["day_name"] = valid_days[raw_day]
                    
                    return parsed
                except Exception as e:
                    print(f"[GroqAdapter] Model {model_name} failed: {e}. Trying next...")
                    continue

        return self._heuristic_fallback(user_prompt)

    def _heuristic_fallback(self, user_prompt: str) -> Dict[str, Any]:
        p_lower = user_prompt.lower()
        now = datetime.now()
        days_names_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        today_day_name = days_names_es[now.weekday()]
        tomorrow_day_name = days_names_es[(now.weekday() + 1) % 7]

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

        # Check if deadline day is specified (e.g. "para entregar el miercoles", "entrega el viernes")
        deadline_day = None
        deadline_match = re.search(r"(?:para\s+entregar|entregar|entrega|fecha\s+l[íi]mite|examen)(?:\s+el)?\s+([a-záéíóú]+)", p_lower)
        if deadline_match:
            cand = deadline_match.group(1).lower()
            if cand in days_map:
                deadline_day = days_map[cand]

        # Determine work days
        work_days: List[str] = []
        if "hoy" in p_lower:
            work_days.append(today_day_name)
        if "mañana" in p_lower or "manana" in p_lower:
            if tomorrow_day_name not in work_days:
                work_days.append(tomorrow_day_name)

        # If no relative day found, search for explicit day names excluding the deadline day
        for key, val in days_map.items():
            if re.search(rf"\b{key}\b", p_lower):
                if val != deadline_day and val not in work_days:
                    work_days.append(val)

        # If work days still empty, use today or deadline day
        if not work_days:
            if deadline_day:
                work_days = [today_day_name]
            else:
                work_days = [today_day_name]

        # Hours extraction
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
        # Remove day words and phrases
        for k in list(days_map.keys()) + ["hoy", "mañana", "manana"]:
            cleaned_title = re.sub(rf"\b{k}\b", "", cleaned_title, flags=re.IGNORECASE)
        cleaned_title = re.sub(r"\b(hacer\s+un|hacer|tengo\s+un|tengo|quer[íi]a|quiero|trabajarlo|estudiar|para\s+entregarlo|entregarlo|entrega|de|a|el|la|los|las|y|en|por|para|hora|horas|pm|am)\b", "", cleaned_title, flags=re.IGNORECASE)
        cleaned_title = re.sub(r"\s+", " ", cleaned_title).strip().capitalize()
        if not cleaned_title or len(cleaned_title) < 2:
            cleaned_title = "Laboratorio" if "laboratorio" in p_lower else "Actividad Planificada"

        blocks = [{"day_name": d, "start_time": start_t, "end_time": end_t, "notes": f"Sesión de {cleaned_title}"} for d in work_days]
        
        # Calculate deadline ISO string
        target_deadline = None
        if deadline_day:
            day_idx_map = {"lunes": 0, "martes": 1, "miércoles": 2, "miercoles": 2, "jueves": 3, "viernes": 4, "sábado": 5, "sabado": 5, "domingo": 6}
            d_idx = day_idx_map.get(deadline_day.lower(), now.weekday())
            diff = (d_idx - now.weekday()) % 7
            if diff == 0: diff = 7
            d_date = now + timedelta(days=diff)
            target_deadline = d_date.strftime("%Y-%m-%dT23:59:00")
        else:
            target_deadline = (now + timedelta(days=3)).strftime("%Y-%m-%dT23:59:00")

        return {
            "title": cleaned_title,
            "description": f"Plan organizado para {cleaned_title}",
            "deadline": target_deadline,
            "is_recurring": ("cada" in p_lower or "todos los" in p_lower),
            "recurrence_rule": "semanal" if ("cada" in p_lower or "todos los" in p_lower) else None,
            "work_blocks": blocks
        }

