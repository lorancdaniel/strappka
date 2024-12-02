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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Place } from "@/types/place";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const formSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć minimum 2 znaki"),
  adress: z.string().min(2, "Adres musi mieć minimum 2 znaki"),
});

type EditPlaceFormProps = {
  place: Place;
  onSuccessAction: () => void;
  onCancelAction: () => void;
};

export function EditPlaceForm({
  place,
  onSuccessAction,
  onCancelAction,
}: EditPlaceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: place.name,
      adress: place.adress,
    },
  });

  const handleFieldChange =
    (fieldName: keyof z.infer<typeof formSchema>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setModifiedFields((prev) => new Set(prev).add(fieldName));
      form.setValue(fieldName, e.target.value);
    };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      const updatedFields = Object.fromEntries(
        Object.entries(values).filter(([key]) => modifiedFields.has(key))
      );

      if (Object.keys(updatedFields).length === 0) {
        toast.info("Nie wprowadzono żadnych zmian");
        return;
      }

      const response = await fetch(`/api/places/${place.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zaktualizować miejsca");
      }

      toast.success("Miejsce zostało zaktualizowane");
      onSuccessAction();
    } catch (error) {
      console.error("Błąd podczas aktualizacji miejsca:", error);
      toast.error("Wystąpił błąd podczas aktualizacji miejsca");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.toLowerCase() !== "usuń") {
      toast.error('Wpisz "usuń" aby potwierdzić');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/places/${place.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Nie udało się usunąć miejsca");
      }

      toast.success("Miejsce zostało usunięte");
      onSuccessAction();
    } catch (error) {
      console.error("Błąd podczas usuwania miejsca:", error);
      toast.error("Wystąpił błąd podczas usuwania miejsca");
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwa</FormLabel>
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
            name="adress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adres</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleFieldChange("adress")(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Usuń miejsce
            </Button>
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancelAction}
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń miejsce</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Czy na pewno chcesz usunąć to miejsce? Ta akcja jest nieodwracalna.
            </p>
            <p className="mt-2">
              Wpisz <strong>usuń</strong> aby potwierdzić:
            </p>
            <Input
              className="mt-2"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Usuwanie..." : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
