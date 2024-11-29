import * as z from "zod";

export interface Employee {
  id: number;
  name: string;
  surname: string;
  login: string;
  password: string;
  working_hours: number;
  places: number[];
  type_of_user: number;
  created: string;
  logs: string[];
  phone: number | null;
}

export const employeeFormSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  surname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  login: z.string().min(3, "Login musi mieć minimum 3 znaki"),
  working_hours: z
    .number()
    .min(0, "Godziny pracy nie mogą być ujemne")
    .max(300, "Godziny pracy nie mogą przekraczać 300")
    .default(0),
  places: z.string(),
  type_of_user: z.string(),
  newPassword: z.string().optional(),
  phone: z
    .string()
    .regex(/^\d{9}$/, "Numer telefonu musi składać się z 9 cyfr")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export interface SortConfig {
  field: keyof Employee;
  order: "asc" | "desc";
}
