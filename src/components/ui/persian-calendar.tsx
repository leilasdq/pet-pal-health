import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { faIR } from "date-fns-jalali/locale";
import { 
  format, 
  addMonths, 
  getMonth,
  getYear,
} from "date-fns-jalali";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Persian month names
const persianMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// Convert to Persian numerals
const toPersianDigits = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

interface PersianCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  mode?: "single";
  initialFocus?: boolean;
  className?: string;
}

function PersianCalendar({
  selected,
  onSelect,
  className,
  ...props
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

  // Get Jalali month and year
  const jalaliMonth = getMonth(displayMonth);
  const jalaliYear = getYear(displayMonth);
  const monthName = persianMonths[jalaliMonth];
  const yearDisplay = toPersianDigits(jalaliYear);

  return (
    <div className={cn("p-3 pointer-events-auto", className)} dir="rtl">
      {/* Custom Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium font-vazirmatn">
          {monthName} {yearDisplay}
        </div>
        <button
          onClick={handlePreviousMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        showOutsideDays={true}
        locale={faIR}
        dir="rtl"
        weekStartsOn={6}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] font-vazirmatn",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 font-vazirmatn"),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        formatters={{
          formatDay: (date) => toPersianDigits(parseInt(format(date, 'd'))),
          formatWeekdayName: (date) => format(date, 'EEEEEE'),
        }}
      />
    </div>
  );
}
PersianCalendar.displayName = "PersianCalendar";

export { PersianCalendar };
