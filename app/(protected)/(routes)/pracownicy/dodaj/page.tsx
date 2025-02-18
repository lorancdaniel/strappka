"use client";

import { useRouter } from "next/navigation";
import { AddEmployeeForm } from "@/components/employees/add-employee-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DodajPracownikaPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/pracownicy");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Powrót
        </Button>
        <h1 className="text-3xl font-bold">Dodaj pracownika</h1>
      </div>

      <AddEmployeeForm onSuccess={handleSuccess} />
    </div>
  );
}
