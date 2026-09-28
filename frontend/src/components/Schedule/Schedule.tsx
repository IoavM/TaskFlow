import React from 'react';
import { CheckCircle2, Circle, Clock, Trash2, Calendar as CalIcon, Repeat } from 'lucide-react';
import { Task, WorkBlock } from '../../types';
import config from './Schedule.json';
import './Schedule.css';

interface ScheduleProps {
  tasks: Task[];
  selectedDate?: Date;
  onToggleBlock: (blockId: number, currentCompleted: boolean) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onEditTask: (task: Task) => void;
}

export const Schedule: React.FC<ScheduleProps> = ({
  tasks,
  selectedDate = new Date(),
  onToggleBlock,
  onDeleteTask,
  onEditTask,
}) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {weekDays.map((col) => {
        const dayItems = getTasksForDay(col.key, col.date);

        return (
          <div
            key={col.key}
            className={`schedule-column ${col.isSelected ? 'ring-2 ring-[#0052FF]/30 bg-blue-50/20' : ''}`}
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

                  return (
                    <div
                      key={`${task.id}-${block?.id || 'deadline'}-${idx}`}
                      onClick={() => onEditTask(task)}
                      className={`task-item-card cursor-pointer ${isCompleted ? 'completed' : ''}`}
                      title="Clic para editar tarea"
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {task.is_recurring && (
                            <span title={`Recurrente: ${task.recurrence_rule || 'periódica'}`} className="flex items-center">
                              <Repeat className="w-3 h-3 text-[#0052FF] shrink-0" />
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-800 line-clamp-1 hover:text-[#0052FF]">
                            {task.title}
                          </span>
                        </div>
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

                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        {block ? (
                          <div className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                            <Clock className="w-3 h-3 text-[#0052FF]" />
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
                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-[#0052FF] transition-colors"
                          >
                            {block.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 hover:text-[#0052FF]" />
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
  );
};
