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
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  });

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

  useEffect(() => {
    if (isOpen && value) {
      const [year, month, day] = value.split('-').map(Number);
      setViewDate(new Date(year, month - 1, day));
    }
  }, [isOpen, value]);

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(dateStr);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const [year, month, d] = value.split('-').map(Number);
    return d === day && month === currentMonth + 1 && year === currentYear;
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

  const displayValue = value ? (() => {
    const [year, month, day] = value.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('he-IL');
  })() : '';

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        type="text"
        readOnly
        value={displayValue}
        onClick={handleOpen}
        placeholder="בחר תאריך"
        disabled={disabled}
        className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800 cursor-pointer"
      />
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={handleOverlayClick}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none lg:hidden">
            <div 
              className="bg-white rounded-2xl shadow-2xl p-4 w-[90vw] max-w-sm pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-surface-100 rounded-lg text-surface-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-lg font-medium text-surface-800">{monthName}</span>
                <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-surface-100 rounded-lg text-surface-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((d, i) => (
                  <div key={i} className="h-10 w-10 flex items-center justify-center text-sm text-surface-400 font-medium">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                  <div key={`empty-${i}`} className="h-10 w-10" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`h-10 w-10 text-base rounded-lg transition-colors ${
                        isSelected(day) 
                          ? 'bg-primary-600 text-white font-bold' 
                          : isToday(day)
                            ? 'bg-primary-100 text-primary-700 font-bold'
                            : 'hover:bg-surface-100 text-surface-700'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleOverlayClick}
                className="w-full mt-4 py-3 text-center text-surface-600 hover:text-surface-800 font-medium"
              >
                ביטול
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
