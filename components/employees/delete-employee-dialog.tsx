"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteEmployeeDialogProps {
  employeeId: number;
  employeeName: string;
  isAdmin: boolean;
  onDelete: () => void;
}

export function DeleteEmployeeDialog({
  employeeId,
  employeeName,
  isAdmin,
  onDelete,
}: DeleteEmployeeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "usuń") {
      toast.error("Wprowadź poprawne słowo potwierdzające");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Wystąpił błąd podczas usuwania pracownika");
      }

      toast.success("Pracownik został usunięty");
      setIsOpen(false);
      onDelete();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas usuwania pracownika"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:text-red-500"
          disabled={isAdmin}
          title={
            isAdmin ? "Nie można usunąć administratora" : "Usuń pracownika"
          }
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuń pracownika</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć pracownika {employeeName}? Ta akcja jest
            nieodwracalna.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Aby potwierdzić, wpisz słowo{" "}
            <span className="font-semibold">usuń</span>
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Wpisz 'usuń'"
            className="max-w-sm"
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== "usuń" || isLoading}
          >
            {isLoading ? "Usuwanie..." : "Usuń pracownika"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
