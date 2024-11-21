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
  const { theme } = useTheme();
  const pathname = usePathname();

  return (
    <nav className={cn("border-b bg-background", className)}>
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="Logo" width={32} height={32} priority />
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 border-b shadow-lg bg-background">
          {menuItems.map((item) => {
            const isActive = pathname === item.url;
            return (
              <Link
                key={item.label}
                href={item.url}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground transition-colors",
                  isActive && "bg-accent text-foreground"
                )}
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
