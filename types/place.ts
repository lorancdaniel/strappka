export interface Place {
  id: number;
  name: string;
  adress: string;
  employes: number[];
}

export interface SortConfig {
  key: keyof Place;
  direction: 'asc' | 'desc';
}

export const SORT_FIELDS: { key: keyof Place; label: string }[] = [
  { key: 'name', label: 'Nazwa' },
  { key: 'adress', label: 'Adres' },
];
