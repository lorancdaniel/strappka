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

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  adress: z.string().min(1, "Adres jest wymagany"),
});

type FormData = z.infer<typeof formSchema>;

interface AddPlaceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddPlaceForm({ onSuccess, onCancel }: AddPlaceFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      adress: "",
    },
  });

  const onSubmit = async (values: FormData) => {
    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          employes: [], // New places start with no employees
        }),
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

        <div className="flex justify-end gap-4">
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
