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
  },
  {
    icon: ShoppingCart,
    label: "Raport",
    url: "/raport",
  },
  {
    icon: ShoppingBag,
    label: "Podsumowanie",
    url: "/podsumowanie",
  },
  {
    icon: Mail,
    label: "Wiadomości",
    url: "/wiadomosci",
  },
  {
    icon: FileText,
    label: "Dokumenty",
    url: "/dokumenty",
  },
  {
    icon: Users,
    label: "Pracownicy",
    url: "/pracownicy",
  },
] as const;

export type MenuItem = (typeof menuItems)[number];
