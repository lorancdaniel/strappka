'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    if (selectedPlace) {
      fetchReports();
    }
  }, [selectedPlace, selectedDate]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lista raportów</h1>
        <Button onClick={() => router.push('/dodaj-raport')}>
          Dodaj nowy raport
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
