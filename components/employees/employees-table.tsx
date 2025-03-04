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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Rozpoczynam pobieranie pracowników");

      const response = await fetch("/api/employees");
      console.log("Status odpowiedzi:", response.status);

      const data = await response.json();
      console.log("Otrzymane dane:", data);

      if (data.success) {
        console.log("Liczba pracowników:", data.data?.length || 0);
        console.log("Przykładowy pracownik:", data.data?.[0]);
        setEmployees(data.data || []);
      } else {
        console.error("Błąd pobierania pracowników:", data.error);
        setError(data.error || "Nie udało się pobrać listy pracowników");
        toast.error(data.error || "Nie udało się pobrać listy pracowników");
      }
    } catch (error) {
      console.error("Wyjątek podczas pobierania pracowników:", error);
      setError("Wystąpił błąd podczas pobierania danych");
      toast.error("Nie udało się pobrać listy pracowników");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Funkcja sortująca
  const sortEmployees = (employees: Employee[]) => {
    console.log(
      "Sortowanie pracowników według:",
      sortConfig.key,
      sortConfig.direction
    );
    return [...employees].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Employee];
      const bValue = b[sortConfig.key as keyof Employee];

      // Specjalna obsługa dla null w przypadku telefonu
      if (sortConfig.key === "phone") {
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return sortConfig.direction === "asc" ? -1 : 1;
        if (bValue === null) return sortConfig.direction === "asc" ? 1 : -1;
      }

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
    console.log("Zmiana sortowania na:", key);
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
      "Telefon",
      "Miejsca pracy",
    ];

    const csvData = sortEmployees(
      employees.filter((employee) =>
        `${employee.name} ${employee.surname} ${employee.login}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    ).map((emp) => [
      emp.name.replace(/,/g, ";"),
      emp.surname.replace(/,/g, ";"),
      emp.login.replace(/,/g, ";"),
      emp.type_of_user === 1 ? "Admin" : "Uzytkownik",
      emp.phone || "",
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
    employees.filter((employee) => {
      const searchText =
        `${employee.name} ${employee.surname} ${employee.login}`.toLowerCase();
      const result = searchText.includes(search.toLowerCase());
      return result;
    })
  );

  console.log("Liczba przefiltrowanych pracowników:", filteredEmployees.length);

  // Paginacja
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  console.log("Liczba pracowników na stronie:", paginatedEmployees.length);

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

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          <p className="font-medium">Błąd:</p>
          <p>{error}</p>
        </div>
      )}

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
                    {employee.phone && (
                      <p className="text-sm text-muted-foreground">
                        Tel: {employee.phone}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      employee.type_of_user === 1 ? "default" : "secondary"
                    }
                  >
                    {employee.type_of_user === 1 ? "Admin" : "Użytkownik"}
                  </Badge>
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
                          {place}
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
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  {SORT_FIELDS.name}{" "}
                  {sortConfig.key === "name" && (
                    <ArrowUpDown
                      className={`ml-1 h-4 w-4 inline ${
                        sortConfig.direction === "desc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("surname")}
                >
                  {SORT_FIELDS.surname}{" "}
                  {sortConfig.key === "surname" && (
                    <ArrowUpDown
                      className={`ml-1 h-4 w-4 inline ${
                        sortConfig.direction === "desc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("login")}
                >
                  {SORT_FIELDS.login}{" "}
                  {sortConfig.key === "login" && (
                    <ArrowUpDown
                      className={`ml-1 h-4 w-4 inline ${
                        sortConfig.direction === "desc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("type_of_user")}
                >
                  {SORT_FIELDS.type_of_user}{" "}
                  {sortConfig.key === "type_of_user" && (
                    <ArrowUpDown
                      className={`ml-1 h-4 w-4 inline ${
                        sortConfig.direction === "desc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("phone")}
                >
                  {SORT_FIELDS.phone}{" "}
                  {sortConfig.key === "phone" && (
                    <ArrowUpDown
                      className={`ml-1 h-4 w-4 inline ${
                        sortConfig.direction === "desc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("places")}
                >
                  {SORT_FIELDS.places}{" "}
                  {sortConfig.key === "places" && (
                    <ArrowUpDown
                      className={`ml-1 h-4 w-4 inline ${
                        sortConfig.direction === "desc" ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Ładowanie...
                  </TableCell>
                </TableRow>
              ) : paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
                    <TableCell>{employee.phone || "-"}</TableCell>
                    <TableCell>
                      {employee.places && employee.places.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {employee.places.map((place, index) => (
                            <Badge
                              key={`${employee.id}-place-${place}-${index}`}
                              variant="outline"
                              className="text-xs"
                            >
                              {place}
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
    </div>
  );
}
