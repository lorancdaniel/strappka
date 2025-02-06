"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Place } from "@/types/place";
import { toast } from "react-hot-toast";

const formSchema = z.object({
  placeId: z.string({
    required_error: "Proszę wybrać miejsce pracy",
  }),
});

export default function DodajRaportPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/places");
      if (!response.ok) {
        throw new Error("Nie udało się pobrać miejsc pracy");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas pobierania danych");
      }

      setPlaces(data.data);
    } catch (error: any) {
      console.error("Błąd podczas pobierania miejsc pracy:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Tutaj będzie logika tworzenia raportu
    console.log(values);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dodaj Raport</h1>
      </div>
      <p className="text-muted-foreground">
        Wybierz miejsce pracy, dla którego chcesz utworzyć raport.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="placeId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Miejsce pracy</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                      >
                        {field.value
                          ? places.find((place) => place.id.toString() === field.value)?.name
                          : "Wybierz miejsce pracy"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Szukaj miejsca pracy..." />
                      <CommandEmpty>Nie znaleziono miejsca pracy.</CommandEmpty>
                      <CommandGroup>
                        {places.map((place) => (
                          <CommandItem
                            key={place.id}
                            value={place.id.toString()}
                            onSelect={(currentValue) => {
                              form.setValue("placeId", currentValue);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === place.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {place.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            Utwórz raport
          </Button>
        </form>
      </Form>
    </div>
  );
}
