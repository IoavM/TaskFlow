import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, Trash2, Calendar as CalIcon, Repeat, Palette } from 'lucide-react';
import { Task, WorkBlock } from '../../types';
import { getTaskColorTheme, TASK_COLORS } from '../../utils/taskColors';
import config from './Schedule.json';
import './Schedule.css';

interface ScheduleProps {
  tasks: Task[];
  selectedDate?: Date;
  onToggleBlock: (blockId: number, currentCompleted: boolean) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onEditTask: (task: Task) => void;
  onUpdateColor?: (taskId: number, color: string) => Promise<void>;
}

export const Schedule: React.FC<ScheduleProps> = ({
  tasks,
  selectedDate = new Date(),
  onToggleBlock,
  onDeleteTask,
  onEditTask,
  onUpdateColor,
}) => {
  const [activeColorTaskId, setActiveColorTaskId] = useState<number | null>(null);
  const [mobileActiveDay, setMobileActiveDay] = useState<string>('all');
  // Compute the 7 dates for the week containing selectedDate
  const getWeekDates = (baseDate: Date) => {
    const d = new Date(baseDate);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const dayKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return dayKeys.map((key, index) => {
      const colDate = new Date(monday);
      colDate.setDate(monday.getDate() + index);

      const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

      return {
        key,
        label: dayLabels[index],
        date: colDate,
        dayNumber: colDate.getDate(),
        monthShort: colDate.toLocaleDateString('es-ES', { month: 'short' }),
        isToday: isSameDay(colDate, new Date()),
        isSelected: isSameDay(colDate, baseDate),
      };
    });
  };

  const weekDays = getWeekDates(selectedDate);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  // Filter tasks that belong to a specific day column
  const getTasksForDay = (dayKey: string, columnDate: Date) => {
    const items: Array<{ task: Task; block?: WorkBlock; isDeadline?: boolean }> = [];
    const dayNameNorm = dayKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    tasks.forEach((task) => {
      // 1. Recurring task -> Appears only on the specific days selected by user
      if (task.is_recurring) {
        if (task.recurrence_rule === 'mensual') {
          let taskDayNum = 1;
          if (task.deadline) {
            taskDayNum = new Date(task.deadline.replace(' ', 'T')).getDate();
          } else if (task.created_at) {
            taskDayNum = new Date(task.created_at).getDate();
          }
          if (columnDate.getDate() === taskDayNum) {
            items.push({ task, block: task.work_blocks[0] });
          }
          return;
        }

        // Match against user's selected days in work_blocks
        const matchingBlocks = task.work_blocks.filter((b) => {
          const bNorm = b.day_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          return bNorm === dayNameNorm || bNorm === 'todos';
        });

        if (matchingBlocks.length > 0) {
          matchingBlocks.forEach((block) => {
            items.push({ task, block });
          });
        }
        return;
      }

      // 2. Single Task (Unique / Non-recurring) -> Appears STRICTLY on its exact date
      if (task.deadline) {
        const d = new Date(task.deadline.replace(' ', 'T'));
        if (!isNaN(d.getTime()) && isSameDay(columnDate, d)) {
          const blk = task.work_blocks[0];
          items.push({ task, block: blk, isDeadline: !blk });
        }
        return; // Never fall through to other weeks or months
      }

      if (task.created_at) {
        const cd = new Date(task.created_at.replace(' ', 'T'));
        if (!isNaN(cd.getTime()) && isSameDay(columnDate, cd)) {
          const blk = task.work_blocks[0];
          items.push({ task, block: blk, isDeadline: !blk });
        }
        return;
      }
    });

    return items;
  };

  return (
    <div className="space-y-4">
      {/* Mobile Day Tabs Bar (Responsive iPhone 14/15/16 Pro Max, Galaxy S23/S24 Ultra, Pixel 8/9 Pro) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none px-0.5">
        <button
          type="button"
          onClick={() => setMobileActiveDay('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            mobileActiveDay === 'all'
              ? 'bg-[#0052FF] text-white shadow-xs'
              : 'bg-white/80 text-slate-600 border border-slate-200/80 hover:bg-white'
          }`}
        >
          Semana Completa
        </button>
        {weekDays.map((col) => {
          const isActive = mobileActiveDay === col.key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => setMobileActiveDay(col.key)}
              className={`px-3 py-1.5 rounded-xl text-xs shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#0052FF] text-white font-bold shadow-xs'
                  : col.isToday
                  ? 'bg-blue-50 text-[#0052FF] font-semibold border border-blue-200'
                  : 'bg-white/80 text-slate-600 font-medium border border-slate-200/80 hover:bg-white'
              }`}
            >
              <span>{col.label.slice(0, 3)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {col.dayNumber}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map((col) => {
          const isHiddenOnMobile = mobileActiveDay !== 'all' && mobileActiveDay !== col.key;
          const dayItems = getTasksForDay(col.key, col.date);

          return (
            <div
              key={col.key}
              className={`schedule-column ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'} ${
                col.isSelected ? 'ring-2 ring-[#0052FF]/30 bg-blue-50/20' : ''
              }`}
            >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {col.label}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {col.dayNumber} {col.monthShort}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  col.isSelected
                    ? 'bg-[#0052FF] text-white'
                    : 'bg-blue-50 text-[#0052FF] border border-blue-100'
                }`}
              >
                {dayItems.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pt-1.5 px-0.5 pb-2">
              {dayItems.length === 0 ? (
                <div className="h-full flex items-center justify-center p-4 text-center">
                  <p className="text-[11px] text-slate-400 font-medium">Sin tareas</p>
                </div>
              ) : (
                dayItems.map(({ task, block, isDeadline }, idx) => {
                  const isCompleted = block ? block.completed : task.status === 'completed';
                  const colorTheme = getTaskColorTheme(block?.color || task.color);
                  const isColorMenuOpen = activeColorTaskId === task.id;

                  return (
                    <div
                      key={`${task.id}-${block?.id || 'deadline'}-${idx}`}
                      onClick={() => onEditTask(task)}
                      className={`task-item-card cursor-pointer ${isCompleted ? 'completed' : ''}`}
                      style={{
                        background: isCompleted ? 'rgba(248, 250, 252, 0.85)' : colorTheme.cardBg,
                        borderColor: isCompleted ? '#E2E8F0' : colorTheme.border,
                        boxShadow: isCompleted ? 'none' : `0 4px 16px -2px ${colorTheme.glow}`,
                      }}
                      title="Clic para editar tarea"
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs transition-transform hover:scale-125"
                            style={{ background: colorTheme.accent }}
                            title={`Color: ${colorTheme.name}`}
                          />
                          {task.is_recurring && (
                            <span title={`Recurrente: ${task.recurrence_rule || 'periódica'}`} className="flex items-center">
                              <Repeat className="w-3 h-3 text-slate-500 shrink-0" />
                            </span>
                          )}
                          <span
                            className="text-xs font-semibold text-slate-800 line-clamp-1 transition-colors"
                            style={{ color: isCompleted ? undefined : '#0F172A' }}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onUpdateColor && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveColorTaskId(isColorMenuOpen ? null : task.id);
                              }}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded"
                              title="Cambiar color de la tarea"
                            >
                              <Palette className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id);
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Quick Color Swatches Bar */}
                      {isColorMenuOpen && onUpdateColor && (
                        <div
                          className="my-2 p-1.5 rounded-lg bg-white/95 border border-slate-200/80 shadow-xs flex items-center justify-between gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Object.values(TASK_COLORS).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onUpdateColor(task.id, c.id);
                                setActiveColorTaskId(null);
                              }}
                              title={c.name}
                              className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                                (block?.color || task.color) === c.id ? 'ring-2 ring-slate-800 scale-110' : 'hover:scale-115'
                              }`}
                              style={{ background: c.gradient }}
                            />
                          ))}
                        </div>
                      )}

                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                        {block ? (
                          <div className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                            <Clock className="w-3 h-3" style={{ color: colorTheme.accent }} />
                            <span>
                              {block.start_time || '14:00'} - {block.end_time || '16:00'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 font-medium text-[10px]">
                            <CalIcon className="w-3 h-3" />
                            <span>Entrega final</span>
                          </div>
                        )}

                        {block && block.id < 10000 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleBlock(block.id, block.completed);
                            }}
                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:opacity-80 transition-colors"
                          >
                            {block.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
