"use client";

import * as React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | null) => void;
  className?: string;
}

const DatePicker = ({ value, onChange, className }: DatePickerProps) => {
  return (
    <div className={cn("grid gap-2", className)}>
      <ReactDatePicker
        selected={value}
        onChange={onChange}
        locale={pl}
        dateFormat="dd/MM/yyyy"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        customInput={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : "Wybierz datę"}
          </Button>
        }
      />
    </div>
  );
};

export { DatePicker };
