import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Trash2, Calendar as CalIcon } from 'lucide-react';
import { Task, WorkBlock } from '../../types';
import { getTaskColorTheme } from '../../utils/taskColors';
import { parseDateLocal, isSameDay } from '../../utils/dateUtils';
import config from './Schedule.json';
import './Schedule.css';

interface ScheduleProps {
  tasks: Task[];
  selectedDate?: Date;
  onToggleBlock: (blockId: number, currentCompleted: boolean) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onEditTask: (task: Task) => void;
  onUpdateColor?: (taskId: number, color: string) => Promise<void>;
  onToggleTaskStatus?: (taskId: number, currentCompleted: boolean) => Promise<void>;
}

interface ScheduleDayItem {
  task: Task;
  block?: WorkBlock;
  isDelivery?: boolean;
  displayTitle: string;
  timeLabel?: string;
  isCompleted: boolean;
}

export const Schedule: React.FC<ScheduleProps> = ({
  tasks,
  selectedDate = new Date(),
  onToggleBlock,
  onDeleteTask,
  onEditTask,
  onToggleTaskStatus,
}) => {
  const [mobileActiveDay, setMobileActiveDay] = useState<string>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Desktop Monitor Smooth Navigation: Drag-to-Scroll & Fluid Mouse Wheel
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const hasDragged = useRef(false);

  // Wheel listener: Converts vertical mouse wheel to ultra-fluid horizontal momentum scroll on monitors
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let targetScroll = el.scrollLeft;
    let animId: number | null = null;

    const smoothScroll = () => {
      const current = el.scrollLeft;
      const diff = targetScroll - current;
      if (Math.abs(diff) > 0.5) {
        el.scrollLeft = current + diff * 0.16;
        animId = requestAnimationFrame(smoothScroll);
      } else {
        el.scrollLeft = targetScroll;
        animId = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      // If user is using a trackpad with native deltaX horizontal swipe, do not override
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // If container content fits without horizontal scroll, don't intercept
      if (el.scrollWidth <= el.clientWidth) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= maxScroll - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;

      e.preventDefault();
      if (animId === null) {
        targetScroll = el.scrollLeft;
      }
      targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + e.deltaY * 1.25));
      if (animId === null) {
        animId = requestAnimationFrame(smoothScroll);
      }
    };

    const onScroll = () => {
      if (animId === null) {
        targetScroll = el.scrollLeft;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }
    if (!scrollContainerRef.current) return;

    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.pageX - scrollContainerRef.current.offsetLeft;
    dragScrollLeft.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.2;
    if (Math.abs(walk) > 4) {
      hasDragged.current = true;
    }
    scrollContainerRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

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

  // Filter tasks that belong to a specific day column
  const getTasksForDay = (dayKey: string, columnDate: Date) => {
    const items: ScheduleDayItem[] = [];
    const dayNameNorm = dayKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    tasks.forEach((task) => {
      // 1. Recurring task -> Appears only on the specific days selected by user, up to deadline if set
      if (task.is_recurring) {
        if (task.deadline) {
          const endD = parseDateLocal(task.deadline);
          endD.setHours(23, 59, 59, 999);
          if (columnDate > endD) {
            return; // Recurrence has expired
          }
        }

        if (task.recurrence_rule === 'mensual') {
          let taskDayNum = 1;
          if (task.deadline) {
            taskDayNum = parseDateLocal(task.deadline).getDate();
          } else if (task.created_at) {
            taskDayNum = new Date(task.created_at).getDate();
          }
          if (columnDate.getDate() === taskDayNum) {
            const blk = task.work_blocks[0];
            items.push({
              task,
              block: blk,
              displayTitle: blk?.notes || task.title,
              isCompleted: blk ? blk.completed : task.status === 'completed',
            });
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
            items.push({
              task,
              block,
              displayTitle: block.notes || task.title,
              isCompleted: block.completed,
            });
          });
        }
        return;
      }

      // 2. Single Task (Unique / Non-recurring)
      const hasWorkBlocksWithWorkPrefix = task.work_blocks.some((b) =>
        b.notes?.toLowerCase().startsWith('trabajo:')
      );

      if (hasWorkBlocksWithWorkPrefix) {
        let deadlineEnd: Date | null = null;
        let isDeliveryDay = false;
        let deliveryTimeLabel = 'Entrega final';

        if (task.deadline) {
          const dl = parseDateLocal(task.deadline);
          if (!isNaN(dl.getTime())) {
            deadlineEnd = new Date(dl);
            deadlineEnd.setHours(23, 59, 59, 999);
            isDeliveryDay = isSameDay(columnDate, dl);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const h = pad(dl.getHours());
            const m = pad(dl.getMinutes());
            deliveryTimeLabel = `Entrega (${h}:${m})`;
          }
        }

        // Display work sessions on matching days prior to deadline
        const allowWorkBlock = !deadlineEnd || columnDate <= deadlineEnd;
        if (allowWorkBlock) {
          const matchingBlocks = task.work_blocks.filter((b) => {
            const bNorm = b.day_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            return bNorm === dayNameNorm;
          });

          matchingBlocks.forEach((block) => {
            items.push({
              task,
              block,
              displayTitle: block.notes || `Trabajo: ${task.title}`,
              isCompleted: block.completed,
            });
          });
        }

        // On deadline day, display the final delivery card
        if (isDeliveryDay) {
          items.push({
            task,
            isDelivery: true,
            displayTitle: task.title,
            timeLabel: deliveryTimeLabel,
            isCompleted: task.status === 'completed',
          });
        }
        return;
      }

      // Standard single task without work sessions
      if (task.deadline) {
        const d = parseDateLocal(task.deadline);
        if (!isNaN(d.getTime()) && isSameDay(columnDate, d)) {
          const blk = task.work_blocks[0];
          const pad = (n: number) => n.toString().padStart(2, '0');
          const h = pad(d.getHours());
          const m = pad(d.getMinutes());
          const timeLabel = `Entrega (${h}:${m})`;

          items.push({
            task,
            block: blk,
            isDelivery: true,
            displayTitle: task.title,
            timeLabel,
            isCompleted: blk ? blk.completed : task.status === 'completed',
          });
        }
        return;
      }

      if (task.created_at) {
        const cd = new Date(task.created_at.replace(' ', 'T'));
        if (!isNaN(cd.getTime()) && isSameDay(columnDate, cd)) {
          const blk = task.work_blocks[0];
          items.push({
            task,
            block: blk,
            isDelivery: !blk,
            displayTitle: task.title,
            timeLabel: 'Entrega final',
            isCompleted: blk ? blk.completed : task.status === 'completed',
          });
        }
        return;
      }
    });

    return items;
  };

  return (
    <div className="space-y-3">
      {/* Mobile Day Tabs Bar */}
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

      {/* Spacious Horizontal Week Board */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`schedule-week-scroll-container ${isDragging ? 'is-dragging' : ''}`}
      >
        <div className="schedule-week-flex">
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
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      {col.label}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {col.dayNumber} {col.monthShort}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      col.isSelected
                        ? 'bg-[#0052FF] text-white shadow-xs'
                        : 'bg-blue-50 text-[#0052FF] border border-blue-100'
                    }`}
                  >
                    {dayItems.length}
                  </span>
                </div>

                {/* Day Tasks List */}
                <div className="space-y-3 flex-1 overflow-y-auto pt-1 px-0.5 pb-1">
                  {dayItems.length === 0 ? (
                    <div className="h-44 flex items-center justify-center p-4 text-center">
                      <p className="text-xs text-slate-400 font-medium">Sin tareas para este día</p>
                    </div>
                  ) : (
                    dayItems.map((item, idx) => {
                      const { task, block, isDelivery, displayTitle, timeLabel, isCompleted } = item;
                      const colorTheme = getTaskColorTheme(block?.color || task.color);

                      return (
                        <div
                          key={`${task.id}-${block?.id || 'delivery'}-${idx}`}
                          onClick={() => {
                            if (hasDragged.current) return;
                            onEditTask(task);
                          }}
                          className={`task-item-card cursor-pointer ${isCompleted ? 'completed' : ''}`}
                          style={{
                            background: isCompleted ? 'rgba(248, 250, 252, 0.9)' : colorTheme.cardBg,
                            borderColor: isCompleted ? '#E2E8F0' : colorTheme.border,
                            boxShadow: isCompleted ? 'none' : `0 4px 18px -2px ${colorTheme.glow}`,
                          }}
                          title="Clic para editar detalles de la tarea"
                        >
                          {/* Card Header: Color indicator + Prominent Task Name + Quick Delete */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 mt-0.5 shadow-xs"
                                style={{ background: colorTheme.accent }}
                                title={`Color: ${colorTheme.name}`}
                              />
                              <h4
                                className="text-[13px] font-bold leading-snug break-words"
                                style={{
                                  textDecoration: isCompleted ? 'line-through' : 'none',
                                  color: isCompleted ? '#94A3B8' : '#0F172A',
                                }}
                              >
                                {displayTitle || task.title || 'Tarea sin título'}
                              </h4>
                            </div>

                            {/* Quick Delete Only */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTask(task.id);
                              }}
                              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors shrink-0 -mr-1 -mt-0.5 cursor-pointer"
                              title="Eliminar tarea rápidamente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Optional Description */}
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-2.5 pl-5.5 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Card Footer: Time on Left, Quick Complete Checkbox on Right */}
                          <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2 mt-auto">
                            {isDelivery || !block ? (
                              <div className="flex items-center gap-1.5 text-blue-700 font-medium text-xs whitespace-nowrap">
                                <CalIcon className="w-3.5 h-3.5 shrink-0 text-[#0052FF]" />
                                <span className="font-semibold">{timeLabel || 'Entrega final'}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-700 font-mono text-xs whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: colorTheme.accent }} />
                                <span className="font-semibold tabular-nums">
                                  {block.start_time || '14:00'} - {block.end_time || '16:00'}
                                </span>
                              </div>
                            )}

                            {/* Checkbox toggle: Block level if block exists, or Task status level for deliveries */}
                            {block && block.id < 10000 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleBlock(block.id, block.completed);
                                }}
                                className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0 ml-auto cursor-pointer"
                                title={block.completed ? "Marcar como pendiente" : "Marcar como completada"}
                              >
                                {block.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onToggleTaskStatus) {
                                    onToggleTaskStatus(task.id, task.status === 'completed');
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0 ml-auto cursor-pointer"
                                title={task.status === 'completed' ? "Marcar entrega como pendiente" : "Marcar entrega como completada"}
                              >
                                {task.status === 'completed' ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
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
    </div>
  );
};
