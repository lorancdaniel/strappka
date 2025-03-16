"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-hot-toast";
import { Loader2, ArrowLeft, RefreshCw, Trash2 } from "lucide-react";

interface DailyReportFruit {
  id: number;
  daily_report_id: number;
  fruit_id: number;
  fruit_name: string;
  initial_quantity: number;
  remaining_quantity: number;
  waste_quantity: number;
  sold_quantity: number;
  price_per_kg: number;
  start_price_per_kg: number;
  end_price_per_kg: number;
  gross_sales: number;
  calculated_sales: number;
}

interface DailyReport {
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
  fruits: DailyReportFruit[];
}

const DailyReportDetailsPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/daily-reports/${params.id}`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać szczegółów raportu");
      }
      const data = await response.json();
      console.log("[FRONTEND] Pobrane dane szczegółów raportu:", data);

      // Upewnij się, że report ma poprawną strukturę
      if (data.report && typeof data.report === "object") {
        // Upewnij się, że fruits jest zawsze tablicą
        if (!data.report.fruits || !Array.isArray(data.report.fruits)) {
          console.warn(
            "[FRONTEND] data.report.fruits nie jest tablicą - ustawiam pustą tablicę"
          );
          data.report.fruits = [];
        }
        setReport(data.report);
      } else {
        console.error(
          "[FRONTEND] Nieprawidłowa struktura danych raportu:",
          data
        );
        toast.error("Otrzymano nieprawidłowe dane raportu");
        setReport(null);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania szczegółów raportu:", error);
      toast.error("Nie udało się pobrać szczegółów raportu");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [params.id]);

  const handleRegenerateReport = async () => {
    setRegenerating(true);
    try {
      const response = await fetch(`/api/admin/daily-reports/${params.id}`, {
        method: "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się zregenerować raportu");
      }

      toast.success("Raport został pomyślnie zregenerowany");
      setReport(data.report);
    } catch (error) {
      console.error("Błąd podczas regeneracji raportu:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się zregenerować raportu"
      );
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteReport = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/daily-reports/${params.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się usunąć raportu");
      }

      toast.success("Raport został pomyślnie usunięty");
      router.push("/admin/raporty-dzienne");
    } catch (error) {
      console.error("Błąd podczas usuwania raportu:", error);
      toast.error(
        error instanceof Error ? error.message : "Nie udało się usunąć raportu"
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/raporty-dzienne")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do listy
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              Nie znaleziono raportu lub wystąpił błąd podczas ładowania danych
            </p>
            <Button onClick={fetchReport}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Oblicz różnicę między całkowitą sprzedażą a obliczoną sprzedażą
  const calculatedSales = Array.isArray(report.fruits)
    ? report.fruits.reduce(
        (sum, fruit) => sum + (fruit.calculated_sales || 0),
        0
      )
    : 0;
  const salesDifference = (report.total_gross_sales || 0) - calculatedSales;

  const formattedDate = format(new Date(report.report_date), "dd MMMM yyyy", {
    locale: pl,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/raporty-dzienne")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
          <h1 className="text-2xl font-bold">
            Raport dzienny: {report.place_name}, {formattedDate}
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateReport}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regeneruj raport
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń raport
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Potwierdź usunięcie</DialogTitle>
                <DialogDescription>
                  Czy na pewno chcesz usunąć ten raport dzienny? Ta operacja
                  jest nieodwracalna.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Anuluj
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteReport}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Usuń
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Informacje ogólne */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje ogólne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Miejsce
              </p>
              <p className="text-lg">{report.place_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Data raportu
              </p>
              <p className="text-lg">{formattedDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Godziny pracy (początkowy)
              </p>
              <p className="text-lg">{report.start_work_hours} h</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Godziny pracy (końcowy)
              </p>
              <p className="text-lg">{report.end_work_hours} h</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pracownik początkowy
              </p>
              <p className="text-lg">{report.start_user_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pracownik końcowy
              </p>
              <p className="text-lg">{report.end_user_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informacje finansowe */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje finansowe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Gotówka początkowa
              </p>
              <p className="text-lg">
                {(report.initial_cash || 0).toFixed(2)} zł
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Gotówka wpłacona
              </p>
              <p className="text-lg">
                {(report.deposited_cash || 0).toFixed(2)} zł
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Terminal początkowy
              </p>
              <p className="text-lg">
                {(report.start_terminal_report || "0").toString()} zł
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Terminal końcowy
              </p>
              <p className="text-lg">
                {(report.end_terminal_report || "0").toString()} zł
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Całkowita sprzedaż
              </p>
              <p className="text-lg font-bold">
                {(report.total_gross_sales || 0).toFixed(2)} zł
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Obliczona sprzedaż (z owoców)
              </p>
              <p className="text-lg">{calculatedSales.toFixed(2)} zł</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Różnica
              </p>
              <p
                className={`text-lg ${
                  Math.abs(salesDifference) > 0.01
                    ? "text-red-500"
                    : "text-green-500"
                }`}
              >
                {salesDifference.toFixed(2)} zł
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informacje o owocach */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje o owocach</CardTitle>
          <CardDescription>
            Łącznie sprzedano: {(report.total_sold_quantity || 0).toFixed(2)} kg
            | Łącznie odpadów: {(report.total_waste_quantity || 0).toFixed(2)}{" "}
            kg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa owocu</TableHead>
                  <TableHead className="text-right">
                    Ilość początkowa (kg)
                  </TableHead>
                  <TableHead className="text-right">
                    Ilość pozostała (kg)
                  </TableHead>
                  <TableHead className="text-right">
                    Ilość sprzedana (kg)
                  </TableHead>
                  <TableHead className="text-right">Odpady (kg)</TableHead>
                  <TableHead className="text-right">
                    Cena pocz. (zł/kg)
                  </TableHead>
                  <TableHead className="text-right">
                    Cena końc. (zł/kg)
                  </TableHead>
                  <TableHead className="text-right">
                    Średnia cena (zł/kg)
                  </TableHead>
                  <TableHead className="text-right">Sprzedaż (zł)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.fruits && Array.isArray(report.fruits) ? (
                  report.fruits.map((fruit) => (
                    <TableRow key={fruit.id}>
                      <TableCell className="font-medium">
                        {fruit.fruit_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.initial_quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.remaining_quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.sold_quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.waste_quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.start_price_per_kg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.end_price_per_kg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.price_per_kg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fruit.calculated_sales.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      Brak danych o owocach dla tego raportu
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReportDetailsPage;
