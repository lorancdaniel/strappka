"use client";

import { useRouter } from "next/navigation";
import { EditEmployeeForm } from "@/components/employees/edit-employee-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Employee } from "@/types/employee";
import { use } from "react";

export default function EdytujPracownikaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseDetails, setResponseDetails] = useState<string | null>(null);
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setResponseDetails(null);

        console.log(`Pobieranie danych pracownika o ID: ${resolvedParams.id}`);

        const response = await fetch(`/api/employees/${resolvedParams.id}`);
        const contentType = response.headers.get("content-type");
        console.log(`Status odpowiedzi: ${response.status}`);
        console.log(`Content-Type: ${contentType}`);

        if (!contentType?.includes("application/json")) {
          console.error(`Nieprawidłowy Content-Type: ${contentType}`);
          throw new Error("Otrzymano nieprawidłową odpowiedź z serwera");
        }

        const text = await response.text();
        console.log(
          `Odpowiedź z serwera: ${text.substring(0, 200)}${
            text.length > 200 ? "..." : ""
          }`
        );

        if (!text) {
          console.error("Pusta odpowiedź z serwera");
          throw new Error("Otrzymano pustą odpowiedź z serwera");
        }

        let data;
        try {
          data = JSON.parse(text);
          console.log("Sparsowane dane:", data);
        } catch (e) {
          console.error("Błąd parsowania JSON:", e);
          console.error("Tekst odpowiedzi:", text);
          throw new Error("Nie udało się przetworzyć odpowiedzi z serwera");
        }

        if (!response.ok) {
          console.error("Błąd odpowiedzi:", data);
          setResponseDetails(JSON.stringify(data, null, 2));
          throw new Error(
            data.error || "Nie udało się pobrać danych pracownika"
          );
        }

        if (!data.data) {
          console.error("Brak danych pracownika w odpowiedzi:", data);
          throw new Error("Otrzymano nieprawidłowe dane pracownika");
        }

        console.log("Pobrane dane pracownika:", data.data);
        setEmployee(data.data);
      } catch (error: unknown) {
        console.error("Błąd podczas pobierania pracownika:", error);
        setError(
          error instanceof Error ? error.message : "Wystąpił nieznany błąd"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchEmployee();
    }
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Ładowanie danych pracownika...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót
          </Button>
        </div>
        <div className="text-red-500 font-medium">Wystąpił błąd: {error}</div>
        {responseDetails && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Szczegóły odpowiedzi:</h3>
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto max-h-60">
              {responseDetails}
            </pre>
          </div>
        )}
        <div className="mt-4">
          <Button onClick={() => window.location.reload()}>
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót
          </Button>
        </div>
        <div>Nie znaleziono pracownika</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Powrót
        </Button>
        <h1 className="text-3xl font-bold">Edytuj pracownika</h1>
      </div>

      <EditEmployeeForm
        employee={employee}
        onSuccessAction={() => router.push("/pracownicy")}
        onCancelAction={() => router.back()}
      />
    </div>
  );
}
