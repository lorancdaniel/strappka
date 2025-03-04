"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Report {
  place_id: number;
  report_date: string;
  report_type: "start" | "end";
  terminal_shipment_report: string;
  cash_for_change?: number;
  work_hours: number;
  deposited_cash?: number;
  initial_cash?: number;
}

interface ReportFruit {
  fruit_type: string;
  initial_quantity: number;
  price_per_kg: number;
  remaining_quantity?: number;
  waste_quantity?: number;
  gross_sales?: number;
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

const FRUIT_TYPES = [
  "truskawka",
  "czeresnia",
  "borowka",
  "malina",
  "jagoda",
  "wisnia",
  "agrest",
  "jajka",
];

export default function DodajRaportForm() {
  const { placeId } = useParams();
  const router = useRouter();
  const [reportType, setReportType] = useState<"start" | "end">("start");
  const [hasStartReport, setHasStartReport] = useState(false);
  const [hasEndReport, setHasEndReport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFruitsSection, setShowFruitsSection] = useState(false);
  const [reportData, setReportData] = useState<Report>({
    place_id: Number(placeId),
    report_date: new Date().toISOString().split("T")[0],
    report_type: "start",
    terminal_shipment_report: "",
    work_hours: 0,
    initial_cash: 0,
    cash_for_change: 0,
    deposited_cash: 0,
  });
  const [fruits, setFruits] = useState<ReportFruit[]>([]);
  const [errors, setErrors] = useState<{
    terminal_shipment_report?: string;
    work_hours?: string;
    initial_cash?: string;
    cash_for_change?: string;
    deposited_cash?: string;
    fruits?: string;
  }>({});

  // Sprawdź raporty w bazie danych
  useEffect(() => {
    const checkReports = async () => {
      try {
        console.log("[FRONTEND] Sprawdzanie raportów:", {
          placeId: Number(placeId),
          date: reportData.report_date,
        });

        const response = await fetch(
          `/api/reports/check-reports?placeId=${placeId}&date=${reportData.report_date}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Błąd podczas sprawdzania raportów");
        }

        const data = (await response.json()) as CheckReportsResponse;
        console.log("[FRONTEND] Odpowiedź z API:", data);

        setHasStartReport(data.hasStartReport);
        setHasEndReport(data.hasEndReport);

        // Ustaw odpowiedni typ raportu
        if (!data.hasStartReport) {
          setReportType("start");
          setReportData((prev) => ({ ...prev, report_type: "start" }));
        } else if (!data.hasEndReport) {
          setReportType("end");
          setReportData((prev) => ({ ...prev, report_type: "end" }));
        }

        // Jeśli oba raporty istnieją, przekieruj na pulpit główny
        if (data.hasStartReport && data.hasEndReport) {
          router.push("/");
        }
      } catch (error) {
        console.error("Błąd:", error);
        setHasStartReport(false);
        setHasEndReport(false);
      }
    };

    checkReports();
  }, [placeId, reportData.report_date, router]);

  // Aktualizuj datę przy zmianie typu raportu
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setReportData((prev) => ({
      ...prev,
      report_date: today,
      report_type: reportType,
    }));
  }, [reportType]);

  const handleReportDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReportData((prev) => ({
      ...prev,
      [name]:
        name.includes("cash") || name === "work_hours"
          ? parseFloat(value)
          : value,
    }));
  };

  const handleAddFruit = () => {
    setFruits((prev) => [
      ...prev,
      {
        fruit_type: "",
        initial_quantity: 0,
        price_per_kg: 0,
        remaining_quantity: 0,
        waste_quantity: 0,
        gross_sales: 0,
      },
    ]);

    // Pokaż sekcję owoców po dodaniu
    setShowFruitsSection(true);
  };

  const handleFruitChange = (
    index: number,
    field: keyof ReportFruit,
    value: string
  ) => {
    setFruits((prev) => {
      const newFruits = [...prev];
      const numericValue =
        field === "fruit_type" ? value : parseFloat(value) || 0;

      // Aktualizacja wartości pola
      newFruits[index] = {
        ...newFruits[index],
        [field]: numericValue,
      };

      // Walidacja ilości tylko dla raportu końcowego
      if (
        reportType === "end" &&
        (field === "remaining_quantity" ||
          field === "waste_quantity" ||
          field === "initial_quantity")
      ) {
        const fruit = newFruits[index];
        const remaining = fruit.remaining_quantity || 0;
        const waste = fruit.waste_quantity || 0;
        const initial = fruit.initial_quantity || 0;

        if (remaining + waste > initial) {
          alert(
            "Suma ilości pozostałej i odpadów nie może przekraczać ilości początkowej!"
          );
          // Przywróć poprzednią wartość
          newFruits[index] = prev[index];
          return prev;
        }
      }

      return newFruits;
    });
  };

  const handleRemoveFruit = (index: number) => {
    setFruits((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: {
      terminal_shipment_report?: string;
      work_hours?: string;
      initial_cash?: string;
      cash_for_change?: string;
      deposited_cash?: string;
      fruits?: string;
    } = {};

    // Walidacja podstawowych pól
    if (!reportData.terminal_shipment_report.trim()) {
      newErrors.terminal_shipment_report = "Raport z terminala jest wymagany";
    }

    if (reportData.work_hours <= 0 || reportData.work_hours > 24) {
      newErrors.work_hours = "Godziny pracy muszą być między 0 a 24";
    }

    if (
      reportType === "start" &&
      (reportData.initial_cash === undefined || reportData.initial_cash < 0)
    ) {
      newErrors.initial_cash =
        "Gotówka początkowa musi być większa lub równa 0";
    }

    if (reportType === "end") {
      if (
        reportData.cash_for_change === undefined ||
        reportData.cash_for_change < 0
      ) {
        newErrors.cash_for_change =
          "Gotówka na resztę musi być większa lub równa 0";
      }

      if (
        reportData.deposited_cash === undefined ||
        reportData.deposited_cash < 0
      ) {
        newErrors.deposited_cash =
          "Zdeponowana gotówka musi być większa lub równa 0";
      }
    }

    // Walidacja owoców
    if (fruits.length === 0) {
      newErrors.fruits = "Dodaj przynajmniej jeden owoc";
    } else {
      for (const fruit of fruits) {
        if (!fruit.fruit_type) {
          newErrors.fruits = "Wszystkie owoce muszą mieć wybrany typ";
          break;
        }

        if (fruit.initial_quantity <= 0) {
          newErrors.fruits = "Ilość początkowa musi być większa od 0";
          break;
        }

        if (fruit.price_per_kg <= 0) {
          newErrors.fruits = "Cena za kg musi być większa od 0";
          break;
        }

        if (reportType === "end") {
          const remaining = fruit.remaining_quantity || 0;
          const waste = fruit.waste_quantity || 0;
          const initial = fruit.initial_quantity || 0;

          if (remaining + waste > initial) {
            newErrors.fruits =
              "Suma ilości pozostałej i odpadów nie może przekraczać ilości początkowej";
            break;
          }

          if (fruit.gross_sales === undefined || fruit.gross_sales < 0) {
            newErrors.fruits = "Sprzedaż brutto musi być większa lub równa 0";
            break;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja formularza
    if (!validateForm()) {
      toast.error("Formularz zawiera błędy. Sprawdź wszystkie pola.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Sprawdź ponownie raporty przed wysłaniem
      const checkResponse = await fetch(
        `/api/reports/check-reports?placeId=${placeId}&date=${reportData.report_date}`,
        {
          credentials: "include",
        }
      );

      if (!checkResponse.ok) {
        throw new Error("Błąd podczas sprawdzania raportów");
      }

      const checkData = (await checkResponse.json()) as CheckReportsResponse;

      // Walidacja typu raportu
      if (reportType === "end" && !checkData.hasStartReport) {
        throw new Error(
          "Nie można dodać raportu końcowego bez raportu początkowego"
        );
      }
      if (reportType === "start" && checkData.hasStartReport) {
        throw new Error("Raport początkowy już istnieje");
      }
      if (reportType === "end" && checkData.hasEndReport) {
        throw new Error("Raport końcowy już istnieje");
      }

      const submitResponse = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report: reportData,
          fruits: fruits,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || "Błąd podczas zapisywania raportu");
      }

      toast.success("Raport został pomyślnie zapisany");

      // Przekierowanie po sukcesie
      router.push("/");
    } catch (error) {
      console.error("Błąd:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas zapisywania raportu"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-4 px-4 sm:py-6 sm:px-0">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => router.push("/dodaj-raport")}
        >
          <ArrowLeft className="h-4 w-4" /> Powrót
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Dodaj Raport
              <Badge
                variant={reportType === "start" ? "default" : "secondary"}
                className="ml-2"
              >
                {reportType === "start" ? "Początkowy" : "Końcowy"}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          {hasStartReport && hasEndReport ? (
            <div className="p-4 text-center">
              <p className="text-muted-foreground">
                Oba raporty na dzisiaj zostały już dodane.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/")}
              >
                Wróć na pulpit
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sekcja przełączania między podstawowymi danymi a owocami */}
              <div className="flex border-b mb-4">
                <button
                  type="button"
                  className={`py-2 px-4 font-medium text-sm ${
                    !showFruitsSection
                      ? "border-b-2 border-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setShowFruitsSection(false)}
                >
                  Podstawowe dane
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 font-medium text-sm flex items-center gap-1 ${
                    showFruitsSection
                      ? "border-b-2 border-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setShowFruitsSection(true)}
                >
                  Owoce
                  {fruits.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {fruits.length}
                    </Badge>
                  )}
                </button>
              </div>

              {/* Sekcja podstawowych danych */}
              {!showFruitsSection && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Typ Raportu</Label>
                    <div className="p-3 rounded-md bg-muted">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            reportType === "start" ? "default" : "secondary"
                          }
                        >
                          {reportType === "start" ? "Początkowy" : "Końcowy"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {hasStartReport
                            ? "Raport początkowy już istnieje - możesz dodać tylko raport końcowy"
                            : "Najpierw musisz dodać raport początkowy"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Data Raportu</Label>
                    <Input
                      type="date"
                      name="report_date"
                      value={reportData.report_date}
                      readOnly
                      required
                      className="bg-muted/50"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      Raport z Terminala
                    </Label>
                    <Input
                      type="text"
                      name="terminal_shipment_report"
                      value={reportData.terminal_shipment_report}
                      onChange={handleReportDataChange}
                      required
                      className={
                        errors.terminal_shipment_report
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {errors.terminal_shipment_report && (
                      <p className="text-destructive text-xs mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.terminal_shipment_report}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Godziny Pracy</Label>
                    <Input
                      type="number"
                      name="work_hours"
                      value={reportData.work_hours}
                      onChange={handleReportDataChange}
                      min="0"
                      max="24"
                      step="0.5"
                      className={errors.work_hours ? "border-destructive" : ""}
                    />
                    {errors.work_hours && (
                      <p className="text-destructive text-xs mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.work_hours}
                      </p>
                    )}
                  </div>

                  {reportType === "start" && (
                    <div>
                      <Label className="text-sm font-medium">
                        Gotówka Początkowa
                      </Label>
                      <Input
                        type="number"
                        name="initial_cash"
                        value={reportData.initial_cash || 0}
                        onChange={handleReportDataChange}
                        min="0"
                        step="0.01"
                        className={
                          errors.initial_cash ? "border-destructive" : ""
                        }
                      />
                      {errors.initial_cash && (
                        <p className="text-destructive text-xs mt-1 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errors.initial_cash}
                        </p>
                      )}
                    </div>
                  )}

                  {reportType === "end" && (
                    <>
                      <div>
                        <Label className="text-sm font-medium">
                          Gotówka na Resztę
                        </Label>
                        <Input
                          type="number"
                          name="cash_for_change"
                          value={reportData.cash_for_change || 0}
                          onChange={handleReportDataChange}
                          min="0"
                          step="0.01"
                          className={
                            errors.cash_for_change ? "border-destructive" : ""
                          }
                        />
                        {errors.cash_for_change && (
                          <p className="text-destructive text-xs mt-1 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {errors.cash_for_change}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          Zdeponowana Gotówka
                        </Label>
                        <Input
                          type="number"
                          name="deposited_cash"
                          value={reportData.deposited_cash || 0}
                          onChange={handleReportDataChange}
                          min="0"
                          step="0.01"
                          className={
                            errors.deposited_cash ? "border-destructive" : ""
                          }
                        />
                        {errors.deposited_cash && (
                          <p className="text-destructive text-xs mt-1 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {errors.deposited_cash}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sekcja owoców */}
              {showFruitsSection && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-medium">Lista owoców</h3>
                    <Button
                      type="button"
                      onClick={handleAddFruit}
                      size="sm"
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" /> Dodaj
                    </Button>
                  </div>

                  {errors.fruits && (
                    <div className="bg-destructive/10 p-3 rounded-md text-destructive text-sm flex items-start">
                      <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{errors.fruits}</span>
                    </div>
                  )}

                  {fruits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Brak dodanych owoców</p>
                      <Button
                        type="button"
                        onClick={handleAddFruit}
                        variant="outline"
                        className="mt-2"
                      >
                        Dodaj pierwszy owoc
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fruits.map((fruit, index) => (
                        <Card
                          key={index}
                          className="relative overflow-hidden border"
                        >
                          <div className="absolute top-2 right-2">
                            <Button
                              type="button"
                              onClick={() => handleRemoveFruit(index)}
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <CardContent className="p-3 pt-6">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <Label className="text-xs">Typ Owocu</Label>
                                <Select
                                  value={fruit.fruit_type}
                                  onValueChange={(value) =>
                                    handleFruitChange(
                                      index,
                                      "fruit_type",
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Wybierz owoc" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background">
                                    {FRUIT_TYPES.map((type) => (
                                      <SelectItem key={type} value={type}>
                                        {type}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs">
                                  Ilość Początkowa (kg)
                                </Label>
                                <Input
                                  type="number"
                                  value={fruit.initial_quantity || 0}
                                  onChange={(e) =>
                                    handleFruitChange(
                                      index,
                                      "initial_quantity",
                                      e.target.value
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Cena za kg</Label>
                                <Input
                                  type="number"
                                  value={fruit.price_per_kg || 0}
                                  onChange={(e) =>
                                    handleFruitChange(
                                      index,
                                      "price_per_kg",
                                      e.target.value
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">
                                  Pozostała Ilość (kg)
                                </Label>
                                <Input
                                  type="number"
                                  value={fruit.remaining_quantity || 0}
                                  onChange={(e) =>
                                    handleFruitChange(
                                      index,
                                      "remaining_quantity",
                                      e.target.value
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">
                                  Ilość Odpadów (kg)
                                </Label>
                                <Input
                                  type="number"
                                  value={fruit.waste_quantity || 0}
                                  onChange={(e) =>
                                    handleFruitChange(
                                      index,
                                      "waste_quantity",
                                      e.target.value
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                />
                              </div>

                              <div className="col-span-2">
                                <Label className="text-xs">
                                  Sprzedaż Brutto
                                </Label>
                                <Input
                                  type="number"
                                  value={fruit.gross_sales || 0}
                                  onChange={(e) =>
                                    handleFruitChange(
                                      index,
                                      "gross_sales",
                                      e.target.value
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-6 text-base gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Zapisz Raport
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
