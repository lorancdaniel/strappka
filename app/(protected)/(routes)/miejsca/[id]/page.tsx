"use client";

import { useRouter } from "next/navigation";
import { EditPlaceForm } from "@/components/places/edit-place-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Place } from "@/types/place";
import { use } from "react";

export default function EdytujMiejscePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/places/${resolvedParams.id}`);
        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          throw new Error("Otrzymano nieprawidłową odpowiedź z serwera");
        }

        const text = await response.text();
        if (!text) {
          throw new Error("Otrzymano pustą odpowiedź z serwera");
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Błąd parsowania JSON:", text);
          throw new Error("Nie udało się przetworzyć odpowiedzi z serwera");
        }

        if (!response.ok) {
          throw new Error(
            data.error || "Nie udało się pobrać danych miejsca pracy"
          );
        }

        if (!data.data) {
          throw new Error("Otrzymano nieprawidłowe dane miejsca pracy");
        }

        setPlace(data.data);
      } catch (error: any) {
        console.error("Błąd podczas pobierania miejsca pracy:", error);
        setError(error.message || "Wystąpił nieznany błąd");
      } finally {
        setIsLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchPlace();
    }
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Ładowanie danych miejsca pracy...</div>
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
        <div className="text-red-500">Wystąpił błąd: {error}</div>
      </div>
    );
  }

  if (!place) {
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
        <div>Nie znaleziono miejsca pracy</div>
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
        <h1 className="text-3xl font-bold">Edytuj miejsce pracy</h1>
      </div>

      <EditPlaceForm
        place={place}
        onSuccessAction={() => router.push("/miejsca")}
        onCancelAction={() => router.back()}
      />
    </div>
  );
}
