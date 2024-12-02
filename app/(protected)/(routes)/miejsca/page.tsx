"use client";

import { PlacesTable } from "@/components/places/places-table";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MiejscaPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Miejsca pracy</h1>
        <Button
          onClick={() => router.push("/miejsca/dodaj")}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          Dodaj miejsce pracy
        </Button>
      </div>
      <p className="text-muted-foreground">
        Lista miejsc pracy i zarządzanie lokalizacjami.
      </p>
      <PlacesTable />
    </div>
  );
}
