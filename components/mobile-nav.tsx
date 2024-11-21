"use client";

import { useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { menuItems } from "@/config/menu-items";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentTheme } = useTheme();
  const pathname = usePathname();

  return (
    <nav className={cn("border-b", className)}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: currentTheme.bg }}
      >
        <Image src="/logo.svg" alt="Logo" width={32} height={32} priority />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute left-0 right-0 z-50 border-b shadow-lg"
          style={{ backgroundColor: currentTheme.bg }}
        >
          {menuItems.map((item) => {
            const isActive = pathname === item.url;
            return (
              <Link
                key={item.label}
                href={item.url}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors",
                  isActive && "text-white"
                )}
                style={{
                  backgroundColor: isActive
                    ? currentTheme.primary
                    : "transparent",
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
