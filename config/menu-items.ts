import {
  Monitor,
  ShoppingCart,
  ShoppingBag,
  Mail,
  FileText,
  Users,
} from "lucide-react";

export const menuItems = [
  {
    icon: Monitor,
    label: "Pulpit",
    url: "/",
    roles: ["admin", "user"],
  },
  {
    icon: ShoppingCart,
    label: "Dodaj raport",
    url: "/dodaj-raport",
    roles: ["user"],
  },
  {
    icon: ShoppingCart,
    label: "Raport",
    url: "/raport",
    roles: ["admin"],
  },
  {
    icon: ShoppingBag,
    label: "Podsumowanie",
    url: "/podsumowanie",
    roles: ["admin"],
  },
  {
    icon: Mail,
    label: "Wiadomości",
    url: "/wiadomosci",
    roles: ["admin"],
  },
  {
    icon: FileText,
    label: "Dokumenty",
    url: "/dokumenty",
    roles: ["admin"],
  },
  {
    icon: Users,
    label: "Pracownicy",
    url: "/pracownicy",
    roles: ["admin"],
  },
] as const;

export type MenuItem = (typeof menuItems)[number];
