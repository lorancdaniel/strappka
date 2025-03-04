import * as z from "zod";

export interface Employee {
  id: number;
  name: string;
  surname: string;
  login: string;
  password: string;
  places: string[];
  type_of_user: number;
  created: string;
  logs: string[];
  phone: number | null;
}

export const employeeFormSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  surname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  login: z.string().min(3, "Login musi mieć minimum 3 znaki"),
  places: z.array(z.string()).default([]),
  type_of_user: z.string(),
  newPassword: z.string().optional(),
  phone: z
    .string()
    .regex(/^\d{9}$/, "Numer telefonu musi składać się z 9 cyfr")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const SORT_FIELDS = {
  name: "Imię",
  surname: "Nazwisko",
  login: "Login",
  type_of_user: "Typ",
  places: "Miejsca pracy",
  phone: "Telefon",
} as const;

export interface SortConfig {
  key: keyof typeof SORT_FIELDS;
  direction: "asc" | "desc";
}
