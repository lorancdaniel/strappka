'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | null) => void;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  className,
}: DatePickerProps) {
  return (
    <div className={cn('relative', className)}>
      <ReactDatePicker
        selected={value}
        onChange={onChange}
        locale={pl}
        dateFormat="P"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        customInput={
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {value ? format(value, 'PP', { locale: pl }) : 'Wybierz datę'}
          </Button>
        }
      />
    </div>
  );
}
