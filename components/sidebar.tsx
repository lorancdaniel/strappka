"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import Image from "next/image";
import { menuItems } from "@/config/menu-items";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "w-24 h-full flex flex-col items-center py-4 shrink-0 bg-background border-r",
        className
      )}
    >
      <Link href="/" className="mb-10 hover:opacity-80 transition-opacity">
        <Image src="/logo.svg" alt="Logo" width={40} height={40} priority />
      </Link>
      <nav className="flex flex-col w-full">
        {menuItems
          .filter((item) => item.roles.includes(user?.role || "user"))
          .map((item) => {
            const isActive = pathname === item.url;
            return (
              <Link
                key={item.label}
                href={item.url}
                className={cn(
                  "flex flex-col items-center justify-center w-full py-4 text-muted-foreground transition-all hover:text-foreground relative group",
                  isActive && "text-foreground"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 transition-colors",
                    isActive && "bg-primary"
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    !isActive && "bg-accent"
                  )}
                />
                <div className="relative z-10 flex flex-col items-center">
                  <item.icon className="w-6 h-6 mb-2" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
