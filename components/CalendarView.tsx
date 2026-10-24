import React from 'react';
import { Appointment } from '../src/types';
import { 
  format, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  endOfWeek, 
  isToday,
  startOfMonth,
  subMonths,
  startOfWeek
} from 'date-fns';

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getHolidayForDate } from '../src/utils/holidays';

interface CalendarViewProps {
  appointments: Appointment[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateDoubleClick?: (date: Date) => void;
  onDelete: (id: string) => void;
  selectedLanguage: { id: string; label: string; name: string; locale: any };
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments, selectedDate, onDateSelect, onDateDoubleClick, selectedLanguage }) => {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate || new Date());
  
  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const locale = selectedLanguage.locale;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale });
  const calendarEnd = endOfWeek(monthEnd, { locale });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-[#FEF9C3] rounded-[2rem] sm:rounded-[2.5rem] w-full animate-in fade-in duration-500 overflow-hidden relative shadow-xl flex border-t-4 border-[#FDD835]">
      <div className="w-1.5 sm:w-2 bg-[#FDD835] rounded-l-[2rem] sm:rounded-l-[2.5rem] shadow-[1px_0_2px_rgba(253,216,53,0.3)]"></div>
      <div className="p-4 sm:p-8 flex-1 relative">
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-[#FDD835]/10 rounded-full -mr-16 -mt-16 sm:-mr-20 sm:-mt-20 blur-2xl sm:blur-3xl"></div>
        
        <div className="flex items-center justify-between mb-6 sm:mb-10 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FDD835] rounded-xl sm:rounded-2xl flex items-center justify-center text-black shadow-lg">
               <CalendarIcon size={23} className="sm:w-[26px] sm:h-[26px]" />
            </div>
            <div>
              <h2 className="text-[21px] sm:text-[23px] font-black text-black uppercase tracking-tight leading-none">
                {format(currentMonth, 'MMMM', { locale })}
              </h2>
              <p className="text-[11px] sm:text-[12px] font-black text-black/40 tracking-[0.3em] sm:tracking-[0.4em] uppercase mt-1 sm:mt-2">{format(currentMonth, 'yyyy')}</p>
            </div>
          </div>
          
          <div className="flex gap-1.5 sm:gap-2.5">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-9 h-9 sm:w-[46px] sm:h-[46px] flex items-center justify-center bg-white/50 border border-yellow-300 rounded-lg sm:rounded-xl hover:bg-white text-black transition-all btn-press shadow-sm"
            >
              <ChevronLeft size={21} className="sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-9 h-9 sm:w-[46px] sm:h-[46px] flex items-center justify-center bg-white/50 border border-yellow-300 rounded-lg sm:rounded-xl hover:bg-white text-black transition-all btn-press shadow-sm"
            >
              <ChevronRight size={21} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-4 sm:mb-6">
          {weekDayLabels.map((day, i) => (
            <div key={i} className={`text-center text-[11px] sm:text-[13px] font-black uppercase tracking-widest ${i === 0 ? 'text-[#EF5350]' : 'text-black/60'}`}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, idx) => {
            const isSelectedMonth = isSameDay(startOfMonth(day), monthStart);
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);
            const hasApps = appointments.some(app => app.date === format(day, 'yyyy-MM-dd'));
            const holiday = getHolidayForDate(day);

            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (!isSelectedMonth) return;
                  if (isSelected && onDateDoubleClick) {
                    onDateDoubleClick(day);
                  } else {
                    onDateSelect(day);
                  }
                }} 
                onDoubleClick={() => isSelectedMonth && onDateDoubleClick && onDateDoubleClick(day)}
                className={`
                  aspect-square relative flex flex-col items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300
                  ${!isSelectedMonth ? 'opacity-10 pointer-events-none' : 'cursor-pointer'}
                  ${isSelected 
                    ? 'bg-[#FDD835] text-black shadow-xl scale-105' 
                    : isDayToday 
                      ? 'bg-[#FDD835] text-black ring-2 sm:ring-4 ring-white shadow-md' 
                      : hasApps
                        ? 'bg-yellow-200 text-black font-black border-2 border-[#FDD835]/50 hover:bg-yellow-300 shadow-sm'
                        : 'text-black/80 hover:bg-yellow-100 hover:shadow-sm'}
                `}
              >
                <span className={`text-[14px] sm:text-[16px] font-black`}>
                  {format(day, 'd')}
                </span>

                {holiday && (
                  <span 
                    title={`Feriado: ${holiday.name}`}
                    className={`absolute top-1 right-1 sm:top-1.5 sm:right-1.5 text-[8px] sm:text-[9px] leading-none select-none`}
                  >
                    🇧🇷
                  </span>
                )}

                {hasApps && !isSelected && (
                  <div className="absolute bottom-1 sm:bottom-2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#FDD835] shadow-[0_0_8px_rgba(253,216,53,0.5)]"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
