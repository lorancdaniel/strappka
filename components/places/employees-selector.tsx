"use client";

import * as React from "react";
import {
  Check,
  ChevronsUpDown,
  X,
  User,
  CheckSquare,
  XSquare,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Employee {
  id: number;
  name: string;
  surname: string;
}

interface EmployeesSelectorProps {
  selectedEmployees: number[];
  onEmployeesChange: (selectedEmployees: number[]) => void;
  disabled?: boolean;
  error?: string;
}

const Spinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="animate-spin text-muted-foreground">
      <svg
        className={sizeClass[size]}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};

export function EmployeesSelector({
  selectedEmployees,
  onEmployeesChange,
  disabled = false,
  error,
}: EmployeesSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAllSelected, setShowAllSelected] = React.useState(false);
  const maxVisibleBadges = 3;

  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/employees");
        if (!response.ok) {
          throw new Error("Nie udało się pobrać pracowników");
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setEmployees(data.data);
        }
      } catch (error) {
        console.error("Błąd podczas pobierania pracowników:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.surname}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const selectedEmployeesDetails = employees.filter((employee) =>
    selectedEmployees.includes(employee.id)
  );

  const toggleEmployee = (employeeId: number) => {
    if (selectedEmployees.includes(employeeId)) {
      onEmployeesChange(selectedEmployees.filter((id) => id !== employeeId));
    } else {
      onEmployeesChange([...selectedEmployees, employeeId]);
    }
  };

  const removeEmployee = (employeeId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEmployeesChange(selectedEmployees.filter((id) => id !== employeeId));
  };

  const selectAll = () => {
    onEmployeesChange(employees.map((employee) => employee.id));
  };

  const clearAll = () => {
    onEmployeesChange([]);
  };

  const visibleBadges = showAllSelected
    ? selectedEmployeesDetails
    : selectedEmployeesDetails.slice(0, maxVisibleBadges);

  const hiddenBadgesCount = selectedEmployeesDetails.length - maxVisibleBadges;

  return (
    <div className="flex flex-col space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-left font-normal transition-colors group relative",
              "border-input hover:border-primary hover:bg-accent/5",
              "focus:ring-1 focus:ring-primary/30 focus:border-primary",
              "py-2.5 sm:py-3 px-3 sm:px-4",
              !selectedEmployees.length && "text-muted-foreground",
              error && "border-red-500 focus:ring-red-500/30",
              "min-h-[3rem] sm:min-h-[3.25rem]"
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <User className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm sm:text-base">
                {selectedEmployees.length > 0
                  ? `Wybrano ${selectedEmployees.length} ${
                      selectedEmployees.length === 1
                        ? "pracownika"
                        : selectedEmployees.length < 5
                        ? "pracowników"
                        : "pracowników"
                    }`
                  : "Wybierz pracowników"}
              </span>
              {selectedEmployees.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 sm:ml-2 py-0.5 px-1.5 text-xs font-normal"
                >
                  {selectedEmployees.length}
                </Badge>
              )}
            </div>
            <ChevronsUpDown className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-background shadow-lg rounded-lg border border-input animate-in fade-in-0 zoom-in-95 duration-100"
          align="center"
          sideOffset={5}
          side="bottom"
          avoidCollisions={true}
        >
          <Command
            className="bg-background"
            shouldFilter={false}
            filter={(value, search) => {
              if (!search) return 1;

              const employee = employees.find((e) => e.id.toString() === value);
              if (!employee) return 0;

              const fullName =
                `${employee.name} ${employee.surname}`.toLowerCase();
              return fullName.includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <div className="relative">
              <CommandInput
                placeholder="Szukaj pracownika..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="border-b border-input focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-10 sm:h-11"
                style={{ paddingLeft: "0.75rem", paddingRight: "2.5rem" }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {searchQuery ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full hover:bg-accent/20"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Wyczyść wyszukiwanie</span>
                  </Button>
                ) : (
                  <Search className="h-4 w-4 opacity-50" />
                )}
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : (
              <>
                <div className="flex flex-col space-y-2 border-b border-input px-3 py-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {filteredEmployees.length} dostępnych pracowników
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                      className="h-8 text-xs flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors flex-1"
                      type="button"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>Zaznacz wszystkich</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="h-8 text-xs flex items-center gap-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors flex-1"
                      type="button"
                    >
                      <XSquare className="h-4 w-4" />
                      <span>Wyczyść</span>
                    </Button>
                  </div>
                </div>
                <CommandEmpty className="py-8 text-center text-sm">
                  Nie znaleziono pracowników
                </CommandEmpty>
                <CommandList className="max-h-[300px] md:max-h-[400px]">
                  <CommandGroup>
                    {filteredEmployees.map((employee) => (
                      <CommandItem
                        key={employee.id}
                        value={employee.id.toString()}
                        onSelect={() => toggleEmployee(employee.id)}
                        className={cn(
                          "py-3 px-3 sm:py-3.5 sm:px-4 transition-all cursor-pointer",
                          "data-[selected=true]:bg-accent/10",
                          selectedEmployees.includes(employee.id)
                            ? "border-l-2 border-primary dark:border-primary shadow-sm bg-primary/5"
                            : "hover:bg-accent/10 border-l-2 border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 w-full">
                          <div
                            className={cn(
                              "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md border transition-all",
                              selectedEmployees.includes(employee.id)
                                ? "border-primary dark:border-primary border-2 shadow-sm"
                                : "border-input hover:border-primary/50"
                            )}
                          >
                            <Check
                              className={cn(
                                "h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-primary transition-opacity",
                                selectedEmployees.includes(employee.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                "font-medium transition-colors text-sm sm:text-base",
                                selectedEmployees.includes(employee.id)
                                  ? "text-primary dark:text-primary"
                                  : ""
                              )}
                            >
                              {employee.name} {employee.surname}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {selectedEmployeesDetails.length > 0 && (
        <div className="mt-2 animate-in fade-in-0 duration-300">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {visibleBadges.map((employee) => (
              <Badge
                key={employee.id}
                variant="outline"
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 transition-all hover:bg-accent/10 group border-primary/30 text-xs sm:text-sm"
              >
                <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary/70" />
                <span className="font-normal">
                  {employee.name} {employee.surname}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 sm:h-5 sm:w-5 p-0 ml-0.5 sm:ml-1 rounded-full opacity-70 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  onClick={(e) => removeEmployee(employee.id, e)}
                >
                  <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="sr-only">
                    Usuń {employee.name} {employee.surname}
                  </span>
                </Button>
              </Badge>
            ))}

            {hiddenBadgesCount > 0 &&
              selectedEmployeesDetails.length > maxVisibleBadges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllSelected(!showAllSelected)}
                  className="h-8 px-2 sm:px-3 text-xs flex items-center gap-1 hover:bg-accent/10 transition-colors border-primary/30"
                >
                  {showAllSelected ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>Pokaż mniej</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      <span>+{hiddenBadgesCount} więcej</span>
                    </>
                  )}
                </Button>
              )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-1 flex items-center gap-1.5 animate-in fade-in-0 duration-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
