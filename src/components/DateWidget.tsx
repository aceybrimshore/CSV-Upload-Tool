import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';

interface DateWidgetProps {
  dateValue: string;
  onChangeDate: (date: string) => void;
  label?: string;
}

export function DateWidget({ dateValue, onChangeDate, label = 'Export Date (Start & End Date)' }: DateWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to current date
  const parseCurrentDate = (val: string): Date => {
    if (!val) return new Date();
    // Check if DD/MM/YYYY
    const ddmmyyyy = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    // Check if YYYY-MM-DD
    const yyyymmdd = val.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const fallback = new Date(val);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  };

  const [viewDate, setViewDate] = useState<Date>(() => parseCurrentDate(dateValue));

  // Sync viewDate when popover opens
  useEffect(() => {
    if (isOpen) {
      setViewDate(parseCurrentDate(dateValue));
    }
  }, [isOpen, dateValue]);

  // Handle clicking outside
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

  const formatDateDDMMYYYY = (d: Date): string => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = formatDateDDMMYYYY(selected);
    onChangeDate(formatted);
    setIsOpen(false);
  };

  const handleQuickPick = (type: 'today' | 'tomorrow' | 'endOfWeek' | 'nextMonday') => {
    const today = new Date();
    let target = new Date();
    if (type === 'today') {
      target = today;
    } else if (type === 'tomorrow') {
      target.setDate(today.getDate() + 1);
    } else if (type === 'endOfWeek') {
      // Find Friday of current week
      const currentDay = today.getDay(); // 0 is Sunday, 5 is Friday
      const diff = 5 - currentDay;
      target.setDate(today.getDate() + (diff >= 0 ? diff : diff + 7));
    } else if (type === 'nextMonday') {
      const currentDay = today.getDay();
      const daysUntilNextMonday = ((1 + 7 - currentDay) % 7) || 7;
      target.setDate(today.getDate() + daysUntilNextMonday);
    }
    onChangeDate(formatDateDDMMYYYY(target));
    setViewDate(target);
    setIsOpen(false);
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const selectedDateObj = parseCurrentDate(dateValue);
  const isCurrentMonthSelected =
    selectedDateObj.getFullYear() === year && selectedDateObj.getMonth() === month;
  const selectedDay = isCurrentMonthSelected ? selectedDateObj.getDate() : null;

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonthToday ? today.getDate() : null;

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
          Start = End Date
        </span>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={dateValue}
          onChange={e => onChangeDate(e.target.value)}
          placeholder="DD/MM/YYYY (e.g. 28/08/2026)"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-xs font-semibold font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title="Open calendar picker"
          className="absolute right-1.5 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-indigo-600" />
        </button>
      </div>

      {/* Calendar Widget Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Header Month / Year & Nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1 mb-2.5 pb-2 border-b border-slate-100 text-[10px]">
            <button
              type="button"
              onClick={() => handleQuickPick('today')}
              className="py-1 px-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold rounded text-center transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickPick('tomorrow')}
              className="py-1 px-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold rounded text-center transition-colors cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickPick('endOfWeek')}
              className="py-1 px-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold rounded text-center transition-colors cursor-pointer"
            >
              This Fri
            </button>
            <button
              type="button"
              onClick={() => handleQuickPick('nextMonday')}
              className="py-1 px-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-semibold rounded text-center transition-colors cursor-pointer"
            >
              Next Mon
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1.5">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Prev month days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
              return (
                <div key={`prev-${i}`} className="p-1.5 text-[11px] text-slate-300 select-none">
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = selectedDay === dayNum;
              const isToday = todayDay === dayNum;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center relative ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {dayNum}
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 bg-indigo-600 rounded-full absolute bottom-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Format: <strong className="font-mono text-slate-700">DD/MM/YYYY</strong></span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
