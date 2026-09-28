import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Clock,
  Check,
  Loader2,
  Calendar,
  Repeat,
  ChevronDown,
  CheckSquare,
} from 'lucide-react';
import { Task, TaskCreateInput, WorkBlockInput } from '../../types';
import { api } from '../../services/api';
import config from './TaskModal.json';
import { TimePicker } from '../TimePicker/TimePicker';
import './TaskModal.css';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  taskToEdit?: Task | null;
}

const ALL_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WORK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const WEEKEND_DAYS = ['Sábado', 'Domingo'];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  taskToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'single' | 'recurring'>('single');
  const [recurrenceRule, setRecurrenceRule] = useState('semanal');

  // Single Task State (Date + Unified Time Range)
  const [singleDate, setSingleDate] = useState('');
  const [singleStartTime, setSingleStartTime] = useState('14:00');
  const [singleEndTime, setSingleEndTime] = useState('16:00');

  // Recurring Task State (Days Checkboxes + Time Range)
  const [isDaysExpanded, setIsDaysExpanded] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>(WORK_DAYS);
  const [dailyStartTime, setDailyStartTime] = useState('14:00');
  const [dailyEndTime, setDailyEndTime] = useState('16:00');

  const [aiPrompt, setAiPrompt] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to extract YYYY-MM-DD from string
  const extractDateOnly = (iso?: string | null) => {
    if (!iso) {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }
    return iso.replace(' ', 'T').slice(0, 10);
  };

  // Helper to extract HH:MM from string
  const extractTimeOnly = (iso?: string | null, fallback: string = '14:00') => {
    if (!iso) return fallback;
    const parts = iso.replace(' ', 'T').split('T');
    if (parts[1]) {
      return parts[1].slice(0, 5);
    }
    return fallback;
  };

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setDescription(taskToEdit.description || '');

        const isRec = Boolean(taskToEdit.is_recurring);
        setTaskType(isRec ? 'recurring' : 'single');
        setRecurrenceRule(taskToEdit.recurrence_rule || 'semanal');

        // Extract date
        const dStr = extractDateOnly(taskToEdit.deadline);
        setSingleDate(dStr);

        // Extract hours from work_blocks or deadline
        const block = taskToEdit.work_blocks && taskToEdit.work_blocks.length > 0 ? taskToEdit.work_blocks[0] : null;
        const sTime = block?.start_time || extractTimeOnly(taskToEdit.deadline, '14:00');
        const eTime = block?.end_time || '16:00';

        setSingleStartTime(sTime);
        setSingleEndTime(eTime);
        setDailyStartTime(sTime);
        setDailyEndTime(eTime);

        // Recurring days
        if (taskToEdit.work_blocks && taskToEdit.work_blocks.length > 0) {
          if (taskToEdit.work_blocks.some((b) => b.day_name.toLowerCase() === 'todos')) {
            setSelectedDays(ALL_DAYS);
          } else {
            const days = taskToEdit.work_blocks
              .map((b) => b.day_name)
              .filter((d) => ALL_DAYS.includes(d));
            setSelectedDays(days.length > 0 ? days : WORK_DAYS);
          }
        } else {
          setSelectedDays(WORK_DAYS);
        }
      } else {
        // Defaults for new task
        setTitle('');
        setDescription('');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setSingleDate(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`);
        setSingleStartTime('14:00');
        setSingleEndTime('16:00');
        setDailyStartTime('14:00');
        setDailyEndTime('16:00');
        setSelectedDays(WORK_DAYS);
        setIsDaysExpanded(true);
        setTaskType('single');
        setRecurrenceRule('semanal');
        setAiPrompt('');
      }
      setError(null);
    }
  }, [isOpen, taskToEdit]);

  if (!isOpen) return null;

  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSelectPreset = (preset: 'work' | 'all' | 'weekend') => {
    if (preset === 'work') setSelectedDays(WORK_DAYS);
    else if (preset === 'all') setSelectedDays(ALL_DAYS);
    else if (preset === 'weekend') setSelectedDays(WEEKEND_DAYS);
  };

  const handleAIParse = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setLoadingAI(true);
      setError(null);
      const plan = await api.parseTaskWithAI(aiPrompt);
      if (plan.title) setTitle(plan.title);
      if (plan.description) setDescription(plan.description);
      if (plan.deadline) {
        setSingleDate(extractDateOnly(plan.deadline));
        const t = extractTimeOnly(plan.deadline);
        setSingleStartTime(t);
        const [h, m] = t.split(':');
        const endH = (parseInt(h, 10) + 1) % 24;
        setSingleEndTime(`${endH.toString().padStart(2, '0')}:${m || '00'}`);
      }
      if (plan.is_recurring !== undefined) {
        setTaskType(plan.is_recurring ? 'recurring' : 'single');
      }
      if (plan.recurrence_rule) setRecurrenceRule(plan.recurrence_rule);
      if (plan.work_blocks && plan.work_blocks.length > 0) {
        const days = plan.work_blocks.map((b) => b.day_name).filter((d) => ALL_DAYS.includes(d));
        if (days.length > 0) setSelectedDays(days);
        if (plan.work_blocks[0]?.start_time) {
          setSingleStartTime(plan.work_blocks[0].start_time);
          setDailyStartTime(plan.work_blocks[0].start_time);
        }
        if (plan.work_blocks[0]?.end_time) {
          setSingleEndTime(plan.work_blocks[0].end_time);
          setDailyEndTime(plan.work_blocks[0].end_time);
        }
      }
    } catch (err: any) {
      setError('No se pudo procesar con el asistente IA. Rellena los datos manualmente.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El nombre de la tarea es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const isRecurring = taskType === 'recurring';
      let finalBlocks: WorkBlockInput[] = [];
      let formattedDeadline: string | undefined = undefined;

      if (!isRecurring) {
        // Tarea Única: unified singleDate + singleStartTime
        const [y, m, d] = singleDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = !isNaN(dateObj.getTime()) ? daysMap[dateObj.getDay()] : 'Lunes';

        formattedDeadline = `${singleDate}T${singleStartTime}:00`;

        finalBlocks = [
          {
            day_name: dayName,
            start_time: singleStartTime,
            end_time: singleEndTime,
            notes: title,
          },
        ];
      } else {
        // Tarea Recurrente: uses selected days from checkboxes
        if (selectedDays.length === 0) {
          setError('Debes seleccionar al menos un día en el que se repita la tarea.');
          setSubmitting(false);
          return;
        }

        finalBlocks = selectedDays.map((day) => ({
          day_name: day,
          start_time: dailyStartTime,
          end_time: dailyEndTime,
          notes: title,
        }));
      }

      const payload: TaskCreateInput = {
        title,
        description: description || undefined,
        deadline: formattedDeadline,
        is_recurring: isRecurring,
        recurrence_rule: isRecurring ? recurrenceRule : undefined,
        work_blocks: finalBlocks,
      };

      if (taskToEdit) {
        await api.updateTask(taskToEdit.id, payload);
      } else {
        await api.createTask(payload);
      }
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la tarea.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="task-modal-backdrop" role="dialog" aria-modal="true">
      <div className="task-modal-dialog">
        <div className="flex items-start justify-between pb-4 border-b border-slate-200/70">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              {taskToEdit ? 'Editar Tarea' : config.title}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {taskToEdit ? 'Modifica el horario y detalles de tu tarea' : config.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Smart Assistant Bar */}
        <div className="my-5 p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border border-blue-200/70">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0052FF] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asistente Inteligente</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={config.aiPromptPlaceholder}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-blue-200 bg-white/90 text-slate-800 focus:outline-none focus:border-[#0052FF]"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAIParse())}
            />
            <button
              type="button"
              onClick={handleAIParse}
              disabled={loadingAI || !aiPrompt.trim()}
              className="px-3.5 py-2 bg-[#0052FF] text-white text-xs font-semibold rounded-lg hover:bg-[#0038B6] disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Autocompletar</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Tarea <span className="text-[#0052FF]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Presentación de Computación en la Nube"
              className="glass-input w-full text-sm px-3.5 py-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas y objetivos de la tarea..."
              className="glass-input w-full text-sm px-3.5 py-2 rounded-lg resize-none"
            />
          </div>

          {/* Selector de Tipo: Tarea Única vs Recurrente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Programación
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setTaskType('single')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  taskType === 'single'
                    ? 'bg-white text-[#0052FF] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tarea Única (Puntual)</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskType('recurring')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  taskType === 'recurring'
                    ? 'bg-white text-[#0052FF] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Tarea Recurrente</span>
              </button>
            </div>
          </div>

          {/* Configuración según Tipo de Tarea */}
          {taskType === 'single' ? (
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Fecha de Realización
                </label>
                <input
                  type="date"
                  required
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="glass-input w-full text-xs px-3 py-2 rounded-lg bg-white"
                />
              </div>

              <div className="pt-2 border-t border-blue-100/80 flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#0052FF]" />
                  <span>Horario de Realización:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TimePicker
                    value={singleStartTime}
                    onChange={(val) => setSingleStartTime(val)}
                  />
                  <span className="text-slate-400 font-medium">a</span>
                  <TimePicker
                    value={singleEndTime}
                    onChange={(val) => setSingleEndTime(val)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-4">
              {/* Expansible con Casillas de Check para Selección de Días */}
              <div className="recurrence-expansible">
                {/* Cabecera del Acordeón / Expansible */}
                <button
                  type="button"
                  onClick={() => setIsDaysExpanded(!isDaysExpanded)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4 text-[#0052FF]" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Días en que se repite la tarea
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {selectedDays.length === 7
                          ? 'Todos los días (Lunes a Domingo)'
                          : selectedDays.length === 5 &&
                            !selectedDays.includes('Sábado') &&
                            !selectedDays.includes('Domingo')
                          ? 'Lunes a Viernes (Días laborales)'
                          : `${selectedDays.length} día(s) seleccionado(s)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#0052FF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {selectedDays.length} / 7
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isDaysExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Panel Expansible con Casillas de Check y Atajos */}
                {isDaysExpanded && (
                  <div className="p-3.5 pt-2 border-t border-slate-200/70 space-y-3 bg-white">
                    {/* Botones de Selección Rápida */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">
                        Atajos:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset('work')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          selectedDays.length === 5 &&
                          !selectedDays.includes('Sábado') &&
                          !selectedDays.includes('Domingo')
                            ? 'bg-[#0052FF] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Lunes a Viernes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset('all')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          selectedDays.length === 7
                            ? 'bg-[#0052FF] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Todos los días
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset('weekend')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          selectedDays.length === 2 &&
                          selectedDays.includes('Sábado') &&
                          selectedDays.includes('Domingo')
                            ? 'bg-[#0052FF] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Fines de semana
                      </button>
                    </div>

                    {/* Casillas de Check por cada Día */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {ALL_DAYS.map((day) => {
                        const isChecked = selectedDays.includes(day);
                        return (
                          <label
                            key={day}
                            className={`day-checkbox-item ${isChecked ? 'checked' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDay(day)}
                              className="w-4 h-4 rounded text-[#0052FF] focus:ring-0 border-slate-300 cursor-pointer"
                            />
                            <span
                              className={`text-xs ${
                                isChecked ? 'font-bold text-[#0052FF]' : 'text-slate-700 font-medium'
                              }`}
                            >
                              {day}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Horario para los Días Seleccionados */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Horario para los días seleccionados
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Se programará en cada uno de los días marcados
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-[#0052FF]" />
                  <TimePicker
                    value={dailyStartTime}
                    onChange={(val) => setDailyStartTime(val)}
                  />
                  <span className="text-slate-400 font-medium">a</span>
                  <TimePicker
                    value={dailyEndTime}
                    onChange={(val) => setDailyEndTime(val)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#0052FF] text-white text-xs font-semibold hover:bg-[#0038B6] flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{taskToEdit ? 'Guardar Cambios' : 'Guardar Tarea'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
