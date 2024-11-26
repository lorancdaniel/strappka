"use client";

import { useState, useEffect } from "react";
import { Employee, SortConfig } from "@/types/employee";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { EditEmployeeForm } from "./edit-employee-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export function EmployeesTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const router = useRouter();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees");
      const data = await response.json();
      if (data.success) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj pracownika..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchEmployees}
            className="whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
          <Button
            variant="outline"
            onClick={() => setResetDialogOpen(true)}
            className="whitespace-nowrap"
          >
            Resetuj godziny
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię</TableHead>
              <TableHead>Nazwisko</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Godziny pracy</TableHead>
              <TableHead>Miejsca pracy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Ładowanie...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nie znaleziono pracowników
                </TableCell>
              </TableRow>
            ) : (
              employees
                .filter((employee) =>
                  `${employee.name} ${employee.surname} ${employee.login}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
                )
                .map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/pracownicy/${employee.id}`)}
                  >
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.surname}</TableCell>
                    <TableCell>{employee.login}</TableCell>
                    <TableCell>
                      {employee.type_of_user === 1 ? "Admin" : "Użytkownik"}
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
                          {employee.places.map((place) => (
                            <Badge
                              key={place}
                              variant="secondary"
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
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

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

      <Dialog
        open={!!editingEmployee}
        onOpenChange={() => setEditingEmployee(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj pracownika</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <EditEmployeeForm
              employee={editingEmployee}
              onSuccess={() => {
                setEditingEmployee(null);
                fetchEmployees();
              }}
              onCancel={() => setEditingEmployee(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
