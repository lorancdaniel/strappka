"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
import {
  Eye,
  Trash2,
  Search,
  Loader2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

interface Place {
  id: number;
  name: string;
}

interface PlaceData {
  id?: number;
  name?: string;
  [key: string]: unknown;
}

interface Report {
  id: number;
  place_id: number;
  place_name: string;
  report_date: string;
  report_type: "start" | "end";
  terminal_shipment_report: string;
  cash_for_change: number | null;
  work_hours: number;
  deposited_cash: number | null;
  initial_cash: number | null;
  created_at: string;
  user_name: string;
}

interface ReportFruit {
  id: number;
  report_id: number;
  fruit_id: number;
  fruit_name: string;
  initial_quantity: number | string;
  remaining_quantity: number | string | null;
  waste_quantity: number | string | null;
  price_per_kg: number | string;
  gross_sales: number | string | null;
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AllReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<string>("all");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDetails, setReportDetails] = useState<ReportFruit[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sprawdź, czy użytkownik jest administratorem
  useEffect(() => {
    if (!user) return;

    if (user.role !== "admin") {
      router.push("/");
    }
  }, [user, router]);

  // Pobierz listę miejsc
  const fetchPlaces = async () => {
    try {
      const response = await fetch("/api/places");
      if (!response.ok) {
        throw new Error("Błąd podczas pobierania miejsc");
      }
      const data = await response.json();
      setPlaces(data.data || []);
    } catch (error) {
      console.error("Błąd:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy miejsc",
        variant: "destructive",
      });
    }
  };

  // Pobierz listę raportów
  const fetchReports = async (page = 1) => {
    try {
      setLoading(true);
      let url = `/api/admin/reports?page=${page}&pageSize=${pagination.pageSize}&sortField=${sortField}&sortDirection=${sortDirection}`;

      if (selectedPlace !== "all") {
        url += `&placeId=${selectedPlace}`;
      }

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Błąd podczas pobierania raportów");
      }

      const data = await response.json();
      setReports(data.data || []);
      setPagination({
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
        pageSize: data.pagination?.pageSize || 10,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (error) {
      console.error("Błąd:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy raportów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Pobierz szczegóły raportu
  const fetchReportDetails = async (reportId: number) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`);
      if (!response.ok) {
        throw new Error("Błąd podczas pobierania szczegółów raportu");
      }

      const data = await response.json();
      setReportDetails(data.data || []);
    } catch (error) {
      console.error("Błąd:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać szczegółów raportu",
        variant: "destructive",
      });
    }
  };

  // Inicjalizacja
  useEffect(() => {
    if (user && user.role === "admin") {
      fetchPlaces();
      fetchReports();
    }
  }, [user]);

  // Obsługa zmiany strony, sortowania, filtrowania
  useEffect(() => {
    if (user && user.role === "admin") {
      fetchReports(pagination.page);
    }
  }, [
    pagination.page,
    selectedPlace,
    sortField,
    sortDirection,
    searchTerm,
    user,
  ]);

  // Obsługa podglądu raportu
  const handleViewReport = async (report: Report) => {
    setSelectedReport(report);
    await fetchReportDetails(report.id);
    setShowDetailsDialog(true);
  };

  // Obsługa usuwania raportu
  const handleDeleteReport = async () => {
    if (!selectedReport) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Błąd podczas usuwania raportu");
      }

      toast({
        title: "Sukces",
        description: "Raport został pomyślnie usunięty",
      });

      setShowDeleteDialog(false);
      fetchReports(pagination.page);
    } catch (error) {
      console.error("Błąd:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć raportu",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy", { locale: pl });
  };

  // Formatowanie typu raportu
  const formatReportType = (type: string) => {
    return type === "start" ? "Początkowy" : "Końcowy";
  };

  // Formatowanie kwoty
  const formatAmount = (amount: number | string | null) => {
    if (amount === null) return "-";
    return typeof amount === "string"
      ? parseFloat(amount).toFixed(2)
      : amount.toFixed(2);
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

  // Renderowanie ikony sortowania
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  // Jeśli użytkownik nie jest zalogowany lub nie jest administratorem, pokaż ekran ładowania
  if (!user || user.role !== "admin") {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wszystkie raporty</CardTitle>
          <CardDescription>
            Przeglądaj i zarządzaj wszystkimi raportami w systemie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select
                value={selectedPlace}
                onValueChange={(value) => setSelectedPlace(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz miejsce" />
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
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak raportów spełniających kryteria wyszukiwania
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("id")}
                      >
                        <div className="flex items-center">
                          ID {renderSortIcon("id")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("place_name")}
                      >
                        <div className="flex items-center">
                          Miejsce {renderSortIcon("place_name")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("report_date")}
                      >
                        <div className="flex items-center">
                          Data {renderSortIcon("report_date")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("report_type")}
                      >
                        <div className="flex items-center">
                          Typ {renderSortIcon("report_type")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("user_name")}
                      >
                        <div className="flex items-center">
                          Pracownik {renderSortIcon("user_name")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("created_at")}
                      >
                        <div className="flex items-center">
                          Data utworzenia {renderSortIcon("created_at")}
                        </div>
                      </TableHead>
                      <TableHead>Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.id}</TableCell>
                        <TableCell>{report.place_name}</TableCell>
                        <TableCell>{formatDate(report.report_date)}</TableCell>
                        <TableCell>
                          {formatReportType(report.report_type)}
                        </TableCell>
                        <TableCell>{report.user_name}</TableCell>
                        <TableCell>{formatDate(report.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReport(report)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Podgląd
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Usuń
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginacja */}
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setPagination({
                            ...pagination,
                            page: Math.max(1, pagination.page - 1),
                          })
                        }
                        disabled={pagination.page === 1}
                      />
                    </PaginationItem>
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    ).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setPagination({ ...pagination, page })}
                          isActive={pagination.page === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setPagination({
                            ...pagination,
                            page: Math.min(
                              pagination.totalPages,
                              pagination.page + 1
                            ),
                          })
                        }
                        disabled={pagination.page === pagination.totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog ze szczegółami raportu */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Szczegóły raportu #{selectedReport?.id} -{" "}
              {selectedReport?.place_name}
            </DialogTitle>
            <DialogDescription>
              {selectedReport &&
                `${formatReportType(selectedReport.report_type)} | ${formatDate(
                  selectedReport.report_date
                )}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Informacje ogólne</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Miejsce:</span>{" "}
                  {selectedReport?.place_name}
                </p>
                <p>
                  <span className="text-muted-foreground">Data raportu:</span>{" "}
                  {selectedReport && formatDate(selectedReport.report_date)}
                </p>
                <p>
                  <span className="text-muted-foreground">Typ raportu:</span>{" "}
                  {selectedReport &&
                    formatReportType(selectedReport.report_type)}
                </p>
                <p>
                  <span className="text-muted-foreground">Pracownik:</span>{" "}
                  {selectedReport?.user_name}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Data utworzenia:
                  </span>{" "}
                  {selectedReport && formatDate(selectedReport.created_at)}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Dane finansowe</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">
                    Raport z terminala:
                  </span>{" "}
                  {selectedReport?.terminal_shipment_report || "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">Godziny pracy:</span>{" "}
                  {selectedReport?.work_hours || "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Gotówka początkowa:
                  </span>{" "}
                  {selectedReport?.initial_cash !== null
                    ? `${formatAmount(selectedReport.initial_cash)} zł`
                    : "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Gotówka na resztę:
                  </span>{" "}
                  {selectedReport?.cash_for_change !== null
                    ? `${formatAmount(selectedReport.cash_for_change)} zł`
                    : "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Gotówka zdeponowana:
                  </span>{" "}
                  {selectedReport?.deposited_cash !== null
                    ? `${formatAmount(selectedReport.deposited_cash)} zł`
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Owoce</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa</TableHead>
                  <TableHead className="text-right">Ilość początkowa</TableHead>
                  <TableHead className="text-right">Ilość pozostała</TableHead>
                  <TableHead className="text-right">Odpady</TableHead>
                  <TableHead className="text-right">Cena (zł/kg)</TableHead>
                  <TableHead className="text-right">Sprzedaż (zł)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Brak danych o owocach
                    </TableCell>
                  </TableRow>
                ) : (
                  reportDetails.map((fruit) => (
                    <TableRow key={fruit.id}>
                      <TableCell>{fruit.fruit_name}</TableCell>
                      <TableCell className="text-right">
                        {formatAmount(fruit.initial_quantity)} kg
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.remaining_quantity !== null
                          ? `${formatAmount(fruit.remaining_quantity)} kg`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.waste_quantity !== null
                          ? `${formatAmount(fruit.waste_quantity)} kg`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(fruit.price_per_kg)} zł
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.gross_sales !== null
                          ? `${formatAmount(fruit.gross_sales)} zł`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia usunięcia */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć raport #{selectedReport?.id} -{" "}
              {selectedReport?.place_name} (
              {selectedReport && formatReportType(selectedReport.report_type)})?
              Ta operacja jest nieodwracalna.
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
              onClick={handleDeleteReport}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                "Usuń"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
