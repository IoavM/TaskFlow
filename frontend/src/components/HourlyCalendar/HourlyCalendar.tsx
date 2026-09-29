import React from 'react';
import { CheckCircle2, Circle, Clock, Repeat } from 'lucide-react';
import { Task, WorkBlock } from '../../types';
import { getTaskColorTheme } from '../../utils/taskColors';
import { parseDateLocal } from '../../utils/dateUtils';
import config from './HourlyCalendar.json';
import './HourlyCalendar.css';

interface HourlyCalendarProps {
  tasks: Task[];
  selectedDate?: Date;
  onToggleBlock: (blockId: number, currentCompleted: boolean) => Promise<void>;
  onEditTask: (task: Task) => void;
}

export const HourlyCalendar: React.FC<HourlyCalendarProps> = ({
  tasks,
  selectedDate = new Date(),
  onToggleBlock,
  onEditTask,
}) => {
  const startHour = config.startHour || 7; // 7 AM
  const endHour = config.endHour || 22;    // 10 PM
  const totalHours = endHour - startHour + 1;
  const slotHeight = 54; // pixels per hour

  const hoursList = Array.from({ length: totalHours }, (_, i) => startHour + i);

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

  // Helper to parse "HH:MM" into decimal hour (e.g. "14:30" -> 14.5)
  const parseTimeToDecimal = (timeStr?: string, defaultHour: number = 14) => {
    if (!timeStr) return defaultHour;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) / 60 : 0;
    return isNaN(h) ? defaultHour : h + m;
  };

  // Find blocks for a day considering date & recurrence
  const getDayBlocks = (dayKey: string, columnDate: Date) => {
    const list: Array<{ task: Task; block: WorkBlock }> = [];
    const dayNameNorm = dayKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    tasks.forEach((t) => {
      // 1. Recurring task -> Appears on user's selected days in work_blocks
      if (t.is_recurring) {
        if (t.deadline) {
          const endD = parseDateLocal(t.deadline);
          endD.setHours(23, 59, 59, 999);
          if (columnDate > endD) {
            return; // Recurrence has expired
          }
        }

        if (t.recurrence_rule === 'mensual') {
          let taskDayNum = 1;
          if (t.deadline) {
            taskDayNum = parseDateLocal(t.deadline).getDate();
          } else if (t.created_at) {
            taskDayNum = new Date(t.created_at).getDate();
          }
          if (columnDate.getDate() === taskDayNum) {
            const blk = t.work_blocks[0] || {
              id: t.id * 1000,
              task_id: t.id,
              day_name: 'Mensual',
              start_time: '14:00',
              end_time: '16:00',
              completed: false,
            };
            list.push({ task: t, block: blk });
          }
          return;
        }

        // Match against user's selected days in work_blocks
        t.work_blocks.forEach((b) => {
          const bNorm = b.day_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          if (bNorm === dayNameNorm || bNorm === 'todos') {
            list.push({ task: t, block: b });
          }
        });
        return;
      }

      // 2. Single Task (Unique / Non-recurring)
      const hasWorkBlocksWithWorkPrefix = t.work_blocks.some((b) =>
        b.notes?.toLowerCase().startsWith('trabajo:')
      );

      if (hasWorkBlocksWithWorkPrefix) {
        let deadlineEnd: Date | null = null;
        let dl: Date | null = null;
        if (t.deadline) {
          dl = parseDateLocal(t.deadline);
          if (!isNaN(dl.getTime())) {
            deadlineEnd = new Date(dl);
            deadlineEnd.setHours(23, 59, 59, 999);
          }
        }

        const allowWorkBlock = !deadlineEnd || columnDate <= deadlineEnd;
        if (allowWorkBlock) {
          t.work_blocks.forEach((b) => {
            const bNorm = b.day_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (bNorm === dayNameNorm) {
              list.push({ task: t, block: b });
            }
          });
        }

        // Display delivery block on deadline day
        if (dl && isSameDay(columnDate, dl)) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          const startH = dl.getHours();
          const startM = dl.getMinutes();
          const endH = (startH + 1) % 24;
          list.push({
            task: t,
            block: {
              id: t.id * 1000 + 99,
              task_id: t.id,
              day_name: dayKey,
              start_time: `${pad(startH)}:${pad(startM)}`,
              end_time: `${pad(endH)}:${pad(startM)}`,
              notes: `Entrega: ${t.title}`,
              completed: t.status === 'completed',
            },
          });
        }
        return;
      }

      // 3. Single Task (Unique / Non-recurring) -> Appears ONLY on its specific date
      if (t.deadline) {
        const d = parseDateLocal(t.deadline);
        if (!isNaN(d.getTime()) && isSameDay(columnDate, d)) {
          if (t.work_blocks.length > 0) {
            t.work_blocks.forEach((b) => list.push({ task: t, block: b }));
          } else {
            // Synthesize block from deadline time if no work block exists
            const pad = (n: number) => n.toString().padStart(2, '0');
            const startH = d.getHours();
            const startM = d.getMinutes();
            const endH = (startH + 1) % 24;
            const blk: WorkBlock = {
              id: t.id * 1000,
              task_id: t.id,
              day_name: dayKey,
              start_time: `${pad(startH)}:${pad(startM)}`,
              end_time: `${pad(endH)}:${pad(startM)}`,
              completed: t.status === 'completed',
            };
            list.push({ task: t, block: blk });
          }
          return;
        }
      }

      // Single task without explicit deadline date: check matching day name in work blocks
      t.work_blocks.forEach((b) => {
        const bNorm = b.day_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (bNorm === dayNameNorm) {
          list.push({ task: t, block: b });
        }
      });
    });

    return list;
  };

  return (
    <div className="hourly-calendar-wrapper overflow-x-auto">
      <div className="min-w-[850px]">
        {/* Header Days Row */}
        <div className="hourly-grid-header">
          <div className="p-3 text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider border-r border-slate-200/80">
            Hora
          </div>
          {weekDays.map((col) => {
            const count = getDayBlocks(col.key, col.date).length;
            return (
              <div
                key={col.key}
                className={`p-3 text-center border-r border-slate-200/60 last:border-r-0 ${
                  col.isSelected ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {col.dayNumber}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  {count} {count === 1 ? 'tarea' : 'tareas'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Calendar Body */}
        <div className="hourly-grid-body">
          {/* Time scale column */}
          <div className="hourly-time-col">
            {hoursList.map((hour) => (
              <div key={hour} className="hourly-time-slot">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* 7 Days columns */}
          {weekDays.map((col) => {
            const dayEvents = getDayBlocks(col.key, col.date);

            return (
              <div
                key={col.key}
                className={`hourly-day-col ${col.isSelected ? 'bg-blue-50/15' : ''}`}
              >
                {/* Background hour grid slots */}
                {hoursList.map((hour) => (
                  <div key={hour} className="hourly-day-slot" />
                ))}

                {/* Event blocks placed by hour */}
                {dayEvents.map(({ task, block }) => {
                  const startDec = parseTimeToDecimal(block.start_time, 14);
                  let endDec = parseTimeToDecimal(block.end_time, 16);
                  if (endDec <= startDec) {
                    endDec += 24;
                  }
                  const duration = Math.min(Math.max(endDec - startDec, 0.75), 4);

                  const topOffset = Math.max((startDec - startHour) * slotHeight, 0);
                  const heightPx = duration * slotHeight;
                  const colorTheme = getTaskColorTheme(block.color || task.color);

                  return (
                    <div
                      key={`${task.id}-${block.id}`}
                      style={{
                        top: `${topOffset}px`,
                        height: `${heightPx}px`,
                        background: block.completed ? undefined : colorTheme.gradient,
                        borderColor: block.completed ? 'rgba(255, 255, 255, 0.45)' : colorTheme.border,
                        boxShadow: block.completed
                          ? '0 4px 12px 0 rgba(16, 185, 129, 0.25)'
                          : `0 4px 14px 0 ${colorTheme.glow}`,
                      }}
                      onClick={() => onEditTask(task)}
                      className={`calendar-event-block ${block.completed ? 'completed' : ''}`}
                      title={`${task.title} - Clic para editar`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          {task.is_recurring && (
                            <Repeat className="w-3 h-3 text-white/90 shrink-0" />
                          )}
                          <span className="text-xs font-bold truncate leading-tight">
                            {block.notes || task.title}
                          </span>
                        </div>
                        {block.id < 10000 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleBlock(block.id, block.completed);
                            }}
                            className="text-white/80 hover:text-white shrink-0 p-0.5"
                            title={block.completed ? 'Marcar incompleto' : 'Marcar completado'}
                          >
                            {block.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 fill-white text-emerald-600" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 hover:scale-110 transition-transform" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-white/90 font-mono mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {block.start_time || '14:00'} - {block.end_time || '16:00'}
                        </span>
                      </div>

                      {heightPx > 60 && task.description && (
                        <p className="text-[10px] text-white/80 line-clamp-1 mt-1 font-sans">
                          {task.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
