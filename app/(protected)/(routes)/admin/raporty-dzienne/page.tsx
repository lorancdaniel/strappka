"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Place {
  id: number;
  name: string;
}

interface DailyReportSummary {
  id: number;
  place_id: number;
  place_name: string;
  report_date: string;
  has_start_report: boolean;
  has_end_report: boolean;
  start_report_id: number | null;
  end_report_id: number | null;
  start_user_name: string;
  end_user_name: string;
  start_work_hours: number;
  end_work_hours: number;
  initial_cash: number;
  deposited_cash: number;
  start_terminal_report: string;
  end_terminal_report: string;
  total_initial_quantity: number;
  total_remaining_quantity: number;
  total_waste_quantity: number;
  total_sold_quantity: number;
  total_gross_sales: number;
  total_calculated_sales: number;
  created_at: string;
  updated_at?: string;
}

const DailyReportsPage = () => {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<DailyReportSummary[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>("report_date");
  const [sortDirection, setSortDirection] = useState<string>("desc");
  const [newReportDate, setNewReportDate] = useState<Date | undefined>(
    undefined
  );
  const [newReportPlaceId, setNewReportPlaceId] = useState<string>("");

  // Pobierz listę miejsc
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch("/api/places");
        if (!response.ok) {
          throw new Error("Nie udało się pobrać listy miejsc");
        }
        const data = await response.json();
        console.log("[FRONTEND] Pobrane dane miejsc:", data);
        // Upewnij się, że places jest zawsze tablicą
        setPlaces(Array.isArray(data.places) ? data.places : []);
      } catch (error) {
        console.error("Błąd podczas pobierania miejsc:", error);
        toast.error("Nie udało się pobrać listy miejsc");
        // W przypadku błędu, ustaw pustą tablicę
        setPlaces([]);
      }
    };

    fetchPlaces();
  }, []);

  // Pobierz raporty dzienne
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        let url = `/api/admin/daily-reports?page=${page}&pageSize=${pageSize}&sortField=${sortField}&sortDirection=${sortDirection}`;

        if (selectedPlaceId && selectedPlaceId !== "all") {
          url += `&placeId=${selectedPlaceId}`;
        }

        if (startDate) {
          url += `&startDate=${format(startDate, "yyyy-MM-dd")}`;
        }

        if (endDate) {
          url += `&endDate=${format(endDate, "yyyy-MM-dd")}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Nie udało się pobrać raportów dziennych");
        }

        const data = await response.json();
        console.log("[FRONTEND] Pobrane dane raportów:", data);

        // Upewnij się, że reports jest zawsze tablicą
        setReports(Array.isArray(data.reports) ? data.reports : []);
        setTotalReports(typeof data.total === "number" ? data.total : 0);
        setTotalPages(
          typeof data.totalPages === "number" ? data.totalPages : 1
        );
      } catch (error) {
        console.error("Błąd podczas pobierania raportów:", error);
        toast.error("Nie udało się pobrać raportów dziennych");
        // W przypadku błędu, ustaw puste tablice
        setReports([]);
        setTotalReports(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [
    page,
    pageSize,
    sortField,
    sortDirection,
    selectedPlaceId,
    startDate,
    endDate,
  ]);

  // Generuj nowy raport dzienny
  const handleGenerateReport = async () => {
    if (!newReportDate || !newReportPlaceId) {
      toast.error("Wybierz datę i miejsce dla nowego raportu");
      return;
    }

    setGeneratingReport(true);
    try {
      const response = await fetch("/api/admin/daily-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeId: parseInt(newReportPlaceId),
          reportDate: format(newReportDate, "yyyy-MM-dd"),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się wygenerować raportu");
      }

      toast.success("Raport dzienny został pomyślnie wygenerowany");

      // Odśwież listę raportów
      setPage(1);
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedPlaceId("");

      // Zresetuj formularz
      setNewReportDate(undefined);
      setNewReportPlaceId("");
    } catch (error) {
      console.error("Błąd podczas generowania raportu:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować raportu"
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  // Przejdź do szczegółów raportu
  const handleViewReport = (id: number) => {
    router.push(`/admin/raporty-dzienne/${id}`);
  };

  // Obsługa sortowania
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Renderuj strzałkę sortowania
  const renderSortArrow = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Raporty dzienne</h1>

      {/* Formularz generowania nowego raportu */}
      <Card>
        <CardHeader>
          <CardTitle>Generuj nowy raport dzienny</CardTitle>
          <CardDescription>
            Wygeneruj raport dzienny na podstawie raportów początkowych i
            końcowych
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-report-date">Data raportu</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="new-report-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newReportDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newReportDate ? (
                      format(newReportDate, "dd MMMM yyyy", { locale: pl })
                    ) : (
                      <span>Wybierz datę</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newReportDate}
                    onSelect={setNewReportDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-report-place">Miejsce</Label>
              <Select
                value={newReportPlaceId}
                onValueChange={setNewReportPlaceId}
              >
                <SelectTrigger id="new-report-place">
                  <SelectValue placeholder="Wybierz miejsce" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(places) &&
                    places.map((place) => (
                      <SelectItem key={place.id} value={place.id.toString()}>
                        {place.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={
                  generatingReport || !newReportDate || !newReportPlaceId
                }
                className="w-full"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generowanie...
                  </>
                ) : (
                  "Generuj raport"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtry */}
      <Card>
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-place">Miejsce</Label>
              <Select
                value={selectedPlaceId}
                onValueChange={setSelectedPlaceId}
              >
                <SelectTrigger id="filter-place">
                  <SelectValue placeholder="Wszystkie miejsca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie miejsca</SelectItem>
                  {Array.isArray(places) &&
                    places.map((place) => (
                      <SelectItem key={place.id} value={place.id.toString()}>
                        {place.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-start-date">Data początkowa</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-start-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "dd MMMM yyyy", { locale: pl })
                    ) : (
                      <span>Wybierz datę początkową</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-end-date">Data końcowa</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-end-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "dd MMMM yyyy", { locale: pl })
                    ) : (
                      <span>Wybierz datę końcową</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setSelectedPlaceId("");
                  setPage(1);
                }}
                className="w-full"
              >
                Wyczyść filtry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela raportów */}
      <Card>
        <CardHeader>
          <CardTitle>Lista raportów dziennych</CardTitle>
          <CardDescription>Znaleziono {totalReports} raportów</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nie znaleziono raportów dziennych
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("report_date")}
                      >
                        Data{renderSortArrow("report_date")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("place_name")}
                      >
                        Miejsce{renderSortArrow("place_name")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("start_user_name")}
                      >
                        Pracownik początkowy{renderSortArrow("start_user_name")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("end_user_name")}
                      >
                        Pracownik końcowy{renderSortArrow("end_user_name")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("total_gross_sales")}
                      >
                        Sprzedaż{renderSortArrow("total_gross_sales")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("total_sold_quantity")}
                      >
                        Ilość sprzedana (kg)
                        {renderSortArrow("total_sold_quantity")}
                      </TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(reports) &&
                      reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            {format(new Date(report.report_date), "dd.MM.yyyy")}
                          </TableCell>
                          <TableCell>{report.place_name}</TableCell>
                          <TableCell>{report.start_user_name}</TableCell>
                          <TableCell>{report.end_user_name}</TableCell>
                          <TableCell className="text-right">
                            {report.total_gross_sales.toFixed(2)} zł
                          </TableCell>
                          <TableCell className="text-right">
                            {report.total_sold_quantity.toFixed(2)} kg
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReport(report.id)}
                            >
                              Szczegóły
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginacja */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="page-size">Pokaż</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger id="page-size" className="w-[70px]">
                      <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>na stronie</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Poprzednia
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={i}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Następna
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReportsPage;
