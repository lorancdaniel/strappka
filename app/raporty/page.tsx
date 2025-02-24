'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

interface Report {
  id: number;
  place_id: string;
  report_type: 'start' | 'end';
  report_date: string;
  fruits: {
    fruit_type: string;
    initial_quantity: number;
    remaining_quantity?: number;
    waste_quantity?: number;
    price_per_kg: number;
    gross_sales?: number;
  }[];
}

export default function RaportyPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPlace, setSelectedPlace] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    try {
      const response = await fetch(
        `/api/reports?placeId=${selectedPlace}&date=${selectedDate.toISOString().split('T')[0]}`
      );
      
      if (!response.ok) {
        throw new Error('Błąd podczas pobierania raportów');
      }

      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Błąd:', error);
    }
  };

  const checkReports = async (placeId: string, date: string) => {
    try {
      const placeIdNumber = parseInt(placeId, 10);
      console.log('[FRONTEND] Sprawdzanie raportów dla:', { placeId, placeIdNumber, date });
      
      const response = await fetch(
        `/api/reports/check-reports?placeId=${placeIdNumber}&date=${date}`
      );
      
      if (!response.ok) {
        throw new Error('Błąd podczas sprawdzania raportów');
      }

      const data = await response.json();
      console.log('[FRONTEND] Odpowiedź z API:', data);
      
      if (data.reports) {
        console.log('[FRONTEND] Znalezione raporty:', {
          liczba: data.reportCount,
          typy: data.reports.map(r => r.report_type)
        });
      }

      return data.hasAllReports;
    } catch (error) {
      console.error('[FRONTEND] Błąd:', error);
      return false;
    }
  };

  const handleAddReport = async () => {
    if (!selectedPlace) {
      toast.error("Wybierz miejsce pracy");
      return;
    }

    setIsLoading(true);
    const date = selectedDate.toISOString().split('T')[0];
    console.log('[FRONTEND] Próba dodania raportu:', {
      miejsce: selectedPlace,
      miejsceNumer: parseInt(selectedPlace, 10),
      data: date
    });

    const hasAllReports = await checkReports(selectedPlace, date);
    console.log('[FRONTEND] Wynik sprawdzenia:', { hasAllReports });

    if (hasAllReports) {
      toast.error("To miejsce pracy ma już dwa raporty na wybrany dzień");
      setIsLoading(false);
      return;
    }

    router.push(`/dodaj-raport/${selectedPlace}`);
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedPlace) {
      fetchReports();
    }
  }, [selectedPlace, selectedDate]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lista raportów</h1>
        <Button 
          onClick={handleAddReport}
          disabled={isLoading || !selectedPlace}
          className="w-full"
        >
          {isLoading ? "Sprawdzanie..." : "Dodaj Raport"}
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Data</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              className="w-full"
            />
          </div>
          
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Miejsce</label>
            <Select
              value={selectedPlace}
              onValueChange={setSelectedPlace}
              placeholder="Wybierz miejsce"
            >
              {/* Tu dodaj opcje miejsc z bazy danych */}
            </Select>
          </div>
        </div>

        {reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-4">
                <h3 className="text-lg font-semibold mb-2">
                  Raport {report.report_type === 'start' ? 'początkowy' : 'końcowy'}
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {report.fruits.map((fruit, index) => (
                    <div key={index} className="space-y-1">
                      <p className="font-medium">{fruit.fruit_type}</p>
                      <p>Ilość początkowa: {fruit.initial_quantity} kg</p>
                      <p>Cena za kg: {fruit.price_per_kg} zł</p>
                      {report.report_type === 'end' && (
                        <>
                          <p>Pozostało: {fruit.remaining_quantity} kg</p>
                          <p>Odpady: {fruit.waste_quantity} kg</p>
                          <p>Sprzedaż: {fruit.gross_sales} zł</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            {selectedPlace 
              ? 'Brak raportów dla wybranej daty i miejsca'
              : 'Wybierz miejsce, aby zobaczyć raporty'}
          </p>
        )}
      </Card>
    </div>
  );
}
