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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlacesSelector } from "@/components/employees/places-selector";
import { Employee } from "@/types/employee";

const formSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  surname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  email: z
    .string()
    .email("Podaj prawidłowy adres email")
    .min(3, "Email musi mieć minimum 3 znaki"),
  type_of_user: z.coerce.number(),
  places: z.string(),
  newPassword: z.string().optional(),
  phone: z
    .string()
    .regex(/^\d{9}$/, "Numer telefonu musi składać się z 9 cyfr")
    .or(z.literal(""))
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedPlaces, setSelectedPlaces] = useState<number[]>(
    Array.isArray(employee.places)
      ? employee.places.map((place) =>
          typeof place === "number" ? place : parseInt(place)
        )
      : []
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: employee.name,
      surname: employee.surname,
      email: employee.login,
      places: Array.isArray(employee.places)
        ? employee.places
            .map((place) =>
              typeof place === "number" ? place : parseInt(place)
            )
            .join(",")
        : "",
      type_of_user: employee.type_of_user,
      newPassword: "",
      phone: employee.phone !== null ? employee.phone.toString() : "",
    },
  });

  const handleFieldChange =
    (fieldName: keyof z.infer<typeof formSchema>) => (e: unknown) => {
      setModifiedFields((prev) => new Set(prev).add(fieldName));

      // Sprawdź, czy e jest obiektem z właściwością target.value
      let value: unknown;
      if (e && typeof e === "object" && "target" in e) {
        const target = e.target as { value?: unknown };
        if (target && "value" in target) {
          value = target.value;
        } else {
          value = e;
        }
      } else {
        value = e;
      }

      form.setValue(fieldName, value as string);
    };

  const handleDeleteEmployee = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
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

  const handlePlacesChange = (newPlaces: number[]) => {
    setModifiedFields((prev) => new Set(prev).add("places"));
    setSelectedPlaces(newPlaces);
    form.setValue("places", newPlaces.join(","));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const payload: Record<string, unknown> = {};

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
          case "email":
            if (values.email !== employee.login) {
              payload.login = values.email;
            }
            break;
          case "type_of_user":
            if (values.type_of_user !== employee.type_of_user) {
              payload.type_of_user = values.type_of_user;
            }
            break;
          case "places":
            const newPlaces = values.places
              ? values.places
                  .split(",")
                  .map(Number)
                  .filter((n) => !isNaN(n))
              : [];

            const currentPlaces = Array.isArray(employee.places)
              ? employee.places.map((place) =>
                  typeof place === "number" ? place : parseInt(place)
                )
              : [];

            if (JSON.stringify(newPlaces) !== JSON.stringify(currentPlaces)) {
              payload.places = newPlaces;
            }
            break;
          case "phone":
            const currentPhone =
              employee.phone === null ? null : employee.phone.toString();
            if (values.phone !== currentPhone) {
              payload.phone = values.phone
                ? parseInt(values.phone.replace(/\D/g, ""))
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

      console.log("Wysyłane dane:", payload);

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
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("name")(e);
                      }}
                    />
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
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("surname")(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("email")(e);
                      }}
                    />
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
                    <Input
                      type="password"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("newPassword")(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="places"
              render={() => (
                <FormItem>
                  <FormLabel>Miejsca pracy</FormLabel>
                  <FormControl>
                    <PlacesSelector
                      selectedPlaces={selectedPlaces}
                      onPlacesChange={handlePlacesChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Wybierz miejsca pracy, do których pracownik ma mieć dostęp
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Input
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value === null ? "" : field.value}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("phone")(e);
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
            name="type_of_user"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typ użytkownika</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleFieldChange("type_of_user")(value);
                  }}
                  defaultValue={field.value.toString()}
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
