"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const formSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  surname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  login: z.string().min(3, "Login musi mieć minimum 3 znaki"),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
  working_hours: z.number().min(0).default(0),
  places: z.array(z.number()).min(1, "Wybierz co najmniej jedno miejsce pracy"),
  type_of_user: z.string().default("0"),
  phone: z
    .string()
    .min(9, "Numer telefonu musi mieć 9 cyfr")
    .max(9, "Numer telefonu musi mieć 9 cyfr")
    .regex(/^\d{9}$/, "Numer telefonu musi składać się z 9 cyfr")
    .transform((val) => val.replace(/\D/g, "")),
});

type FormValues = z.infer<typeof formSchema>;

export function AddEmployeeForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [placesInput, setPlacesInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      surname: "",
      login: "",
      password: "",
      working_hours: 0,
      places: [],
      type_of_user: "0",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);

      if (!data.phone) {
        form.setError("phone", {
          type: "manual",
          message: "Numer telefonu jest wymagany",
        });
        return;
      }

      const places = data.places
        .filter((num) => num > 0)
        .map((num) => Number(num));

      if (places.length === 0) {
        form.setError("places", {
          type: "manual",
          message: "Wybierz co najmniej jedno miejsce pracy",
        });
        return;
      }

      const formData = {
        ...data,
        type_of_user: Number(data.type_of_user),
        working_hours: Number(data.working_hours),
        places: places,
        phone: data.phone.replace(/\D/g, ""),
      };

      console.log("Sending data:", formData);

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (
          response.status === 400 &&
          responseData.error === "Użytkownik o podanym loginie już istnieje"
        ) {
          form.setError("login", {
            type: "manual",
            message: "Ten login jest już zajęty. Wybierz inny login.",
          });
          return;
        }
        throw new Error(
          responseData.error || "Wystąpił błąd podczas dodawania pracownika"
        );
      }

      toast.success("Pracownik został dodany pomyślnie");
      form.reset();
      setPlacesInput("");
      onSuccess();
    } catch (error) {
      console.error("Błąd podczas dodawania pracownika:", error);
      toast.error(
        error instanceof Error ? error.message : "Wystąpił nieznany błąd"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Wprowadź imię"
                      {...field}
                      className="bg-white dark:bg-slate-950"
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
                      placeholder="Wprowadź nazwisko"
                      {...field}
                      className="bg-white dark:bg-slate-950"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Wprowadź login"
                      {...field}
                      className="bg-white dark:bg-slate-950"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Wprowadź hasło"
                      {...field}
                      className="bg-white dark:bg-slate-950"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="working_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Godziny pracy</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="bg-white dark:bg-slate-950"
                    />
                  </FormControl>
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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="select-trigger bg-white dark:bg-slate-950">
                        <SelectValue
                          placeholder="Wybierz typ użytkownika"
                          className="select-trigger"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      className="bg-white dark:bg-slate-950"
                      position="popper"
                      style={{ backgroundColor: "white" }}
                    >
                      <SelectItem
                        value="0"
                        className="bg-white dark:bg-slate-950"
                      >
                        Użytkownik
                      </SelectItem>
                      <SelectItem
                        value="1"
                        className="bg-white dark:bg-slate-950"
                      >
                        Administrator
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="places"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Miejsc pracy</FormLabel>
                <FormControl>
                  <Input
                    placeholder="np. 1,2,3"
                    value={placesInput}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (!/^[0-9,]*$/.test(newValue)) {
                        return;
                      }
                      setPlacesInput(newValue);

                      const numbers = newValue
                        .split(",")
                        .map((num) => num.trim())
                        .filter((num) => num !== "")
                        .map((num) => parseInt(num))
                        .filter((num) => !isNaN(num) && num > 0);

                      field.onChange(numbers);
                      console.log("Parsed places:", numbers);
                    }}
                    className="bg-white dark:bg-slate-950"
                  />
                </FormControl>
                <FormDescription>
                  Wprowadź ID miejsc pracy oddzielone przecinkami (np. 1,2,3)
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
                <FormLabel>Numer telefonu</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Wprowadź numer telefonu"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 9);
                      field.onChange(value);
                    }}
                    className="bg-white dark:bg-slate-950"
                  />
                </FormControl>
                <FormDescription>
                  Wprowadź 9-cyfrowy numer telefonu
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Dodawanie..." : "Dodaj pracownika"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
