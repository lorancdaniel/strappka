"use client";

import { EmployeesTable } from "@/components/employees/employees-table";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PracownicyPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pracownicy</h1>
        <Button
          onClick={() => router.push("/pracownicy/dodaj")}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Dodaj pracownika
        </Button>
      </div>
      <p className="text-muted-foreground">
        Lista pracowników i zarządzanie zespołem.
      </p>
      <EmployeesTable />
    </div>
  );
}
