"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormDescription, FormLabel } from "@/components/ui/form";
import RequiredLabel from "@/components/ui/required-label";
import TimePicker from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

export type DateTimeFieldProps = {
  label: string;
  value?: Date;
  onValueChange: (value?: Date) => void;
  required?: boolean;
  description?: string;
  className?: string;
};

export default function DateTimeField({
  label,
  value,
  onValueChange,
  required = false,
  description,
  className,
}: DateTimeFieldProps) {
  const [localDate, setLocalDate] = useState<Date | undefined>(value);
  const [timeString, setTimeString] = useState<string>("");

  useEffect(() => {
    setLocalDate(value);
    if (value) {
      setTimeString(format(value, "HH:mm"));
    } else {
      setTimeString("");
    }
  }, [value]);

  const dateButtonLabel = useMemo(() => {
    return localDate ? format(localDate, "PPP") : "Pick a date";
  }, [localDate]);

  const handleDateSelect = (date?: Date) => {
    setLocalDate(date);
    if (!date) {
      onValueChange(undefined);
      return;
    }
    if (timeString) {
      const [hours, minutes] = timeString.split(":").map(Number);
      const combined = new Date(date);
      combined.setHours(hours || 0, minutes || 0, 0, 0);
      onValueChange(combined);
    } else {
      onValueChange(new Date(date));
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTimeString(newTime);
    if (!localDate) return;
    const [hours, minutes] = newTime.split(":").map(Number);
    const combined = new Date(localDate);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    onValueChange(combined);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <FormLabel className="mb-0">
          {label} {required && <RequiredLabel />}
        </FormLabel>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("justify-between w-full", !localDate && "text-muted-foreground")}
            >
              <span className="truncate">{dateButtonLabel}</span>
              <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={localDate} onSelect={handleDateSelect} initialFocus />
          </PopoverContent>
        </Popover>
        <div>
          <TimePicker value={timeString} onValueChange={handleTimeChange} />
        </div>
      </div>
      {description && <FormDescription>{description}</FormDescription>}
    </div>
  );
}



