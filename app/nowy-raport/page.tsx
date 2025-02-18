'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Place } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function NowyRaport() {
  const { data: session } = useSession()
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [reportType, setReportType] = useState<'start' | 'end'>('start')
  const [reportData, setReportData] = useState({
    cash_for_change: '',
    work_hours: '',
    initial_cash: '',
  })

  useEffect(() => {
    if (!session) {
      redirect('/')
    }

    // Pobierz miejsca pracy przypisane do użytkownika
    const fetchUserPlaces = async () => {
      try {
        const response = await fetch('/api/places/user')
        if (response.ok) {
          const data = await response.json()
          setPlaces(data.data)
        }
      } catch (error) {
        console.error('Błąd podczas pobierania miejsc:', error)
      }
    }

    fetchUserPlaces()
  }, [session])

  const handlePlaceSelect = (value: string) => {
    setSelectedPlace(value)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          place_id: parseInt(selectedPlace),
          report_type: reportType,
          report_date: new Date().toISOString().split('T')[0],
          ...reportData,
        }),
      })

      if (response.ok) {
        redirect('/raporty')
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania raportu:', error)
    }
  }

  const selectedPlaceData = places.find(p => p.id.toString() === selectedPlace)

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-6">Dodaj nowy raport</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Wybierz miejsce pracy
              </label>
              <Select onValueChange={handlePlaceSelect} value={selectedPlace}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz miejsce pracy" />
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.id.toString()}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showForm && selectedPlaceData && (
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <h2 className="text-xl font-semibold mb-4">
                  Nowy raport dla: {selectedPlaceData.name}
                </h2>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Typ raportu
                  </label>
                  <Select
                    onValueChange={(value: 'start' | 'end') => setReportType(value)}
                    value={reportType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Wybierz typ raportu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">Raport początkowy</SelectItem>
                      <SelectItem value="end">Raport końcowy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Gotówka na wydawanie
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={reportData.cash_for_change}
                    onChange={(e) =>
                      setReportData({
                        ...reportData,
                        cash_for_change: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Godziny pracy
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={reportData.work_hours}
                    onChange={(e) =>
                      setReportData({
                        ...reportData,
                        work_hours: e.target.value,
                      })
                    }
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Gotówka początkowa
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={reportData.initial_cash}
                    onChange={(e) =>
                      setReportData({
                        ...reportData,
                        initial_cash: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Zapisz raport
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
