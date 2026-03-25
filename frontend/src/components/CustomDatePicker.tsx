import { useState, useEffect, useRef } from 'react';

interface CustomDatePickerProps {
  value: string;
  onDateSelect: (date: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CustomDatePicker({ value, onDateSelect, disabled, className = '' }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = viewDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  const today = new Date();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    const dateStr = newDate.toISOString().split('T')[0];
    onDateSelect(dateStr);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const isToday = (day: number) => {
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayValue = value ? new Date(value).toLocaleDateString('he-IL') : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        type="text"
        readOnly
        value={displayValue}
        onClick={(e) => { e.stopPropagation(); if (!disabled) setIsOpen(!isOpen); }}
        placeholder="בחר תאריך"
        disabled={disabled}
        className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800 cursor-pointer"
      />
      {isOpen && (
        <div className="absolute top-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg p-2 z-50 w-64">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-surface-100 rounded text-surface-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-surface-800">{monthName}</span>
            <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-surface-100 rounded text-surface-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((d, i) => (
              <div key={i} className="h-7 w-7 flex items-center justify-center text-xs text-surface-400 font-medium">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                  className={`h-7 w-7 text-xs rounded-full transition-colors ${
                    isSelected(day) ? 'bg-primary-600 text-white' :
                    isToday(day) ? 'bg-primary-100 text-primary-700 font-bold' :
                    'hover:bg-surface-100 text-surface-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
