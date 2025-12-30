import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  format, 
  addMonths, 
  setMonth,
  setYear,
  getMonth,
  getYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns-jalali";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Persian month names
const persianMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// Persian weekday names (short)
const persianWeekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// Convert to Persian numerals
const toPersianDigits = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

// Generate year range for selector (e.g., 1350 to 1420)
const generateYearRange = (currentYear: number): number[] => {
  const startYear = currentYear - 50;
  const endYear = currentYear + 10;
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year--) {
    years.push(year);
  }
  return years;
};

interface PersianCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  mode?: "single";
  className?: string;
}

function PersianCalendar({
  selected,
  onSelect,
  className,
}: PersianCalendarProps) {
  const [displayMonth, setDisplayMonth] = React.useState(() => 
    selected instanceof Date ? selected : new Date()
  );

  const handlePreviousMonth = () => {
    setDisplayMonth(prev => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(prev => addMonths(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    onSelect?.(date);
  };

  const handleMonthChange = (monthIndex: string) => {
    setDisplayMonth(prev => setMonth(prev, parseInt(monthIndex)));
  };

  const handleYearChange = (year: string) => {
    setDisplayMonth(prev => setYear(prev, parseInt(year)));
  };

  // Get Jalali month and year
  const jalaliMonth = getMonth(displayMonth);
  const jalaliYear = getYear(displayMonth);
  const yearRange = generateYearRange(jalaliYear);

  // Generate calendar days
  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 6 }); // Saturday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Split days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className={cn("p-4 bg-background rounded-lg pointer-events-auto", className)} dir="rtl">
      {/* Header with navigation and selectors */}
      <div className="flex justify-between items-center mb-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8 hover:bg-muted shrink-0"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Month and Year Selectors */}
        <div className="flex items-center gap-1 flex-1 justify-center">
          <Select value={jalaliMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-auto h-8 px-2 text-sm font-vazirmatn border-0 bg-transparent hover:bg-muted focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-[100] max-h-[200px]" dir="rtl">
              {persianMonths.map((month, index) => (
                <SelectItem key={index} value={index.toString()} className="font-vazirmatn">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={jalaliYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-auto h-8 px-2 text-sm font-vazirmatn border-0 bg-transparent hover:bg-muted focus:ring-0">
              <SelectValue>{toPersianDigits(jalaliYear)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background z-[100] max-h-[200px]" dir="rtl">
              {yearRange.map((year) => (
                <SelectItem key={year} value={year.toString()} className="font-vazirmatn">
                  {toPersianDigits(year)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8 hover:bg-muted shrink-0"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {persianWeekdays.map((weekday, index) => (
          <div
            key={index}
            className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground font-vazirmatn"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, weekIndex) =>
          week.map((date, dayIndex) => {
            const isCurrentMonth = isSameMonth(date, displayMonth);
            const isSelected = selected && isSameDay(date, selected);
            const isTodayDate = isToday(date);
            const jalaliDay = parseInt(format(date, 'd'));

            return (
              <button
                key={`${weekIndex}-${dayIndex}`}
                type="button"
                onClick={() => handleDateClick(date)}
                disabled={!isCurrentMonth}
                className={cn(
                  "h-9 w-full rounded-md text-sm font-vazirmatn transition-colors",
                  "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                  !isCurrentMonth && "text-muted-foreground/30 cursor-not-allowed hover:bg-transparent",
                  isCurrentMonth && !isSelected && "text-foreground",
                  isTodayDate && !isSelected && "bg-accent text-accent-foreground",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                {toPersianDigits(jalaliDay)}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
PersianCalendar.displayName = "PersianCalendar";

export { PersianCalendar };
