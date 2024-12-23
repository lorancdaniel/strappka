"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Building2, MessageSquare } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export function Dashboard() {
  const { theme } = useTheme();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Komplet dokumentów potwierdzony
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Biuro Rachunkowe otrzymało powiadomienie o komplecie dokumentów.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              SPÓŁKA CYWILNA ZAPIS JOANNA SOCHA, MAŁGORZATA PAWLUSIAK
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Numer NIP: 5532553707
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 hover:bg-accent"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Napisz wiadomość
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Statystyki
            </CardTitle>
            <div className="h-4 w-4 rounded-full bg-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Aktywność w tym miesiącu
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
