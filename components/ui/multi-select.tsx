"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

type Option = {
  value: number;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected = [],
  onChange,
  placeholder = "Wybierz opcje...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (value: number) => {
    onChange(selected.filter((v) => v !== value));
  };

  const isSelected = (value: number) => {
    return Array.isArray(selected) && selected.includes(value);
  };

  return (
    <Command className={className}>
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex gap-1 flex-wrap">
          {selected.map((value) => {
            const option = options.find((opt) => opt.value === value);
            if (!option) return null;

            return (
              <Badge
                key={value}
                variant="secondary"
                className="hover:bg-secondary"
              >
                {option.label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(value)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            placeholder={selected.length === 0 ? placeholder : undefined}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto max-h-60">
              {options.map((option) => {
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected(option.value)) {
                        handleUnselect(option.value);
                      } else {
                        onChange([...selected, option.value]);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                        isSelected(option.value)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50"
                      }`}
                    >
                      {isSelected(option.value) && <X className="h-3 w-3" />}
                    </div>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        )}
      </div>
    </Command>
  );
}
