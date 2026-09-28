# TaskFlow

Sistema inteligente de gestión de tareas y cronograma semanal con estilos **Glassmorphism**, arquitectura en 4 capas y asistencia de IA con **Gemini**.

---

## 🏗️ Arquitectura del Sistema (4 Capas)

```text
[ FRONTEND / NAVEGADOR ]
└── Capa 1: Presentación
    ├── React 19 + TypeScript + Tailwind CSS
    └── Componentes modulares Glassmorphism (AuthForm, Schedule, MiniCalendar, TaskModal, SidebarOptions, TermsModal)

[ BACKEND / SERVIDOR PRIVADO (FastAPI) ]
├── Capa 2: Negocio
│   ├── TaskService & AuthService
│   └── TaskBuilder (Patrón Builder para construcción de tareas y bloques de trabajo)
├── Capa 3: Datos
│   ├── Modelos SQLAlchemy (User, Task, WorkBlock)
│   ├── Repositorios (UserRepository, TaskRepository)
│   └── Conexión a PostgreSQL (Neon) con fallback a SQLite local
└── Capa 4: Transversal (Seguridad & Mantenimiento)
    ├── Autenticación JWT + Bcrypt
    └── GeminiAdapter (Patrón Adapter para integración segura con Gemini API)
```

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Iniciar el Backend (FastAPI)
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
* La documentación interactiva de Swagger estará en: `http://localhost:8000/docs`
* Si configuras tu base de datos de Neon o tu API Key de Gemini, edita el archivo `backend/.env`. Si lo dejas por defecto, funcionará automáticamente en modo local con SQLite.

### 2. Iniciar el Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm run dev
```
* La aplicación se abrirá en `http://localhost:5173`.
