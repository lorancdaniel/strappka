"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Report {
  place_id: number;
  report_date: string;
  report_type: 'start' | 'end';
  terminal_shipment_report: string;
  cash_for_change?: number;
  work_hours: number;
  deposited_cash?: number;
  initial_cash?: number;
}

interface ReportFruit {
  fruit_type: string;
  initial_quantity: number;
  price_per_kg: number;
  remaining_quantity?: number;
  waste_quantity?: number;
  gross_sales?: number;
}

const FRUIT_TYPES = [
  'truskawka',
  'czeresnia',
  'borowka',
  'malina',
  'jagoda',
  'wisnia',
  'agrest',
  'jajka'
];

export default function DodajRaportForm() {
  const { placeId } = useParams();
  const [reportType, setReportType] = useState<'start' | 'end'>('start');
  const [hasStartReport, setHasStartReport] = useState(false);
  const [reportData, setReportData] = useState<Report>({
    place_id: Number(placeId),
    report_date: new Date().toISOString().split('T')[0],
    report_type: 'start',
    terminal_shipment_report: '',
    work_hours: 0,
    initial_cash: 0
  });
  const [fruits, setFruits] = useState<ReportFruit[]>([]);

  // Sprawdź czy istnieje raport początkowy
  useEffect(() => {
    const checkStartReport = async () => {
      try {
        const response = await fetch(
          `/api/reports/check-start?placeId=${placeId}&date=${reportData.report_date}`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('Błąd podczas sprawdzania raportu początkowego');
        }

        const data = await response.json();
        setHasStartReport(data.hasStartReport);
        
        // Jeśli nie ma raportu początkowego, a wybrany jest raport końcowy,
        // zmień typ na początkowy
        if (!data.hasStartReport && reportType === 'end') {
          setReportType('start');
        }
      } catch (error) {
        console.error('Błąd:', error);
        setHasStartReport(false);
      }
    };

    checkStartReport();
  }, [placeId, reportData.report_date, reportType]);

  // Aktualizuj datę przy zmianie typu raportu
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setReportData(prev => ({
      ...prev,
      report_date: today,
      report_type: reportType
    }));
  }, [reportType]);

  const handleReportDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: name.includes('cash') || name === 'work_hours' ? parseFloat(value) : value
    }));
  };

  const handleAddFruit = () => {
    setFruits(prev => [...prev, {
      fruit_type: '',
      initial_quantity: 0,
      price_per_kg: 0,
      remaining_quantity: 0,
      waste_quantity: 0,
      gross_sales: 0
    }]);
  };

  const handleFruitChange = (index: number, field: keyof ReportFruit, value: string) => {
    setFruits(prev => {
      const newFruits = [...prev];
      const numericValue = parseFloat(value);
      
      // Aktualizacja wartości pola
      newFruits[index] = {
        ...newFruits[index],
        [field]: field === 'fruit_type' ? value : numericValue
      };

      // Walidacja ilości tylko dla raportu końcowego
      if (reportType === 'end' && 
          (field === 'remaining_quantity' || field === 'waste_quantity' || field === 'initial_quantity')) {
        const fruit = newFruits[index];
        const remaining = fruit.remaining_quantity || 0;
        const waste = fruit.waste_quantity || 0;
        const initial = fruit.initial_quantity || 0;

        if (remaining + waste > initial) {
          alert('Suma ilości pozostałej i odpadów nie może przekraczać ilości początkowej!');
          // Przywróć poprzednią wartość
          newFruits[index] = prev[index];
          return prev;
        }
      }

      return newFruits;
    });
  };

  const handleRemoveFruit = (index: number) => {
    setFruits(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja ilości dla wszystkich owoców
    if (reportType === 'end') {
      for (const fruit of fruits) {
        const remaining = fruit.remaining_quantity || 0;
        const waste = fruit.waste_quantity || 0;
        const initial = fruit.initial_quantity || 0;

        if (remaining + waste > initial) {
          alert('Suma ilości pozostałej i odpadów nie może przekraczać ilości początkowej!');
          return;
        }
      }
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report: reportData,
          fruits: fruits
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas zapisywania raportu');
      }

      // Przekierowanie po sukcesie
      window.location.href = '/raporty';
    } catch (error) {
      console.error('Błąd:', error);
      alert(error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania raportu');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Dodaj Raport - {reportType === 'start' ? 'Początkowy' : 'Końcowy'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Typ Raportu</Label>
                <Select
                  value={reportType}
                  onValueChange={(value) => {
                    if (value === 'end' && !hasStartReport) {
                      alert('Nie można utworzyć raportu końcowego bez raportu początkowego dla tego dnia');
                      return;
                    }
                    setReportType(value as 'start' | 'end');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Wybierz typ raportu" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="start">Początkowy</SelectItem>
                    <SelectItem value="end" disabled={!hasStartReport}>Końcowy</SelectItem>
                  </SelectContent>
                </Select>
                {!hasStartReport && reportType === 'end' && (
                  <p className="text-sm text-red-500 mt-1">
                    Najpierw musisz utworzyć raport początkowy dla tego dnia
                  </p>
                )}
              </div>

              <div>
                <Label>Data Raportu</Label>
                <Input
                  type="date"
                  name="report_date"
                  value={reportData.report_date}
                  readOnly
                  required
                />
              </div>

              <div>
                <Label>Raport z Terminala</Label>
                <Input
                  type="text"
                  name="terminal_shipment_report"
                  value={reportData.terminal_shipment_report}
                  onChange={handleReportDataChange}
                  required
                />
              </div>

              <div>
                <Label>Godziny Pracy</Label>
                <Input
                  type="number"
                  name="work_hours"
                  value={reportData.work_hours}
                  onChange={handleReportDataChange}
                  required
                  min="0"
                  max="24"
                  step="0.5"
                />
              </div>

              {reportType === 'start' && (
                <div>
                  <Label>Gotówka Początkowa</Label>
                  <Input
                    type="number"
                    name="initial_cash"
                    value={reportData.initial_cash}
                    onChange={handleReportDataChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              {reportType === 'end' && (
                <>
                  <div>
                    <Label>Gotówka na Resztę</Label>
                    <Input
                      type="number"
                      name="cash_for_change"
                      value={reportData.cash_for_change}
                      onChange={handleReportDataChange}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Zdeponowana Gotówka</Label>
                    <Input
                      type="number"
                      name="deposited_cash"
                      value={reportData.deposited_cash}
                      onChange={handleReportDataChange}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Owoce</h3>
                <Button type="button" onClick={handleAddFruit}>
                  Dodaj Owoc
                </Button>
              </div>

              {Array.isArray(fruits) && fruits.map((fruit, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg relative">
                  <button
                    type="button"
                    onClick={() => handleRemoveFruit(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Typ Owocu</Label>
                      <Select
                        value={fruit.fruit_type}
                        onValueChange={(value) => handleFruitChange(index, 'fruit_type', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz owoc" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {FRUIT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ilość Początkowa (kg)</Label>
                      <Input
                        type="number"
                        value={fruit.initial_quantity}
                        onChange={(e) => handleFruitChange(index, 'initial_quantity', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Cena za kg</Label>
                      <Input
                        type="number"
                        value={fruit.price_per_kg}
                        onChange={(e) => handleFruitChange(index, 'price_per_kg', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label>Pozostała Ilość (kg)</Label>
                      <Input
                        type="number"
                        value={fruit.remaining_quantity}
                        onChange={(e) => handleFruitChange(index, 'remaining_quantity', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Ilość Odpadów (kg)</Label>
                      <Input
                        type="number"
                        value={fruit.waste_quantity}
                        onChange={(e) => handleFruitChange(index, 'waste_quantity', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Sprzedaż Brutto</Label>
                      <Input
                        type="number"
                        value={fruit.gross_sales}
                        onChange={(e) => handleFruitChange(index, 'gross_sales', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full">
              Zapisz Raport
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
