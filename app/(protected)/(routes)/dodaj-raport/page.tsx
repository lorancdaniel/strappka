"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  MapPin,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportsStatus, setReportsStatus] = useState<
    Map<number, { hasStartReport: boolean; hasEndReport: boolean }>
  >(new Map());
  const [isCheckingReports, setIsCheckingReports] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const router = useRouter();

  // Filtrowanie miejsc pracy na podstawie wyszukiwania
  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return places;

    const query = searchQuery.toLowerCase();
    return places.filter(
      (place) =>
        place.name.toLowerCase().includes(query) ||
        place.adress.toLowerCase().includes(query)
    );
  }, [places, searchQuery]);

  // Paginacja
  const totalPages = Math.ceil(filteredPlaces.length / itemsPerPage);
  const paginatedPlaces = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlaces.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlaces, currentPage]);

  useEffect(() => {
    // Reset strony przy zmianie wyszukiwania
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
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

          // Automatycznie sprawdź status raportów dla wszystkich miejsc
          checkAllReportsStatus(data.data);
        } else {
          throw new Error("Nieprawidłowy format danych");
        }
      } catch (err) {
        console.error("Błąd podczas pobierania miejsc pracy:", err);
        setError("Wystąpił błąd podczas pobierania miejsc pracy");
        toast.error("Nie udało się pobrać miejsc pracy");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  const checkAllReportsStatus = async (placesToCheck: Place[]) => {
    setIsCheckingReports(true);
    const statusMap = new Map<
      number,
      { hasStartReport: boolean; hasEndReport: boolean }
    >();

    try {
      const today = new Date().toISOString().split("T")[0];

      // Sprawdź status raportów dla każdego miejsca
      const promises = placesToCheck.map(async (place) => {
        try {
          const response = await fetch(
            `/api/reports/check-reports?placeId=${place.id}&date=${today}`,
            { credentials: "include" }
          );

          if (response.ok) {
            const data = (await response.json()) as CheckReportsResponse;
            statusMap.set(place.id, {
              hasStartReport: data.hasStartReport,
              hasEndReport: data.hasEndReport,
            });
          }
        } catch (error) {
          console.error(
            `Błąd sprawdzania raportów dla miejsca ${place.id}:`,
            error
          );
        }
      });

      await Promise.all(promises);
      setReportsStatus(statusMap);
    } catch (error) {
      console.error("Błąd podczas sprawdzania statusów raportów:", error);
      toast.error("Nie udało się sprawdzić statusów raportów");
    } finally {
      setIsCheckingReports(false);
    }
  };

  const refreshReportsStatus = async () => {
    await checkAllReportsStatus(places);
    toast.success("Statusy raportów zostały zaktualizowane");
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleSubmit = async () => {
    if (!selectedPlace) return;

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/reports/check-reports?placeId=${selectedPlace.id}&date=${today}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Błąd podczas sprawdzania raportów");
      }

      const reportsData = (await response.json()) as CheckReportsResponse;

      // Jeśli oba raporty istnieją, przekieruj na pulpit
      if (reportsData.hasStartReport && reportsData.hasEndReport) {
        toast.info("Oba raporty na dzisiaj zostały już dodane.");
        router.push("/");
      } else {
        // W przeciwnym razie przejdź do formularza dodawania raportu
        router.push(`/dodaj-raport/${selectedPlace.id}`);
      }
    } catch (error) {
      console.error("Błąd:", error);
      toast.error("Wystąpił błąd podczas sprawdzania raportów");
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
    <div className="container max-w-4xl mx-auto py-4 px-4 sm:py-6 sm:px-0">
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Dodaj Raport</CardTitle>
              <CardDescription>
                Wybierz miejsce pracy, dla którego chcesz utworzyć raport
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshReportsStatus}
                disabled={isCheckingReports}
              >
                {isCheckingReports ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Odśwież statusy</span>
              </Button>
            </div>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj miejsca pracy..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Nie znaleziono miejsc pracy pasujących do wyszukiwania
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setSearchQuery("")}
                >
                  Wyczyść wyszukiwanie
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedPlaces.map((place) => {
                  const status = reportsStatus.get(place.id);
                  const hasStartReport = status?.hasStartReport || false;
                  const hasEndReport = status?.hasEndReport || false;
                  const hasAllReports = hasStartReport && hasEndReport;

                  return (
                    <Card
                      key={place.id}
                      className={cn(
                        "cursor-pointer border-2 transition-all hover:shadow-md",
                        selectedPlace?.id === place.id
                          ? "border-primary"
                          : "border-transparent hover:border-primary/30"
                      )}
                      onClick={() => handlePlaceSelect(place)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col h-full">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium truncate">
                              {place.name}
                            </h3>
                            {hasAllReports && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Wszystkie raporty na dziś zostały dodane
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          <div className="flex items-start gap-1 text-xs text-muted-foreground mb-3">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span className="truncate">{place.adress}</span>
                          </div>

                          <div className="mt-auto pt-2 flex flex-wrap gap-2">
                            <Badge
                              variant={hasStartReport ? "default" : "outline"}
                              className={cn(
                                hasStartReport
                                  ? "bg-green-500/80 hover:bg-green-500/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              Raport początkowy
                            </Badge>
                            <Badge
                              variant={hasEndReport ? "default" : "outline"}
                              className={cn(
                                hasEndReport
                                  ? "bg-green-500/80 hover:bg-green-500/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              Raport końcowy
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Paginacja */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Strona {currentPage} z {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-4 px-6">
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlace || isSubmitting}
            className="w-full py-6 text-base gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sprawdzanie...
              </>
            ) : (
              <>
                Kontynuuj
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
