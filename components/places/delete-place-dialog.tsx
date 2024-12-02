"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DeletePlaceDialogProps {
  placeId: number;
  placeName: string;
  onDelete: () => void;
}

export function DeletePlaceDialog({
  placeId,
  placeName,
  onDelete,
}: DeletePlaceDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmation.toLowerCase() !== "usuń") {
      toast.error('Wpisz "usuń" aby potwierdzić');
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/places/${placeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Nie udało się usunąć miejsca");
      }

      toast.success("Miejsce zostało usunięte");
      setOpen(false);
      onDelete();
    } catch (error) {
      console.error("Błąd podczas usuwania miejsca:", error);
      toast.error("Wystąpił błąd podczas usuwania miejsca");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń miejsce</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć miejsce {placeName}? Ta akcja jest
              nieodwracalna.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              Wpisz <strong>usuń</strong> aby potwierdzić:
            </p>
            <Input
              className="mt-2"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
