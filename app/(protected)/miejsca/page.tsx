"use client";

import { PlacesTable } from "@/components/places/places-table";

export default function PlacesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Miejsca</h1>
      </div>
      <PlacesTable />
    </div>
  );
}
