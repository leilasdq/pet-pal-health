import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  format, 
  addMonths, 
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

  // Get Jalali month and year
  const jalaliMonth = getMonth(displayMonth);
  const jalaliYear = getYear(displayMonth);
  const monthName = persianMonths[jalaliMonth];
  const yearDisplay = toPersianDigits(jalaliYear);

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
    <div className={cn("p-4 bg-background rounded-lg", className)} dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8 hover:bg-muted"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="text-base font-semibold font-vazirmatn">
          {monthName} {yearDisplay}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8 hover:bg-muted"
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
