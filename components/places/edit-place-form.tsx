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
import { Place } from "@/types/place";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  adress: z.string().min(1, "Adres jest wymagany"),
  employes: z.array(z.number()),
});

type FormData = z.infer<typeof formSchema>;

interface EditPlaceFormProps {
  place: Place;
  onSuccessAction?: () => void;
  onCancelAction?: () => void;
}

interface Employee {
  id: number;
  name: string;
  surname: string;
}

export function EditPlaceForm({
  place,
  onSuccessAction,
  onCancelAction,
}: EditPlaceFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: place.name,
      adress: place.adress,
      employes: place.employes,
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

  const onSubmit = async (values: FormData) => {
    try {
      const response = await fetch(`/api/places/${place.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zaktualizować miejsca pracy");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas aktualizacji");
      }

      toast.success("Miejsce pracy zostało zaktualizowane");

      if (onSuccessAction) {
        onSuccessAction();
      }
    } catch (error: any) {
      console.error("Błąd podczas aktualizacji miejsca pracy:", error);
      toast.error(error.message);
    }
  };

  const handleEmployeeToggle = (employeeId: number) => {
    const currentEmployes = form.getValues("employes");
    const newEmployes = currentEmployes.includes(employeeId)
      ? currentEmployes.filter((id) => id !== employeeId)
      : [...currentEmployes, employeeId];
    form.setValue("employes", newEmployes);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center space-x-2 border p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={form.getValues("employes").includes(employee.id)}
                  onChange={() => handleEmployeeToggle(employee.id)}
                  className="h-4 w-4"
                />
                <span>
                  {employee.name} {employee.surname}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          {onCancelAction && (
            <Button type="button" variant="outline" onClick={onCancelAction}>
              Anuluj
            </Button>
          )}
          <Button type="submit">Zapisz zmiany</Button>
        </div>
      </form>
    </Form>
  );
}
