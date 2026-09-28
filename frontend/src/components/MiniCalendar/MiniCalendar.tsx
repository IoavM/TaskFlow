import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import calendarConfig from './MiniCalendar.json';
import './MiniCalendar.css';

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const today = new Date();

  return (
    <div className="mini-cal-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#0052FF]" />
          <span className="text-xs font-bold text-[#0F172A]">
            {calendarConfig.monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {calendarConfig.shortDays.map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-slate-400">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="w-8 h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
          const isSelected = isSameDay(dayDate, selectedDate);
          const isToday = isSameDay(dayDate, today);

          return (
            <button
              key={dayNumber}
              onClick={() => onSelectDate(dayDate)}
              className={`mini-cal-day-btn ${isSelected ? 'active' : ''} ${
                isToday && !isSelected ? 'border border-[#0052FF]/40 text-[#0052FF]' : 'text-slate-700'
              }`}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
};
