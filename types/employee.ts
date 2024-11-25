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
}

export const employeeFormSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  surname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  login: z.string().min(3, "Login musi mieć minimum 3 znaki"),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
  working_hours: z
    .number()
    .min(0, "Godziny pracy nie mogą być ujemne")
    .default(0),
  places: z.array(z.number()).default([]),
  type_of_user: z.number().min(0).max(1).default(0),
});

export interface SortConfig {
  field: keyof Employee;
  order: "asc" | "desc";
}
