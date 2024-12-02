import { Employee } from "./employee";

export type Place = {
  id: number;
  name: string;
  adress: string;
  employes: number[];
};

export type SortConfig = {
  key: keyof Place;
  direction: "asc" | "desc";
};

export const SORT_FIELDS = [
  { key: "name" as keyof Place, label: "Nazwa" },
  { key: "adress" as keyof Place, label: "Adres" },
  { key: "employes" as keyof Place, label: "Pracownicy" },
];
