"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Imię musi mieć minimum 2 znaki")
    .max(50, "Imię nie może być dłuższe niż 50 znaków")
    .regex(
      /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż\s-]+$/,
      "Imię może zawierać tylko litery, spacje i myślniki"
    ),

  surname: z
    .string()
    .min(2, "Nazwisko musi mieć minimum 2 znaki")
    .max(50, "Nazwisko nie może być dłuższe niż 50 znaków")
    .regex(
      /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż\s-]+$/,
      "Nazwisko może zawierać tylko litery, spacje i myślniki"
    ),

  login: z
    .string()
    .min(3, "Login musi mieć minimum 3 znaki")
    .max(30, "Login nie może być dłuższy niż 30 znaków")
    .regex(
      /^[a-z0-9._-]+$/,
      "Login może zawierać tylko małe litery, cyfry, kropki, podkreślenia i myślniki"
    ),

  password: z
    .string()
    .min(6, "Hasło musi mieć minimum 6 znaków")
    .max(50, "Hasło nie może być dłuższe niż 50 znaków")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]+$/,
      "Hasło musi zawierać co najmniej jedną małą literę, wielką literę i cyfrę"
    ),

  type_of_user: z.number().min(0).max(1),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onSuccessAction: () => void;
}

export function AddEmployeeDialog({
  open,
  onOpenChangeAction,
  onSuccessAction,
}: AddEmployeeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      surname: "",
      login: "",
      password: "",
      type_of_user: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          type_of_user: Number(values.type_of_user),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 400 &&
          data.error === "Użytkownik o podanym loginie już istnieje"
        ) {
          form.setError("login", {
            type: "manual",
            message: "Ten login jest już zajęty. Wybierz inny login.",
          });
          return;
        }
        throw new Error(
          data.error || "Wystąpił błąd podczas dodawania pracownika"
        );
      }

      toast.success("Pracownik został dodany pomyślnie");
      form.reset();
      onOpenChangeAction(false);
      onSuccessAction();
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
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Dodaj nowego pracownika
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię</FormLabel>
                  <FormControl>
                    <Input placeholder="Wprowadź imię" {...field} />
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
                    <Input placeholder="Wprowadź nazwisko" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login</FormLabel>
                  <FormControl>
                    <Input placeholder="Wprowadź login" {...field} />
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
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-slate-950 border">
                        <SelectValue placeholder="Wybierz typ użytkownika" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Użytkownik</SelectItem>
                      <SelectItem value="1">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChangeAction(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Dodawanie..." : "Dodaj pracownika"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
