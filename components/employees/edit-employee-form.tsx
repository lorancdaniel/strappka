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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  phone: z
    .string()
    .regex(/^\d{9}$/, "Numer telefonu musi składać się z 9 cyfr")
    .or(z.literal(""))
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

type EditEmployeeFormProps = {
  employee: Employee;
  onSuccessAction: () => void;
  onCancelAction: () => void;
};

export function EditEmployeeForm({
  employee,
  onSuccessAction,
  onCancelAction,
}: EditEmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: employee.name,
      surname: employee.surname,
      login: employee.login,
      working_hours: employee.working_hours,
      places: employee.places?.join(",") || "",
      type_of_user: employee.type_of_user.toString(),
      newPassword: "",
      phone: employee.phone?.toString() || "",
    },
  });

  // Update the handleFieldChange function with proper typing
  const handleFieldChange =
    (fieldName: keyof z.infer<typeof formSchema>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setModifiedFields((prev) => new Set(prev).add(fieldName));
      form.setValue(fieldName, e.target.value);
    };

  // Update the working hours change handler
  const handleWorkingHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModifiedFields((prev) => new Set(prev).add("working_hours"));
    const value = e.target.value;
    const numValue = value ? parseFloat(value.replace(",", ".")) : 0;

    if (!isNaN(numValue)) {
      form.setValue("working_hours", numValue);
    }
  };

  // Add new handler for resetting hours
  const handleResetHours = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (resetConfirmation.toLowerCase() === "resetuj") {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/employees/${employee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ working_hours: 0 }),
        });

        if (!response.ok) {
          throw new Error("Nie udało się zresetować godzin");
        }

        // Aktualizuj formularz i oznacz pole jako zmodyfikowane
        setModifiedFields((prev) => new Set(prev).add("working_hours"));
        form.setValue("working_hours", 0);

        toast.success("Godziny zostały zresetowane");
        setIsResetModalOpen(false);
        setResetConfirmation("");

        // Opcjonalnie - odśwież widok
        onSuccessAction();
      } catch (error) {
        console.error("Error resetting hours:", error);
        toast.error("Wystąpił błąd podczas resetowania godzin");
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Wpisz "resetuj" aby potwierdzić');
    }
  };

  // Add new handler for deleting employee
  const handleDeleteEmployee = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    // Add early return if user is an admin
    if (employee.type_of_user === 1) {
      toast.error("Nie można usunąć administratora");
      setIsDeleteModalOpen(false);
      setDeleteConfirmation("");
      return;
    }

    if (deleteConfirmation.toLowerCase() === "usuń") {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        const response = await fetch(`/api/employees/${employee.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Nie udało się usunąć pracownika");
        }

        toast.success("Pracownik został usunięty");
        setIsDeleteModalOpen(false);
        setDeleteConfirmation("");
        onSuccessAction();
      } catch (error) {
        console.error("Error deleting employee:", error);
        toast.error("Wystąpił błąd podczas usuwania pracownika");
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Wpisz "usuń" aby potwierdzić');
    }
  };

  // Update the onSubmit function to only include actually changed values
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const payload: any = {};

      // Only process fields that were actually modified by the user
      Array.from(modifiedFields).forEach((field) => {
        const fieldName = field as keyof typeof values;
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
          case "phone":
            if (values.phone !== employee.phone?.toString()) {
              payload.phone = values.phone
                ? values.phone.replace(/\D/g, "")
                : null;
            }
            break;
          case "newPassword":
            if (values.newPassword) {
              payload.newPassword = values.newPassword;
            }
            break;
        }
      });

      if (Object.keys(payload).length === 0) {
        toast.info("Nie wprowadzono żadnych zmian");
        return;
      }

      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Wystąpił błąd podczas aktualizacji pracownika"
        );
      }

      toast.success("Dane pracownika zostały zaktualizowane");
      onSuccessAction();
    } catch (error) {
      console.error("Błąd podczas aktualizacji pracownika:", error);
      toast.error(
        error instanceof Error ? error.message : "Wystąpił nieznany błąd"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 sm:space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mb-6 sm:mb-0 sm:mt-6 order-first sm:order-last">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteEmployee}
              disabled={isLoading || employee.type_of_user === 1}
              className="w-full sm:w-auto"
            >
              Usuń pracownika
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancelAction}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={handleFieldChange("login")} />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="working_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Godziny pracy</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        value={field.value}
                        onChange={handleWorkingHoursChange}
                        onBlur={() => {
                          const numValue = Number(field.value);
                          if (!isNaN(numValue)) {
                            form.setValue("working_hours", numValue);
                          }
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetHours}
                      className="whitespace-nowrap"
                    >
                      Resetuj
                    </Button>
                  </div>
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
                      onChange={(e) => {
                        const newValue = e.target.value;
                        // Only allow numbers and commas
                        if (!/^[0-9,]*$/.test(newValue)) {
                          return;
                        }
                        setModifiedFields((prev) => new Set(prev).add("places"));
                        field.onChange(newValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numer telefonu</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Wprowadź numer telefonu"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 9);
                      setModifiedFields((prev) => new Set(prev).add("phone"));
                      field.onChange(value);
                    }}
                    className="bg-white dark:bg-slate-950"
                  />
                </FormControl>
                <FormDescription>
                  Wprowadź 9-cyfrowy numer telefonu (opcjonalne)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Wybierz typ użytkownika" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent
                    position="popper"
                    align="center"
                    side="bottom"
                    className="w-full min-w-[200px]"
                  >
                    <SelectItem value="0">Pracownik</SelectItem>
                    <SelectItem value="1">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź reset godzin</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Wpisz &quot;resetuj&quot; aby potwierdzić reset godzin
              </label>
              <Input
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                placeholder="resetuj"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsResetModalOpen(false);
                setResetConfirmation("");
              }}
            >
              Anuluj
            </Button>
            <Button type="button" onClick={handleConfirmReset}>
              Potwierdź
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie pracownika</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ta operacja jest nieodwracalna. Wszystkie dane pracownika
                zostaną usunięte.
              </p>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Wpisz &quot;usuń&quot; aby potwierdzić usunięcie pracownika
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="usuń"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmation("");
              }}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Usuń pracownika
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
