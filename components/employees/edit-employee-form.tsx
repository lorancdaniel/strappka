"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Employee } from "@/types/employee";

const AVAILABLE_PLACES = [
  { value: 1, label: "Miejsce 1" },
  { value: 2, label: "Miejsce 2" },
  { value: 3, label: "Miejsce 3" },
  { value: 4, label: "Miejsce 4" },
  { value: 5, label: "Miejsce 5" },
];

const formSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  surname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  login: z.string().min(3, "Login musi mieć minimum 3 znaki"),
  working_hours: z.number().default(0),
  type_of_user: z.string(),
  places: z.string(),
  newPassword: z.string().optional(),
});

type EditEmployeeFormProps = {
  employee: Employee;
  onSuccess: () => void;
  onCancel: () => void;
};

// Define the type for form field names
type FormFields = keyof z.infer<typeof formSchema>;

export function EditEmployeeForm({
  employee,
  onSuccess,
  onCancel,
}: EditEmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: employee.name || "",
      surname: employee.surname || "",
      login: employee.login || "",
      working_hours: Number(employee.working_hours) || 0,
      type_of_user: employee.type_of_user?.toString() || "0",
      places: employee.places ? employee.places.join(",") : "",
      newPassword: "",
    },
  });

  // Update the handleFieldChange function with proper typing
  const handleFieldChange =
    (fieldName: FormFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setModifiedFields((prev) => new Set(prev).add(fieldName));
      form.setValue(fieldName, e.target.value);
    };

  // Update the working hours change handler to properly handle numeric conversion
  const handleWorkingHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModifiedFields((prev) => new Set(prev).add("working_hours"));
    const value = e.target.value;
    const numValue = value ? parseFloat(value.replace(",", ".")) : 0;

    if (!isNaN(numValue)) {
      form.setValue("working_hours", numValue);
    }
  };

  // Update the onSubmit function to only include actually changed values
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const payload: any = {};

      // Only process fields that were actually modified by the user
      Array.from(modifiedFields).forEach((field) => {
        const fieldName = field as FormFields;

        switch (fieldName) {
          case "name":
            if (values.name !== employee.name) {
              payload.name = values.name;
            }
            break;
          case "surname":
            if (values.surname !== employee.surname) {
              payload.surname = values.surname;
            }
            break;
          case "login":
            if (values.login !== employee.login) {
              payload.login = values.login;
            }
            break;
          case "working_hours":
            const workingHours = Number(values.working_hours);
            if (
              !isNaN(workingHours) &&
              workingHours !== employee.working_hours
            ) {
              payload.working_hours = workingHours;
            }
            break;
          case "type_of_user":
            const newTypeValue = parseInt(values.type_of_user);
            if (
              !isNaN(newTypeValue) &&
              newTypeValue !== employee.type_of_user
            ) {
              payload.type_of_user = newTypeValue;
            }
            break;
          case "places":
            const newPlaces = values.places
              ? values.places
                  .split(",")
                  .map(Number)
                  .filter((n) => !isNaN(n))
              : [];
            if (JSON.stringify(newPlaces) !== JSON.stringify(employee.places)) {
              payload.places = newPlaces;
            }
            break;
        }
      });

      // Handle password separately as it's optional
      if (values.newPassword?.trim()) {
        payload.newPassword = values.newPassword.trim();
      }

      console.log("Modified fields:", Array.from(modifiedFields));
      console.log("Final payload being sent:", payload);

      // Only proceed if there are actual changes
      if (Object.keys(payload).length === 0) {
        toast.info("Nie wprowadzono żadnych zmian");
        onSuccess();
        return;
      }

      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się zaktualizować pracownika");
      }

      toast.success("Pracownik został zaktualizowany");
      onSuccess();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas aktualizacji pracownika"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imię</FormLabel>
                <FormControl>
                  <Input {...field} onChange={handleFieldChange("name")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="surname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwisko</FormLabel>
                <FormControl>
                  <Input {...field} onChange={handleFieldChange("surname")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="login"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Login</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nowe hasło (opcjonalne)</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="working_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Godziny pracy</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    value={
                      typeof field.value === "number"
                        ? field.value
                        : Number(field.value) || ""
                    }
                    onChange={handleWorkingHoursChange}
                    onBlur={() => {
                      // Ensure numeric value on blur
                      const numValue = Number(field.value);
                      if (!isNaN(numValue)) {
                        form.setValue("working_hours", numValue);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="places"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Miejsca pracy (numery oddzielone przecinkami)
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={field.value}
                    onChange={handleFieldChange("places")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="type_of_user"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ użytkownika</FormLabel>
              <Select
                onValueChange={(value) => {
                  setModifiedFields((prev) =>
                    new Set(prev).add("type_of_user")
                  );
                  field.onChange(value);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ użytkownika" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Pracownik</SelectItem>
                  <SelectItem value="1">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
