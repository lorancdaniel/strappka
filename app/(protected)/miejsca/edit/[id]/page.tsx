"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/types/place";
import { EditPlaceForm } from "@/components/places/edit-place-form";
import { toast } from "sonner";

export default function EditPlacePage({
  params,
}: {
  params: { id: string };
}) {
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const response = await fetch(`/api/places/${params.id}`);
        const data = await response.json();
        if (data.success) {
          setPlace(data.data);
        } else {
          toast.error("Nie udało się pobrać danych miejsca");
          router.push("/miejsca");
        }
      } catch (error) {
        console.error("Error fetching place:", error);
        toast.error("Nie udało się pobrać danych miejsca");
        router.push("/miejsca");
      } finally {
        setLoading(false);
      }
    };

    fetchPlace();
  }, [params.id, router]);

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  if (!place) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edytuj miejsce</h1>
      </div>
      <div className="max-w-2xl">
        <EditPlaceForm
          place={place}
          onSuccessAction={() => router.push("/miejsca")}
          onCancelAction={() => router.push("/miejsca")}
        />
      </div>
    </div>
  );
}
