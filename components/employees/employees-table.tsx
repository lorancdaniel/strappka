"use client";

import { useState, useEffect } from "react";
import { Employee, SortConfig } from "@/types/employee";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, RefreshCw, Download, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteEmployeeDialog } from "@/components/employees/delete-employee-dialog";
import { SORT_FIELDS } from "@/types/employee";

// Stałe dla sortowania i paginacji
const ITEMS_PER_PAGE = 10;

export function EmployeesTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "surname",
    direction: "asc",
  });
  const router = useRouter();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees");
      const data = await response.json();
      if (data.success) {
        console.log("Received employees:", data.data);
        setEmployees(data.data || []);
      } else {
        toast.error("Nie udało się pobrać listy pracowników");
      }
    } catch (error) {
      console.error("Błąd podczas pobierania pracowników:", error);
      toast.error("Nie udało się pobrać listy pracowników");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleResetHours = async () => {
    if (resetConfirmation.toLowerCase() !== "resetuj") {
      toast.error('Wpisz "resetuj" aby potwierdzić');
      return;
    }

    try {
      setIsResetting(true);
      const response = await fetch("/api/employees/reset-hours", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Nie udało się zresetować godzin");
      }

      toast.success("Pomyślnie zresetowano godziny wszystkich pracowników");
      setResetDialogOpen(false);
      setResetConfirmation("");
      fetchEmployees();
    } catch (error) {
      toast.error("Wystąpił błąd podczas resetowania godzin");
    } finally {
      setIsResetting(false);
    }
  };

  // Funkcja sortująca
  const sortEmployees = (employees: Employee[]) => {
    return [...employees].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Employee];
      const bValue = b[sortConfig.key as keyof Employee];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      return sortConfig.direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  // Funkcja zmiany sortowania
  const handleSort = (key: keyof typeof SORT_FIELDS) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Funkcja eksportu do CSV
  const handleExportCSV = () => {
    // Dodanie BOM dla poprawnej obsługi polskich znaków
    const BOM = "\uFEFF";
    const headers = [
      "Imie",
      "Nazwisko",
      "Login",
      "Typ",
      "Godziny pracy",
      "Miejsca pracy",
    ];

    const csvData = filteredEmployees.map((emp) => [
      emp.name.replace(/,/g, ";"),
      emp.surname.replace(/,/g, ";"),
      emp.login.replace(/,/g, ";"),
      emp.type_of_user === 1 ? "Admin" : "Uzytkownik",
      Number(emp.working_hours).toFixed(2),
      emp.places?.join("; ") || "",
    ]);

    const csvContent =
      BOM +
      [headers.join(";"), ...csvData.map((row) => row.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().split("T")[0];
    link.download = `pracownicy_${date}.csv`;
    link.click();
  };

  // Filtrowanie i sortowanie pracowników
  const filteredEmployees = sortEmployees(
    employees.filter((employee) =>
      `${employee.name} ${employee.surname} ${employee.login}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  // Paginacja
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={fetchEmployees}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
          <Button
            variant="outline"
            onClick={() => setResetDialogOpen(true)}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Resetuj godziny
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:flex gap-2 w-full sm:w-auto sm:ml-auto">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            Eksportuj CSV
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj pracownika..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center p-4">Ładowanie...</div>
          ) : paginatedEmployees.length === 0 ? (
            <div className="text-center p-4">Nie znaleziono pracowników</div>
          ) : (
            paginatedEmployees.map((employee) => (
              <div
                key={employee.id}
                className="rounded-lg border p-4 space-y-2 cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/pracownicy/${employee.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      {employee.name} {employee.surname}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {employee.login}
                    </p>
                  </div>
                  <Badge
                    variant={
                      employee.type_of_user === 1 ? "default" : "secondary"
                    }
                  >
                    {employee.type_of_user === 1 ? "Admin" : "Użytkownik"}
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="font-medium">
                    {Number(employee.working_hours).toFixed(2)}
                  </span>{" "}
                  h
                </div>
                <div>
                  {employee.places && employee.places.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {employee.places.map((place, index) => (
                        <Badge
                          key={`${employee.id}-place-${place}-${index}`}
                          variant="outline"
                          className="text-xs"
                        >
                          Miejsce {place}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Brak przypisanych miejsc
                    </span>
                  )}
                </div>
                <div>
                  {typeof employee.phone === "number" ? (
                    <span>{String(employee.phone).padStart(9, "0")}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Brak numeru
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Object.entries(SORT_FIELDS).map(([key, label]) => (
                  <TableHead
                    key={key}
                    className="cursor-pointer"
                    onClick={() => handleSort(key as keyof typeof SORT_FIELDS)}
                  >
                    <div className="flex items-center gap-2">
                      {label}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                ))}
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Ładowanie...
                  </TableCell>
                </TableRow>
              ) : paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Nie znaleziono pracowników
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/pracownicy/${employee.id}`)}
                  >
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.surname}</TableCell>
                    <TableCell>{employee.login}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          employee.type_of_user === 1 ? "default" : "secondary"
                        }
                      >
                        {employee.type_of_user === 1 ? "Admin" : "Użytkownik"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {Number(employee.working_hours).toFixed(2)}
                      </span>{" "}
                      h
                    </TableCell>
                    <TableCell>
                      {employee.places && employee.places.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {employee.places.map((place, index) => (
                            <Badge
                              key={`${employee.id}-place-${place}-${index}`}
                              variant="outline"
                              className="text-xs"
                            >
                              Miejsce {place}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Brak przypisanych miejsc
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {typeof employee.phone === "number" ? (
                        <span>{String(employee.phone).padStart(9, "0")}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Brak numeru
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/pracownicy/${employee.id}`);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteEmployeeDialog
                          employeeId={employee.id}
                          employeeName={`${employee.name} ${employee.surname}`}
                          isAdmin={employee.type_of_user === 1}
                          onDeleteAction={fetchEmployees}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Poprzednia
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={`page-${page}`}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Następna
          </Button>
        </div>
      )}

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetowanie godzin</DialogTitle>
            <DialogDescription>
              Ta operacja zresetuje godziny wszystkich pracowników. Aby
              potwierdzić, wpisz "resetuj" w polu poniżej.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder='Wpisz "resetuj"'
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
              className="bg-white dark:bg-slate-950"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setResetConfirmation("");
              }}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetHours}
              disabled={
                isResetting || resetConfirmation.toLowerCase() !== "resetuj"
              }
            >
              {isResetting ? "Resetowanie..." : "Resetuj godziny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
