"use client";

import { useRouter } from "next/navigation";
import { AddPlaceForm } from "@/components/places/add-place-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DodajMiejscePage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/miejsca");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Powrót
        </Button>
        <h1 className="text-3xl font-bold">Dodaj miejsce pracy</h1>
      </div>

      <AddPlaceForm onSuccess={handleSuccess} onCancel={() => router.back()} />
    </div>
  );
}
