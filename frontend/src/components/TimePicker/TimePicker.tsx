import React from 'react';
import timeConfig from './TimePicker.json';
import './TimePicker.css';

interface TimePickerProps {
  value: string; // "14:00"
  onChange: (value: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const parts = value ? value.split(':') : ['14', '00'];
  const currentHour = parts[0] ? parts[0].padStart(2, '0') : '14';
  const currentMinute = parts[1] ? parts[1].padStart(2, '0') : '00';

  const hoursList = timeConfig.hours.includes(currentHour)
    ? timeConfig.hours
    : [...timeConfig.hours, currentHour].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const minutesList = timeConfig.minutes.includes(currentMinute)
    ? timeConfig.minutes
    : [...timeConfig.minutes, currentMinute].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(`${e.target.value}:${currentMinute}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(`${currentHour}:${e.target.value}`);
  };

  return (
    <div className="apple-timepicker-container">
      <select
        value={currentHour}
        onChange={handleHourChange}
        className="apple-time-select"
        aria-label="Hora"
      >
        {hoursList.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-slate-400 font-bold text-xs select-none">:</span>
      <select
        value={currentMinute}
        onChange={handleMinuteChange}
        className="apple-time-select"
        aria-label="Minutos"
      >
        {minutesList.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
};
