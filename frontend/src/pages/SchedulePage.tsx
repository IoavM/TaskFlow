import React, { useState, useEffect } from 'react';
import { Plus, LogOut, CheckCircle2, ListTodo, Sparkles, LayoutGrid, Calendar, Palette, PanelLeft, PanelLeftClose, X } from 'lucide-react';
import { Schedule } from '../components/Schedule/Schedule';
import { HourlyCalendar } from '../components/HourlyCalendar/HourlyCalendar';
import { MiniCalendar } from '../components/MiniCalendar/MiniCalendar';
import { SidebarOptions } from '../components/SidebarOptions/SidebarOptions';
import { TaskModal } from '../components/TaskModal/TaskModal';
import { PersonalizationModal } from '../components/PersonalizationModal/PersonalizationModal';
import { ConfirmModal } from '../components/ConfirmModal/ConfirmModal';
import { LiquidPill } from '../components/LiquidGlass/LiquidPill';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import type { Task } from '../types';

interface SchedulePageProps {
  onLogout: () => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({ onLogout }) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'columns' | 'calendar'>('columns');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUser = api.getCurrentStoredUser();

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al cargar las tareas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggleBlock = async (blockId: number, currentCompleted: boolean) => {
    try {
      await api.toggleBlockStatus(blockId, !currentCompleted);
      await loadTasks();
      toast.success(currentCompleted ? 'Bloque marcado como pendiente' : '¡Bloque completado!');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el estado del bloque.');
    }
  };

  const handleToggleTaskStatus = async (taskId: number, currentCompleted: boolean) => {
    try {
      const nextStatus = currentCompleted ? 'pending' : 'completed';
      await api.updateTask(taskId, { status: nextStatus });
      await loadTasks();
      toast.success(currentCompleted ? 'Tarea marcada como pendiente' : '¡Tarea completada!');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el estado de la tarea.');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setTaskToDelete(taskId);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteTask(taskToDelete);
      toast.success('Tarea eliminada exitosamente.');
      setTaskToDelete(null);
      await loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la tarea.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleDirectAICreate = async (prompt: string) => {
    try {
      await api.createTaskDirectlyWithAI(prompt);
      toast.success('¡Tarea creada exitosamente con IA!');
      await loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Error al generar la tarea con IA');
      throw err;
    }
  };

  const handleUpdateTaskColor = async (taskId: number, newColor: string) => {
    try {
      await api.updateTask(taskId, { color: newColor });
      await loadTasks();
      toast.success('Color actualizado correctamente.');
    } catch (err: any) {
      console.error('Error al actualizar color de tarea:', err);
      toast.error(err.message || 'Error al actualizar color de la tarea.');
    }
  };

  const userDisplayName = currentUser?.first_name?.trim() || currentUser?.email?.split('@')[0] || 'Usuario';

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="min-h-screen relative flex flex-col text-[#0F172A] w-full max-w-full overflow-x-hidden">
      {/* Dynamic ambient liquid mesh orbs for visible glass refraction */}
      <div className="ambient-mesh" aria-hidden="true">
        <div className="liquid-orb liquid-orb-1" />
        <div className="liquid-orb liquid-orb-2" />
        <div className="liquid-orb liquid-orb-3" />
        <div className="liquid-orb liquid-orb-4" />
      </div>

      {/* Top Navbar with Liquid Glass */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/80 shadow-2xs px-3 sm:px-6 py-3 flex items-center justify-between w-full max-w-full">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Sidebar & Music Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-white/85 hover:bg-white text-slate-700 border border-slate-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            title="Abrir panel lateral y música"
          >
            <PanelLeft className="w-4 h-4 text-[#0052FF]" />
            <span className="hidden xs:inline">Panel</span>
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0052FF] to-[#3B82F6] text-white flex items-center justify-center shadow-md shadow-blue-500/25 font-bold shrink-0">
            TF
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#0F172A] font-sans leading-tight">
              TaskFlow
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 border border-slate-200/70 shadow-2xs text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400" />
            <span className="font-semibold text-slate-800 truncate max-w-[110px] sm:max-w-[160px]" title={userDisplayName}>
              {userDisplayName}
            </span>
          </div>

          {/* Personalization Button */}
          <button
            onClick={() => setIsPersonalizationOpen(true)}
            className="px-3 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Personalizar temas y Liquid Glass"
          >
            <Palette className="w-3.5 h-3.5 text-[#0052FF]" />
            <span className="hidden sm:inline">Personalizar</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-[#0052FF] text-white text-xs font-semibold hover:bg-[#0038B6] transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/30 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Tarea</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 hover:text-red-600 hover:bg-white transition-colors cursor-pointer shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout (Fluid full width for large monitors and laptops, no wasted side space) */}
      <main className="relative flex-1 w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 flex flex-col lg:flex-row gap-6 items-start">
        {/* Mobile Drawer Backdrop Overlay (Closes drawer on click) */}
        <div
          className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
            isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />

        {/* LEFT COLUMN: Persistent Sidebar (Desktop) & Animated Slide-Over Drawer (Mobile) */}
        {/* KEPT MOUNTED IN DOM AT ALL TIMES SO SPOTIFY NEVER STOPS PLAYING */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-[92vw] sm:w-[380px] max-w-[420px] h-full overflow-y-auto bg-slate-50/95 backdrop-blur-2xl border-r border-slate-200/90 shadow-2xl p-3 sm:p-4
            ${isMobileDrawerOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'}
            lg:static lg:inset-auto lg:h-auto lg:z-auto lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:border-r-0 lg:shadow-none lg:translate-x-0
            ${isSidebarOpen 
              ? 'lg:w-[340px] xl:w-[350px] 2xl:w-[370px] lg:max-w-none lg:opacity-100 lg:pointer-events-auto lg:overflow-visible' 
              : 'lg:w-0 lg:max-w-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden lg:-mr-6'
            }
            transition-all duration-300 ease-in-out shrink-0
          `}
        >
          {/* Header inside mobile drawer */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0052FF] to-[#3B82F6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                TF
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Navegación & Música</span>
                <span className="text-[10px] text-slate-500">Calendario, Spotify e IA</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 border border-slate-200/80 shadow-2xs cursor-pointer"
              title="Cerrar panel lateral"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full lg:w-[340px] xl:w-[350px] 2xl:w-[370px] space-y-4">
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
              }}
            />

            <SidebarOptions
              onDirectAICreate={handleDirectAICreate}
              onOpenManualModal={handleOpenCreateModal}
            />
          </div>
        </aside>

        {/* RIGHT COLUMN: Metrics Banner, View Switchers, and Schedule/Calendar */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* Quick Metrics & View Toggle Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl glass-panel flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Desktop Sidebar Collapse/Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-slate-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                title={isSidebarOpen ? "Ocultar panel lateral para ganar espacio" : "Mostrar panel lateral"}
              >
                {isSidebarOpen ? (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5 text-[#0052FF]" />
                    <span className="hidden xl:inline">Ocultar Lateral</span>
                  </>
                ) : (
                  <>
                    <PanelLeft className="w-3.5 h-3.5 text-[#0052FF]" />
                    <span>Ver Lateral</span>
                  </>
                )}
              </button>

              {/* Mobile Sidebar Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-slate-700 border border-slate-200/80 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                title="Abrir panel lateral y música"
              >
                <PanelLeft className="w-3.5 h-3.5 text-[#0052FF]" />
                <span>Panel & Spotify</span>
              </button>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50/90 text-[#0052FF] border border-blue-100">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Tareas</span>
                  <p className="text-base font-bold text-slate-800">{totalTasks}</p>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200/80" />

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50/90 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Completadas</span>
                  <p className="text-base font-bold text-emerald-600">{completedTasks}</p>
                </div>
              </div>
            </div>

            {/* Dashboard View Switcher (Tareas por Día vs Google Calendar) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('columns')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === 'columns'
                      ? 'bg-white text-[#0052FF] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Tareas por Día</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-white text-[#0052FF] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Vista por Horas</span>
                </button>
              </div>
            </div>
          </div>

          {/* Schedule or Hourly Calendar Component */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Cargando cronograma...</div>
          ) : viewMode === 'columns' ? (
            <Schedule
              tasks={tasks}
              selectedDate={selectedDate}
              onToggleBlock={handleToggleBlock}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
              onUpdateColor={handleUpdateTaskColor}
              onToggleTaskStatus={handleToggleTaskStatus}
            />
          ) : (
            <HourlyCalendar
              tasks={tasks}
              selectedDate={selectedDate}
              onToggleBlock={handleToggleBlock}
              onEditTask={handleEditTask}
            />
          )}
        </div>
      </main>

      {/* Task Creation & Editing Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        taskToEdit={editingTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onTaskCreated={loadTasks}
      />

      {/* Personalization & Liquid Glass Modal */}
      <PersonalizationModal
        isOpen={isPersonalizationOpen}
        onClose={() => setIsPersonalizationOpen(false)}
      />

      {/* Confirmation Modal for Task Deletion */}
      <ConfirmModal
        isOpen={taskToDelete !== null}
        title="¿Eliminar tarea?"
        message="¿Estás seguro de que deseas eliminar esta tarea y todos sus bloques de trabajo? Esta acción no se puede deshacer."
        confirmText="Eliminar Tarea"
        cancelText="Cancelar"
        danger
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
