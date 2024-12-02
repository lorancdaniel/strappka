"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useState } from "react";

interface Employee {
  id: number;
  name: string;
  surname: string;
}

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  adress: z.string().min(1, "Adres jest wymagany"),
  employes: z.array(z.number()),
});

type FormData = z.infer<typeof formSchema>;

interface AddPlaceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddPlaceForm({ onSuccess, onCancel }: AddPlaceFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState<Employee[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      adress: "",
      employes: [],
    },
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees");
        if (!response.ok) {
          throw new Error("Nie udało się pobrać pracowników");
        }
        const data = await response.json();
        if (data.success) {
          setEmployees(data.data);
        }
      } catch (error: any) {
        console.error("Błąd podczas pobierania pracowników:", error);
        toast.error(error.message);
      }
    };

    fetchEmployees();
  }, []);

  const handleEmployeeSelect = (employeeId: number) => {
    const currentEmployes = form.getValues("employes");
    if (!currentEmployes.includes(employeeId)) {
      const newEmployes = [...currentEmployes, employeeId];
      form.setValue("employes", newEmployes);
      const selectedEmployee = employees.find(emp => emp.id === employeeId);
      if (selectedEmployee) {
        setAssignedEmployees([...assignedEmployees, selectedEmployee]);
      }
    }
    setOpen(false);
  };

  const handleRemoveEmployee = (employeeId: number) => {
    const currentEmployes = form.getValues("employes");
    const newEmployes = currentEmployes.filter(id => id !== employeeId);
    form.setValue("employes", newEmployes);
    setAssignedEmployees(assignedEmployees.filter(emp => emp.id !== employeeId));
  };

  const onSubmit = async (values: FormData) => {
    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Nie udało się dodać miejsca pracy");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas dodawania");
      }

      toast.success("Miejsce pracy zostało dodane");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Błąd podczas dodawania miejsca pracy:", error);
      toast.error(error.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa</FormLabel>
              <FormControl>
                <Input placeholder="Nazwa miejsca pracy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres</FormLabel>
              <FormControl>
                <Input placeholder="Adres miejsca pracy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormLabel>Przypisani pracownicy</FormLabel>
          
          {assignedEmployees.length > 0 && (
            <div className="grid gap-2 max-h-[200px] overflow-y-auto">
              {assignedEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between bg-secondary/20 p-2.5 rounded-md"
                >
                  <span className="text-sm">
                    {employee.name} {employee.surname}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveEmployee(employee.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                Dodaj pracownika
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Wyszukaj pracownika..." className="h-9" />
                <CommandEmpty>Nie znaleziono pracownika</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-y-auto">
                  {employees
                    .filter(emp => !form.getValues("employes").includes(emp.id))
                    .map((employee) => (
                      <CommandItem
                        key={employee.id}
                        value={`${employee.name} ${employee.surname}`}
                        onSelect={() => handleEmployeeSelect(employee.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.getValues("employes").includes(employee.id) 
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {employee.name} {employee.surname}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex justify-end gap-4 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Anuluj
            </Button>
          )}
          <Button type="submit">Dodaj miejsce pracy</Button>
        </div>
      </form>
    </Form>
  );
}
