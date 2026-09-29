import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any
from app.core.ai.ai_port import AITaskPlannerPort
from app.core.config import settings

class GeminiAdapter(AITaskPlannerPort):
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel("gemini-3.8-flash")
            except Exception:
                self.client = None

    def parse_task_prompt(self, user_prompt: str) -> Dict[str, Any]:
        if self.client:
            try:
                today_dt = datetime.now()
                today_str = today_dt.strftime("%Y-%m-%d %A")
                prompt_instruction = (
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
                    "5. RECURRENCIA: Pon is_recurring: true únicamente si se indican eventos periódicos continuos ('todos los viernes', 'lunes y miércoles fijos', 'cada semana'). Para proyectos, laboratorios, exámenes o tareas de entrega puntual, pon is_recurring: false y recurrence_rule: null.\n"
                    "6. Devuelve SOLAMENTE el bloque JSON válido, sin texto adicional."
                )
                response = self.client.generate_content(prompt_instruction)
                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text)
                return json.loads(raw_text)
            except Exception as e:
                print(f"[GeminiAdapter] Error generating content: {e}")

        # Fallback heurístico inteligente detectando el día mencionado
        p_lower = user_prompt.lower()
        days_map = {
            "lunes": "Lunes",
            "martes": "Martes",
            "miercoles": "Miércoles",
            "miércoles": "Miércoles",
            "jueves": "Jueves",
            "viernes": "Viernes",
            "sabado": "Sábado",
            "sábado": "Sábado",
            "domingo": "Domingo"
        }
        detected_days = [val for key, val in days_map.items() if key in p_lower]
        if not detected_days:
            detected_days = ["Viernes"]

        # Parse hours if mentioned like '2 a 4' or '14:00'
        start_t = "14:00"
        end_t = "16:00"
        time_match = re.search(r"(\d{1,2})\s*(?:a|to|-)\s*(\d{1,2})", p_lower)
        if time_match:
            h1 = int(time_match.group(1))
            h2 = int(time_match.group(2))
            if h1 < 12 and ("tarde" in p_lower or h1 <= 6):
                h1 += 12
            if h2 < 12 and ("tarde" in p_lower or h2 <= 6):
                h2 += 12
            start_t = f"{h1:02d}:00"
            end_t = f"{h2:02d}:00"

        blocks = [{"day_name": d, "start_time": start_t, "end_time": end_t, "notes": "Sesión programada"} for d in detected_days]

        today = datetime.now()
        target_deadline = today + timedelta(days=4)
        return {
            "title": user_prompt[:40] if len(user_prompt) > 40 else user_prompt,
            "description": f"Plan generado a partir de: {user_prompt}",
            "deadline": target_deadline.isoformat(),
            "is_recurring": "cada" in p_lower or "repetir" in p_lower,
            "recurrence_rule": "semanal" if "semana" in p_lower else None,
            "work_blocks": blocks
        }
