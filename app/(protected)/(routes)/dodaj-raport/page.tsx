"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Place {
  id: number;
  name: string;
  adress: string;
}

interface CheckReportsResponse {
  hasStartReport: boolean;
  hasEndReport: boolean;
  hasAllReports: boolean;
  reportCount: number;
  reports: {
    id: number;
    place_id: number;
    report_date: string;
    report_type: "start" | "end";
  }[];
}

export default function DodajRaportPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch("/api/places/user", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać miejsc pracy");
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setPlaces(data.data);
        } else {
          throw new Error("Nieprawidłowy format danych");
        }
      } catch (err) {
        console.error("Błąd podczas pobierania miejsc pracy:", err);
        setError("Wystąpił błąd podczas pobierania miejsc pracy");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  const handlePlaceSelect = (value: string) => {
    setSelectedPlace(value);
  };

  const checkReports = async (placeId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/reports/check-reports?placeId=${placeId}&date=${today}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Błąd podczas sprawdzania raportów");
      }

      const data = (await response.json()) as CheckReportsResponse;
      console.log("[FRONTEND] Sprawdzanie raportów:", data);

      return data;
    } catch (error) {
      console.error("Błąd:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlace) return;

    setIsSubmitting(true);

    try {
      const reportsData = await checkReports(selectedPlace);

      if (!reportsData) {
        throw new Error("Nie udało się sprawdzić raportów");
      }

      // Jeśli oba raporty istnieją, przekieruj na pulpit
      if (reportsData.hasStartReport && reportsData.hasEndReport) {
        alert("Oba raporty na dzisiaj zostały już dodane.");
        router.push("/");
      } else {
        // W przeciwnym razie przejdź do formularza dodawania raportu
        router.push(`/dodaj-raport/${selectedPlace}`);
      }
    } catch (error) {
      console.error("Błąd:", error);
      setError("Wystąpił błąd podczas sprawdzania raportów");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Ładowanie miejsc pracy...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center p-4 rounded-lg bg-destructive/10 max-w-md">
          <p className="text-destructive font-medium mb-2">Błąd</p>
          <p className="text-sm">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-4 px-4 sm:py-6 sm:px-0">
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Dodaj Raport</CardTitle>
          <CardDescription>
            Wybierz miejsce pracy, dla którego chcesz utworzyć raport
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Dostępne miejsca pracy: {places.length}
              </p>
              <Select onValueChange={handlePlaceSelect} value={selectedPlace}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz miejsce pracy" />
                </SelectTrigger>
                <SelectContent className="max-h-[40vh]">
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.id.toString()}>
                      <div className="py-1">
                        <div className="font-medium">{place.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {place.adress}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!selectedPlace || isSubmitting}
              className="w-full py-6 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sprawdzanie...
                </>
              ) : (
                "Kontynuuj"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
