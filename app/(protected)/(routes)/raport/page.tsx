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

export default function RaportPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<DailyReportSummary[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>("report_date");
  const [sortDirection, setSortDirection] = useState<string>("desc");

  // Pobierz listę miejsc
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch("/api/places/user");
        if (!response.ok) {
          throw new Error("Nie udało się pobrać listy miejsc");
        }
        const data = await response.json();
        console.log("[FRONTEND] Pobrane dane miejsc:", data);
        // Upewnij się, że places jest zawsze tablicą
        setPlaces(Array.isArray(data) ? data : []);
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
        let url = `/api/daily-reports?page=${page}&pageSize=${pageSize}&sortField=${sortField}&sortDirection=${sortDirection}`;

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
        setTotalReports(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
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

  // Przejdź do szczegółów raportu
  const handleViewReport = (id: number) => {
    router.push(`/raport/${id}`);
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

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: pl });
    } catch (error) {
      return dateString;
    }
  };

  // Formatowanie kwoty
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Raporty dzienne</h1>

      {/* Filtry */}
      <Card>
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
          <CardDescription>
            Filtruj raporty dzienne według miejsca i daty
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Miejsce</label>
              <Select
                value={selectedPlaceId}
                onValueChange={setSelectedPlaceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie miejsca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie miejsca</SelectItem>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.id.toString()}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data od</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
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
                      <span>Wybierz datę</span>
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
              <label className="text-sm font-medium">Data do</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
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
                      <span>Wybierz datę</span>
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
          </div>

          <div className="flex justify-end mt-4 space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPlaceId("");
                setStartDate(undefined);
                setEndDate(undefined);
                setPage(1);
              }}
            >
              Wyczyść filtry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela raportów */}
      <Card>
        <CardHeader>
          <CardTitle>Lista raportów dziennych</CardTitle>
          <CardDescription>
            Przeglądaj raporty dzienne dla Twoich miejsc pracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nie znaleziono raportów dziennych
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("place_name")}
                      >
                        Miejsce {renderSortArrow("place_name")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("report_date")}
                      >
                        Data {renderSortArrow("report_date")}
                      </TableHead>
                      <TableHead>Raport początkowy</TableHead>
                      <TableHead>Raport końcowy</TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("total_gross_sales")}
                      >
                        Sprzedaż {renderSortArrow("total_gross_sales")}
                      </TableHead>
                      <TableHead>Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.place_name}</TableCell>
                        <TableCell>{formatDate(report.report_date)}</TableCell>
                        <TableCell>
                          {report.has_start_report ? (
                            <span className="text-green-600">Tak</span>
                          ) : (
                            <span className="text-red-600">Nie</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.has_end_report ? (
                            <span className="text-green-600">Tak</span>
                          ) : (
                            <span className="text-red-600">Nie</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatAmount(report.total_gross_sales)}
                        </TableCell>
                        <TableCell>
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
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Pokazuje {reports.length} z {totalReports} raportów
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Poprzednia
                  </Button>
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
}
