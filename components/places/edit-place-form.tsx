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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeesSelector } from "@/components/places/employees-selector";
import { Place } from "@/types/place";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formChanged, setFormChanged] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: place.name,
      adress: place.adress,
      employes: place.employes || [],
    },
  });

  const handleEmployeesChange = (selectedEmployees: number[]) => {
    form.setValue("employes", selectedEmployees);
    setFormChanged(true);
  };

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

        <FormField
          control={form.control}
          name="employes"
          render={() => (
            <FormItem>
              <FormLabel>Pracownicy</FormLabel>
              <FormControl>
                <EmployeesSelector
                  selectedEmployees={form.getValues("employes")}
                  onEmployeesChange={handleEmployeesChange}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Wybierz pracowników, którzy będą pracować w tym miejscu
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-2">
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
