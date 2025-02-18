"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Place {
  id: number;
  name: string;
  adress: string;
}

export default function DodajRaportPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch("/api/places/user", {
          credentials: "include", 
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error("Nie udało się pobrać miejsc pracy");
        }
        
        const data = await response.json();
        console.log("Pobrane miejsca pracy:", data); 
        
        if (data.success && Array.isArray(data.data)) {
          setPlaces(data.data);
        } else {
          throw new Error("Nieprawidłowy format danych");
        }
      } catch (err) {
        console.error("Błąd podczas pobierania miejsc pracy:", err);
        setError("Wystąpił błąd podczas pobierania miejsc pracy");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  const handlePlaceSelect = (value: string) => {
    console.log("Wybrane miejsce:", value); 
    setSelectedPlace(value);
  };

  const handleSubmit = () => {
    if (selectedPlace) {
      console.log("Przekierowuję do:", `/dodaj-raport/${selectedPlace}`); 
      router.push(`/dodaj-raport/${selectedPlace}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Dodaj Raport</CardTitle>
          <CardDescription>
            Wybierz miejsce pracy, dla którego chcesz utworzyć raport
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Dostępne miejsca pracy: {places.length}</p>
              <Select onValueChange={handlePlaceSelect} value={selectedPlace}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz miejsce pracy" />
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.id.toString()}>
                      {place.name} - {place.adress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedPlace}
              className="w-full"
            >
              Kontynuuj
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
