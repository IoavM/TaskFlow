import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any
from app.core.ai.ai_port import AITaskPlannerPort
from app.core.config import settings

class GeminiAdapter(AITaskPlannerPort):
    def __init__(self, api_key: str | None = None):
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
                prompt_instruction = (
                    "Eres un asistente de productividad y arquitectura de software para la app TaskFlow.\n"
                    "El usuario te va a dar una instrucción en lenguaje natural para programar una tarea o examen.\n"
                    "Tu trabajo es extraer los datos y devolver UNICAMENTE un objeto JSON válido con este formato exacto:\n"
                    "{\n"
                    '  "title": "Nombre corto y conciso de la tarea o examen",\n'
                    '  "description": "Descripción clara de lo que se va a realizar",\n'
                    '  "deadline": "YYYY-MM-DDTHH:MM:SS" (calcula la fecha de entrega o examen según el día mencionado),\n'
                    '  "is_recurring": true/false,\n'
                    '  "recurrence_rule": "diaria" | "semanal" (o null),\n'
                    '  "work_blocks": [\n'
                    '     {"day_name": "Lunes", "start_time": "14:00", "end_time": "16:00", "notes": "Sesión de estudio"}\n'
                    '  ]\n'
                    "}\n\n"
                    f"Fecha actual de referencia: {datetime.now().strftime('%Y-%m-%d %A')}\n"
                    f"Instrucción del usuario: '{user_prompt}'\n\n"
                    "REGLAS CRÍTICAS:\n"
                    "1. Si el usuario menciona una sola fecha o evento (ej: 'Tengo una presentación el viernes de 2 a 4' o 'Examen el jueves'), 'work_blocks' debe contener EXACTAMENTE Y ÚNICAMENTE ese día y ese horario. NUNCA agregues sesiones de preparación o días de estudio previos (como lunes o miércoles) a menos que el usuario lo haya pedido con palabras explícitas como 'quiero estudiar lunes y miércoles'.\n"
                    "2. Si no se especifican días de preparación, coloca un solo bloque para el día y hora indicados por el usuario.\n"
                    "3. 'day_name' debe ser uno de: 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'.\n"
                    "4. Devuelve SOLAMENTE el bloque JSON válido, sin texto adicional."
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
