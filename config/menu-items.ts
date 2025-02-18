import {
  Monitor,
  ShoppingCart,
  ShoppingBag,
  Mail,
  FileText,
  Users,
  Building,
} from "lucide-react";

type Role = "admin" | "user";

export const menuItems = [
  {
    icon: Monitor,
    label: "Pulpit",
    url: "/",
    roles: ["admin", "user"] as Role[],
  },
  {
    icon: ShoppingCart,
    label: "Dodaj raport",
    url: "/dodaj-raport",
    roles: ["user"] as Role[],
  },
  {
    icon: ShoppingCart,
    label: "Raport",
    url: "/raport",
    roles: ["admin"] as Role[],
  },
  {
    icon: ShoppingBag,
    label: "Podsumowanie",
    url: "/podsumowanie",
    roles: ["admin"] as Role[],
  },
  {
    icon: Mail,
    label: "Wiadomości",
    url: "/wiadomosci",
    roles: ["admin"] as Role[],
  },
  {
    icon: FileText,
    label: "Dokumenty",
    url: "/dokumenty",
    roles: ["admin"] as Role[],
  },
  {
    icon: Users,
    label: "Pracownicy",
    url: "/pracownicy",
    roles: ["admin"] as Role[],
  },
  {
    icon: Building,
    label: "Miejsca",
    url: "/miejsca",
    roles: ["admin"] as Role[],
  },
] as const;

export type MenuItem = (typeof menuItems)[number];
