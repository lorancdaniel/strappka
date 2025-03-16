"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/datepicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface Place {
  id: number;
  name: string;
}

interface Report {
  id: number;
  place_id: number;
  place_name: string;
  user_id: number;
  user_name: string;
  report_date: string;
  report_type: string;
  created_at: string;
  fruits: {
    fruit_id: number;
    fruit_name: string;
    initial_quantity: number;
    remaining_quantity: number;
    waste_quantity: number;
    price_per_kg: number;
    gross_sales: number;
  }[];
}

interface ReportStatus {
  hasStartReport: boolean;
  hasEndReport: boolean;
  hasAllReports: boolean;
}

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPlace, setSelectedPlace] = useState<string>("all");
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingStart, setIsDeletingStart] = useState(false);
  const [isDeletingEnd, setIsDeletingEnd] = useState(false);
  const [showDeleteStartDialog, setShowDeleteStartDialog] = useState(false);
  const [showDeleteEndDialog, setShowDeleteEndDialog] = useState(false);

  // Pobierz listę miejsc
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch("/api/places", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać listy miejsc");
        }

        const data = await response.json();
        console.log("Otrzymane dane miejsc:", data);

        if (data.success && Array.isArray(data.data)) {
          setPlaces(data.data || []);
        } else {
          console.error("Nieprawidłowy format danych z API miejsc:", data);
          toast.error("Nieprawidłowy format danych z API miejsc");
        }
      } catch (error) {
        console.error("Błąd podczas pobierania miejsc:", error);
        toast.error("Nie udało się pobrać listy miejsc");
      }
    };

    fetchPlaces();
  }, []);

  // Pobierz raporty - zdefiniowane jako useCallback, aby uniknąć problemów z zależnościami
  const fetchReports = useCallback(async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      console.log(
        "Pobieranie raportów dla daty:",
        selectedDate,
        "i miejsca:",
        selectedPlace
      );

      const dateParam = selectedDate.toISOString().split("T")[0];

      // Tworzenie URL z parametrami
      const params = new URLSearchParams();
      params.append("date", dateParam);

      // Dodaj placeId tylko jeśli nie jest "all"
      if (selectedPlace && selectedPlace !== "all") {
        params.append("placeId", selectedPlace);
      }

      const url = `/api/reports?${params.toString()}`;
      console.log("Wysyłam zapytanie do:", url);

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Błąd z API:", errorData);
        throw new Error(errorData.error || "Błąd podczas pobierania raportów");
      }

      const data = await response.json();
      console.log("Otrzymane dane raportów:", data);

      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports || []);
        if (data.reports.length === 0) {
          toast.info("Nie znaleziono raportów dla wybranych kryteriów");
        }
      } else {
        console.error("Nieprawidłowy format danych z API raportów:", data);
        toast.error("Nieprawidłowy format danych z API raportów");
        setReports([]);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania raportów:", error);
      toast.error(
        error instanceof Error ? error.message : "Nie udało się pobrać raportów"
      );
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedPlace]);

  // Sprawdź status raportów dla wybranego miejsca i daty
  const checkReportsStatus = useCallback(async () => {
    if (!selectedDate || selectedPlace === "all") return;

    try {
      const dateParam = selectedDate.toISOString().split("T")[0];
      const response = await fetch(
        `/api/reports/check-reports?placeId=${selectedPlace}&date=${dateParam}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Błąd podczas sprawdzania statusu raportów"
        );
      }

      const data = await response.json();
      setReportStatus({
        hasStartReport: data.hasStartReport,
        hasEndReport: data.hasEndReport,
        hasAllReports: data.hasAllReports,
      });
    } catch (error) {
      console.error("Błąd podczas sprawdzania statusu raportów:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się sprawdzić statusu raportów"
      );
      setReportStatus(null);
    }
  }, [selectedDate, selectedPlace]);

  // Automatycznie pobierz raporty po zmianie daty lub miejsca
  useEffect(() => {
    if (user?.role === "admin") {
      fetchReports();
    }
  }, [user, fetchReports, selectedDate, selectedPlace]);

  // Automatycznie sprawdź status raportów po zmianie daty lub miejsca
  useEffect(() => {
    if (user?.role === "admin" && selectedPlace !== "all") {
      checkReportsStatus();
    } else {
      setReportStatus(null);
    }
  }, [user, checkReportsStatus, selectedDate, selectedPlace]);

  // Usuń raport
  const deleteReport = async () => {
    if (!reportToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reports?id=${reportToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Błąd podczas usuwania raportu");
      }

      // Usuń raport z listy
      setReports(reports.filter((report) => report.id !== reportToDelete));

      toast.success("Raport został pomyślnie usunięty");
      setShowDeleteDialog(false);
      setReportToDelete(null);
    } catch (error) {
      console.error("Błąd podczas usuwania raportu:", error);
      toast.error(
        error instanceof Error ? error.message : "Nie udało się usunąć raportu"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Obsługa przycisku usuwania
  const handleDeleteClick = (reportId: number) => {
    setReportToDelete(reportId);
    setShowDeleteDialog(true);
  };

  // Obsługa zmiany daty
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      // Nie wywołujemy fetchReports tutaj, ponieważ useEffect zajmie się tym za nas
    }
  };

  // Obsługa zmiany miejsca
  const handlePlaceChange = (value: string) => {
    setSelectedPlace(value);
    if (value === "all") {
      setReportStatus(null);
    }
    // Nie wywołujemy fetchReports tutaj, ponieważ useEffect zajmie się tym za nas
  };

  // Usuń wszystkie raporty dla wybranego miejsca i daty
  const deleteAllReports = async () => {
    if (selectedPlace === "all" || !selectedDate) return;

    setIsDeletingAll(true);
    try {
      const dateParam = selectedDate.toISOString().split("T")[0];
      const response = await fetch(
        `/api/reports/delete-by-date?placeId=${selectedPlace}&date=${dateParam}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Błąd podczas usuwania raportów");
      }

      const data = await response.json();

      // Usuń raporty z listy
      if (data.deletedIds && Array.isArray(data.deletedIds)) {
        setReports(
          reports.filter((report) => !data.deletedIds.includes(report.id))
        );
      } else {
        // Jeśli nie otrzymaliśmy listy usuniętych ID, odświeżamy całą listę
        fetchReports();
      }

      // Odśwież status raportów
      if (selectedPlace !== "all") {
        checkReportsStatus();
      }

      toast.success(data.message || "Raporty zostały pomyślnie usunięte");
      setShowDeleteAllDialog(false);
    } catch (error) {
      console.error("Błąd podczas usuwania raportów:", error);
      toast.error(
        error instanceof Error ? error.message : "Nie udało się usunąć raportów"
      );
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Obsługa przycisku usuwania wszystkich raportów
  const handleDeleteAllClick = () => {
    setShowDeleteAllDialog(true);
  };

  // Usuń raport początkowy dla wybranego miejsca i daty
  const deleteStartReport = async () => {
    if (selectedPlace === "all" || !selectedDate) return;

    setIsDeletingStart(true);
    try {
      const dateParam = selectedDate.toISOString().split("T")[0];
      const response = await fetch(
        `/api/reports/delete-by-date?placeId=${selectedPlace}&date=${dateParam}&reportType=start`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Błąd podczas usuwania raportu początkowego"
        );
      }

      const data = await response.json();

      // Usuń raporty z listy
      if (data.deletedIds && Array.isArray(data.deletedIds)) {
        setReports(
          reports.filter((report) => !data.deletedIds.includes(report.id))
        );
      } else {
        // Jeśli nie otrzymaliśmy listy usuniętych ID, odświeżamy całą listę
        fetchReports();
      }

      // Odśwież status raportów
      if (selectedPlace !== "all") {
        checkReportsStatus();
      }

      toast.success(
        data.message || "Raport początkowy został pomyślnie usunięty"
      );
      setShowDeleteStartDialog(false);
    } catch (error) {
      console.error("Błąd podczas usuwania raportu początkowego:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć raportu początkowego"
      );
    } finally {
      setIsDeletingStart(false);
    }
  };

  // Usuń raport końcowy dla wybranego miejsca i daty
  const deleteEndReport = async () => {
    if (selectedPlace === "all" || !selectedDate) return;

    setIsDeletingEnd(true);
    try {
      const dateParam = selectedDate.toISOString().split("T")[0];
      const response = await fetch(
        `/api/reports/delete-by-date?placeId=${selectedPlace}&date=${dateParam}&reportType=end`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Błąd podczas usuwania raportu końcowego"
        );
      }

      const data = await response.json();

      // Usuń raporty z listy
      if (data.deletedIds && Array.isArray(data.deletedIds)) {
        setReports(
          reports.filter((report) => !data.deletedIds.includes(report.id))
        );
      } else {
        // Jeśli nie otrzymaliśmy listy usuniętych ID, odświeżamy całą listę
        fetchReports();
      }

      // Odśwież status raportów
      if (selectedPlace !== "all") {
        checkReportsStatus();
      }

      toast.success(data.message || "Raport końcowy został pomyślnie usunięty");
      setShowDeleteEndDialog(false);
    } catch (error) {
      console.error("Błąd podczas usuwania raportu końcowego:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć raportu końcowego"
      );
    } finally {
      setIsDeletingEnd(false);
    }
  };

  // Obsługa przycisku usuwania raportu początkowego
  const handleDeleteStartClick = () => {
    setShowDeleteStartDialog(true);
  };

  // Obsługa przycisku usuwania raportu końcowego
  const handleDeleteEndClick = () => {
    setShowDeleteEndDialog(true);
  };

  // Sprawdź, czy użytkownik jest administratorem
  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Brak dostępu</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Nie masz uprawnień do wyświetlenia tej strony.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie Raportami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium mb-1">Data</label>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full bg-background"
              />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium mb-1">Miejsce</label>
              <Select value={selectedPlace} onValueChange={handlePlaceChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Wybierz miejsce" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">Wszystkie miejsca</SelectItem>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.id.toString()}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/3 flex items-end">
              <Button
                onClick={() => fetchReports()}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ładowanie...
                  </>
                ) : (
                  "Wyszukaj Raporty"
                )}
              </Button>
            </div>
          </div>

          {selectedPlace !== "all" && reportStatus && (
            <div className="mb-4 p-4 rounded-md border bg-muted">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium mb-2">
                  Status raportów dla wybranego miejsca i daty:
                </h3>
                <div className="flex gap-2">
                  {reportStatus.hasStartReport && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteStartClick}
                      disabled={isDeletingStart}
                    >
                      {isDeletingStart ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Usuwanie...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń raport początkowy
                        </>
                      )}
                    </Button>
                  )}
                  {reportStatus.hasEndReport && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteEndClick}
                      disabled={isDeletingEnd}
                    >
                      {isDeletingEnd ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Usuwanie...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń raport końcowy
                        </>
                      )}
                    </Button>
                  )}
                  {(reportStatus.hasStartReport ||
                    reportStatus.hasEndReport) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAllClick}
                      disabled={isDeletingAll}
                    >
                      {isDeletingAll ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Usuwanie...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń wszystkie
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  {reportStatus.hasStartReport ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  )}
                  <span>
                    Raport początkowy:{" "}
                    {reportStatus.hasStartReport ? "Istnieje" : "Brak"}
                  </span>
                </div>
                <div className="flex items-center">
                  {reportStatus.hasEndReport ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  )}
                  <span>
                    Raport końcowy:{" "}
                    {reportStatus.hasEndReport ? "Istnieje" : "Brak"}
                  </span>
                </div>
                <div className="flex items-center">
                  {reportStatus.hasAllReports ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  )}
                  <span>
                    Status:{" "}
                    {reportStatus.hasAllReports ? "Kompletny" : "Niekompletny"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {reports.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Miejsce</TableHead>
                    <TableHead>Typ Raportu</TableHead>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Data utworzenia</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.id}</TableCell>
                      <TableCell>
                        {new Date(report.report_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{report.place_name}</TableCell>
                      <TableCell>
                        {report.report_type === "start"
                          ? "Rozpoczęcie"
                          : report.report_type === "end"
                          ? "Zakończenie"
                          : report.report_type}
                      </TableCell>
                      <TableCell>{report.user_name}</TableCell>
                      <TableCell>
                        {new Date(report.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6">
              {isLoading ? (
                <p>Ładowanie raportów...</p>
              ) : (
                <p>
                  Brak raportów do wyświetlenia. Wybierz datę i miejsce, aby
                  wyszukać raporty.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog potwierdzenia usunięcia */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć ten raport? Ta operacja jest
              nieodwracalna.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={deleteReport}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                "Usuń"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia usunięcia wszystkich raportów */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie wszystkich raportów</DialogTitle>
            <DialogDescription>
              <div className="flex items-center mt-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                <span className="font-semibold">
                  Czy na pewno chcesz usunąć wszystkie raporty dla wybranego
                  miejsca i daty?
                </span>
              </div>
              <p>
                Ta operacja usunie zarówno raport początkowy, jak i końcowy
                (jeśli istnieją) dla wybranego miejsca i daty. Operacja jest
                nieodwracalna i może wpłynąć na dane historyczne.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllDialog(false)}
              disabled={isDeletingAll}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAllReports}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                "Usuń wszystkie raporty"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia usunięcia raportu początkowego */}
      <Dialog
        open={showDeleteStartDialog}
        onOpenChange={setShowDeleteStartDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie raportu początkowego</DialogTitle>
            <DialogDescription>
              <div className="flex items-center mt-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                <span className="font-semibold">
                  Czy na pewno chcesz usunąć raport początkowy dla wybranego
                  miejsca i daty?
                </span>
              </div>
              <p>
                Ta operacja jest nieodwracalna i może wpłynąć na dane
                historyczne.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteStartDialog(false)}
              disabled={isDeletingStart}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={deleteStartReport}
              disabled={isDeletingStart}
            >
              {isDeletingStart ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                "Usuń raport początkowy"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia usunięcia raportu końcowego */}
      <Dialog open={showDeleteEndDialog} onOpenChange={setShowDeleteEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie raportu końcowego</DialogTitle>
            <DialogDescription>
              <div className="flex items-center mt-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                <span className="font-semibold">
                  Czy na pewno chcesz usunąć raport końcowy dla wybranego
                  miejsca i daty?
                </span>
              </div>
              <p>
                Ta operacja jest nieodwracalna i może wpłynąć na dane
                historyczne.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteEndDialog(false)}
              disabled={isDeletingEnd}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={deleteEndReport}
              disabled={isDeletingEnd}
            >
              {isDeletingEnd ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                "Usuń raport końcowy"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
