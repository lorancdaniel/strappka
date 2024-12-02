"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Place, SortConfig, SORT_FIELDS } from "@/types/place";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/use-media-query";

// Stałe dla sortowania i paginacji
const ITEMS_PER_PAGE = 10;

export function PlacesTable() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });

  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/places");
      if (!response.ok) {
        throw new Error("Nie udało się pobrać miejsc pracy");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas pobierania danych");
      }

      setPlaces(data.data);
    } catch (error: any) {
      console.error("Błąd podczas pobierania miejsc pracy:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Czy na pewno chcesz usunąć to miejsce pracy?")) {
      return;
    }

    try {
      const response = await fetch(`/api/places/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Nie udało się usunąć miejsca pracy");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas usuwania");
      }

      toast.success("Miejsce pracy zostało usunięte");
      fetchPlaces();
    } catch (error: any) {
      console.error("Błąd podczas usuwania miejsca pracy:", error);
      toast.error(error.message);
    }
  };

  const handleSort = (key: keyof Place) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Filtrowanie i sortowanie miejsc
  const filteredPlaces = [...places]
    .filter((place) =>
      `${place.name} ${place.adress}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        return sortConfig.direction === "asc"
          ? aValue.length - bValue.length
          : bValue.length - aValue.length;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

  // Paginacja
  const totalPages = Math.ceil(filteredPlaces.length / ITEMS_PER_PAGE);
  const paginatedPlaces = filteredPlaces.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (error) {
    return <div className="text-red-500">Błąd: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={fetchPlaces}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj miejsca pracy..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center p-4">Ładowanie...</div>
          ) : paginatedPlaces.length === 0 ? (
            <div className="text-center p-4">Nie znaleziono miejsc pracy</div>
          ) : (
            paginatedPlaces.map((place) => (
              <div
                key={place.id}
                className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/miejsca/${place.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{place.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {place.adress}
                    </p>
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {Array.isArray(place.employes) ? place.employes.length : 0} pracowników
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/miejsca/${place.id}`);
                    }}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(place.id, e)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                {SORT_FIELDS.map((field) => (
                  <TableHead
                    key={field.key}
                    className="cursor-pointer"
                    onClick={() => handleSort(field.key)}
                  >
                    <div className="flex items-center gap-2">
                      {field.label}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                ))}
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Ładowanie...
                  </TableCell>
                </TableRow>
              ) : paginatedPlaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Nie znaleziono miejsc pracy
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPlaces.map((place) => (
                  <TableRow
                    key={place.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/miejsca/${place.id}`)}
                  >
                    <TableCell className="font-medium">{place.name}</TableCell>
                    <TableCell>{place.adress}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {Array.isArray(place.employes) ? place.employes.length : 0} pracowników
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/miejsca/${place.id}`);
                          }}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(place.id, e)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
            Strona {currentPage} z {totalPages}
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
