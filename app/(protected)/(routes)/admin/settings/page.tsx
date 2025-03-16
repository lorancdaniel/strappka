"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Settings,
  Database,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Dodajemy interfejsy dla typów danych
interface MigrationLog {
  id: number;
  user_id: number;
  action: string;
  details: string;
  created_at: string;
  user_name: string;
}

interface MigrationStatusData {
  success: boolean;
  message: string;
  functionInfo?: {
    result_type: string;
    arguments: string;
    description: string;
    function_name: string;
  };
  recentMigrations: MigrationLog[];
  migrationStatus?: {
    version: string;
    hasStartTerminalReportValue: boolean;
    hasEndTerminalReportValue: boolean;
    hasNoNetSales: boolean;
  };
  error?: string;
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [selectedMigration, setSelectedMigration] = useState<string>("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatusData | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Lista dostępnych migracji
  const availableMigrations = [
    {
      file: "fix_get_daily_report_v14.sql",
      description:
        "Całkowicie przeprojektowano funkcję get_daily_report, aby wiernie odzwierciedlała dane z raportów początkowych i końcowych",
    },
    {
      file: "fix_get_daily_report_v13.sql",
      description:
        "Naprawia funkcję get_daily_report: dodaje osobne pola dla raportów z terminala, usuwa odwołania do nieistniejącego pola cena zakupu, poprawia pobieranie ceny sprzedaży i obliczanie przychodu",
    },
    {
      file: "fix_get_daily_report_v12.sql",
      description:
        "Naprawia funkcję get_daily_report: usuwa pole cena zakupu, zmienia sposób obliczania przychodu i poprawia wyciąganie danych z terminala",
    },
    {
      file: "fix_get_daily_report_v11.sql",
      description:
        "Naprawia funkcję get_daily_report, aby nie używała nieistniejącej kolumny terminal_report_value z tabeli reports",
    },
    {
      file: "fix_get_daily_report_v10.sql",
      description:
        "Naprawia funkcję get_daily_report, aby poprawnie obsługiwała typ danych NUMERIC dla kolumny terminal_report_value, co rozwiązuje błąd podczas regeneracji raportu dziennego",
    },
    {
      file: "fix_get_daily_report_v5.sql",
      description:
        "Poprawia funkcję get_daily_report, aby prawidłowo sumowała godziny pracy i poprawnie obliczała sprzedaż i zyski",
    },
    {
      file: "fix_get_daily_report_v4.sql",
      description:
        "Poprawia funkcję get_daily_report, aby prawidłowo sumowała godziny pracy i inne dane",
    },
    {
      file: "fix_get_daily_report_v3.sql",
      description:
        "Poprawia funkcję get_daily_report, aby prawidłowo sumowała dane",
    },
    {
      file: "fix_daily_report_null_summary.sql",
      description:
        "Naprawia problem z nullowymi wartościami w podsumowaniu raportów dziennych",
    },
  ];

  // Sprawdź, czy użytkownik jest administratorem
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Brak dostępu</AlertTitle>
          <AlertDescription>
            Nie masz uprawnień do wyświetlenia tej strony. Ta strona jest
            dostępna tylko dla administratorów.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const runMigration = async () => {
    if (!selectedMigration) {
      toast.error("Wybierz migrację do wykonania");
      return;
    }

    setIsMigrating(true);
    try {
      const response = await fetch("/api/admin/run-migration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          migrationFile: selectedMigration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Wystąpił błąd podczas wykonywania migracji"
        );
      }

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Migracja została wykonana pomyślnie");
        // Po wykonaniu migracji sprawdź jej status
        await checkMigrationStatus();
      } else {
        toast.error(data.error || "Nie udało się wykonać migracji");
      }
    } catch (error) {
      console.error("Błąd:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas wykonywania migracji"
      );
    } finally {
      setIsMigrating(false);
      setShowMigrationDialog(false);
    }
  };

  const checkMigrationStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch("/api/admin/check-migration", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Wystąpił błąd podczas sprawdzania statusu migracji"
        );
      }

      const data = await response.json();
      setMigrationStatus(data);

      if (data.success) {
        toast.success("Pomyślnie sprawdzono status migracji");
      } else {
        toast.error(data.message || "Nie udało się sprawdzić statusu migracji");
      }
    } catch (error) {
      console.error("Błąd:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas sprawdzania statusu migracji"
      );
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Ustawienia administratora</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie bazą danych</CardTitle>
          <CardDescription>
            Narzędzia do zarządzania bazą danych aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-medium">Migracje bazy danych</h3>
            <p className="text-sm text-muted-foreground">
              Wykonaj migrację bazy danych, aby zastosować najnowsze zmiany w
              strukturze bazy danych. Aktualnie dostępne migracje:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 mb-2">
              {availableMigrations.map((migration) => (
                <li key={migration.file}>
                  <span className="font-medium">{migration.file}</span> -{" "}
                  {migration.description}
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <label htmlFor="migration-select" className="text-sm font-medium">
                Wybierz migrację:
              </label>
              <Select
                value={selectedMigration}
                onValueChange={setSelectedMigration}
              >
                <SelectTrigger id="migration-select">
                  <SelectValue placeholder="Wybierz migrację" />
                </SelectTrigger>
                <SelectContent>
                  {availableMigrations.map((migration) => (
                    <SelectItem key={migration.file} value={migration.file}>
                      {migration.file}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Button
                onClick={() => setShowMigrationDialog(true)}
                className="flex items-center space-x-2"
                disabled={!selectedMigration}
              >
                <Database className="h-4 w-4" />
                <span>Wykonaj migrację</span>
              </Button>
              <Button
                onClick={checkMigrationStatus}
                variant="outline"
                className="flex items-center space-x-2"
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sprawdzanie...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Sprawdź status migracji</span>
                  </>
                )}
              </Button>
            </div>

            {migrationStatus && (
              <div className="mt-4 border rounded-md p-4">
                <h4 className="text-md font-medium flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Status migracji funkcji get_daily_report
                </h4>

                {migrationStatus.success && migrationStatus.migrationStatus ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Wersja funkcji:</span>
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md">
                        {migrationStatus.migrationStatus.version}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center">
                        <span
                          className={
                            migrationStatus.migrationStatus
                              .hasStartTerminalReportValue
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {migrationStatus.migrationStatus
                            .hasStartTerminalReportValue
                            ? "✓"
                            : "✗"}
                        </span>
                        <span className="ml-2">
                          Pole start_terminal_report_value
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={
                            migrationStatus.migrationStatus
                              .hasEndTerminalReportValue
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {migrationStatus.migrationStatus
                            .hasEndTerminalReportValue
                            ? "✓"
                            : "✗"}
                        </span>
                        <span className="ml-2">
                          Pole end_terminal_report_value
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={
                            migrationStatus.migrationStatus.hasNoNetSales
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {migrationStatus.migrationStatus.hasNoNetSales
                            ? "✓"
                            : "✗"}
                        </span>
                        <span className="ml-2">Brak pola net_sales (V14)</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h5 className="text-sm font-medium">
                        Ostatnie migracje:
                      </h5>
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-2 py-1 text-left">Data</th>
                              <th className="px-2 py-1 text-left">
                                Użytkownik
                              </th>
                              <th className="px-2 py-1 text-left">Szczegóły</th>
                            </tr>
                          </thead>
                          <tbody>
                            {migrationStatus.recentMigrations.map(
                              (log: MigrationLog) => (
                                <tr key={log.id} className="border-b">
                                  <td className="px-2 py-1">
                                    {new Date(log.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-2 py-1">{log.user_name}</td>
                                  <td className="px-2 py-1">{log.details}</td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Błąd</AlertTitle>
                    <AlertDescription>
                      {migrationStatus.message ||
                        "Nie udało się sprawdzić statusu migracji"}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wykonaj migrację</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz wykonać migrację{" "}
              <span className="font-medium">{selectedMigration}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Uwaga</AlertTitle>
              <AlertDescription>
                {selectedMigration === "fix_get_daily_report_v14.sql" ? (
                  <>
                    Migracja{" "}
                    <span className="font-medium">
                      fix_get_daily_report_v14.sql
                    </span>{" "}
                    całkowicie przeprojektowuje funkcję get_daily_report, aby
                    wiernie odzwierciedlała dane z raportów początkowych i
                    końcowych. Usuwa sztuczne wyliczenia i bazuje wyłącznie na
                    rzeczywistych danych z raportów.
                  </>
                ) : selectedMigration === "fix_get_daily_report_v13.sql" ? (
                  <>
                    Migracja{" "}
                    <span className="font-medium">
                      fix_get_daily_report_v13.sql
                    </span>{" "}
                    naprawia funkcję get_daily_report: dodaje osobne pola dla
                    raportów z terminala (początkowego i końcowego), usuwa
                    odwołania do nieistniejącego pola cena zakupu, poprawia
                    pobieranie ceny sprzedaży i obliczanie przychodu.
                  </>
                ) : selectedMigration === "fix_get_daily_report_v12.sql" ? (
                  <>
                    Migracja{" "}
                    <span className="font-medium">
                      fix_get_daily_report_v12.sql
                    </span>{" "}
                    naprawia funkcję get_daily_report: usuwa pole cena zakupu,
                    zmienia sposób obliczania przychodu (sprzedaż * cena
                    sprzedaży) i poprawia wyciąganie danych z terminala.
                  </>
                ) : selectedMigration === "fix_get_daily_report_v11.sql" ? (
                  <>
                    Migracja{" "}
                    <span className="font-medium">
                      fix_get_daily_report_v11.sql
                    </span>{" "}
                    naprawia funkcję get_daily_report, aby nie używała
                    nieistniejącej kolumny terminal_report_value z tabeli
                    reports, co rozwiązuje błąd podczas regeneracji raportu
                    dziennego.
                  </>
                ) : selectedMigration === "fix_get_daily_report_v10.sql" ? (
                  <>
                    Migracja{" "}
                    <span className="font-medium">
                      fix_get_daily_report_v10.sql
                    </span>{" "}
                    naprawia problem z typem danych dla kolumny
                    terminal_report_value w funkcji get_daily_report, co
                    rozwiązuje błąd podczas regeneracji raportu dziennego.
                  </>
                ) : selectedMigration === "fix_get_daily_report_v4.sql" ? (
                  <>
                    Migracja{" "}
                    <span className="font-medium">
                      fix_get_daily_report_v4.sql
                    </span>{" "}
                    naprawia problem z sumowaniem godzin pracy i innych danych w
                    raportach dziennych.
                  </>
                ) : (
                  <>
                    Migracja{" "}
                    <span className="font-medium">{selectedMigration}</span>{" "}
                    wprowadza zmiany w bazie danych. Upewnij się, że rozumiesz
                    skutki tej migracji przed jej wykonaniem.
                  </>
                )}
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground">
              <p>
                Po wykonaniu migracji, zmiany zostaną natychmiast zastosowane w
                bazie danych. Migracja jest nieodwracalna.
              </p>
              <p className="mt-2">
                Zalecamy wykonanie kopii zapasowej bazy danych przed wykonaniem
                migracji.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMigrationDialog(false)}
            >
              Anuluj
            </Button>
            <Button onClick={runMigration} disabled={isMigrating}>
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wykonywanie...
                </>
              ) : (
                "Wykonaj migrację"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
