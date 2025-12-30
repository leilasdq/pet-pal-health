import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { format as formatJalali } from "date-fns-jalali";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { PersianCalendar } from "@/components/ui/persian-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";

interface DatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder,
  disabled,
  className,
}: DatePickerProps) {
  const { language, isRTL, t } = useLanguage();
  const [open, setOpen] = React.useState(false);

  const formatDisplayDate = (d: Date) => {
    if (language === 'fa') {
      return formatJalali(d, 'd MMMM yyyy');
    }
    return format(d, 'PPP');
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full font-normal !flex !items-center gap-2",
            isRTL ? "!flex-row-reverse !justify-end" : "!justify-start",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className={isRTL ? "text-right" : "text-left"}>
            {date ? formatDisplayDate(date) : (placeholder || t('common.selectDate'))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-background" align={isRTL ? "end" : "start"}>
        {language === 'fa' ? (
          <PersianCalendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
          />
        ) : (
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
