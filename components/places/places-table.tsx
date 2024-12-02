"use client";

import { useState, useEffect } from "react";
import { Place, SortConfig } from "@/types/place";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DeletePlaceDialog } from "@/components/places/delete-place-dialog";
import { SORT_FIELDS } from "@/types/place";

const ITEMS_PER_PAGE = 10;

export function PlacesTable() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/places");
      const data = await response.json();
      if (data.success) {
        setPlaces(data.data || []);
      } else {
        toast.error("Nie udało się pobrać listy miejsc");
      }
    } catch (error) {
      console.error("Błąd podczas pobierania miejsc:", error);
      toast.error("Nie udało się pobrać listy miejsc");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  // Funkcja sortująca
  const sortPlaces = (places: Place[]) => {
    return [...places].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // Funkcja wyszukująca
  const filterPlaces = (places: Place[]) => {
    return places.filter((place) => {
      const searchLower = search.toLowerCase();
      return (
        place.name.toLowerCase().includes(searchLower) ||
        place.adress.toLowerCase().includes(searchLower)
      );
    });
  };

  const handleSort = (key: keyof Place) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredPlaces = filterPlaces(sortPlaces(places));
  const totalPages = Math.ceil(filteredPlaces.length / ITEMS_PER_PAGE);
  const paginatedPlaces = filteredPlaces.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Szukaj miejsca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[300px]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => router.push("/places/add")}
            className="w-full sm:w-auto"
          >
            Dodaj miejsce
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {SORT_FIELDS.map((field) => (
                <TableHead key={field.key}>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(field.key)}
                    className="flex items-center gap-1"
                  >
                    {field.label}
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </TableHead>
              ))}
              <TableHead>Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Ładowanie...
                </TableCell>
              </TableRow>
            ) : paginatedPlaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Brak miejsc do wyświetlenia
                </TableCell>
              </TableRow>
            ) : (
              paginatedPlaces.map((place) => (
                <TableRow key={place.id}>
                  <TableCell>{place.name}</TableCell>
                  <TableCell>{place.adress}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/places/edit/${place.id}`)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <DeletePlaceDialog
                        placeId={place.id}
                        placeName={place.name}
                        onDelete={fetchPlaces}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Poprzednia
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Następna
          </Button>
        </div>
      )}
    </div>
  );
}
