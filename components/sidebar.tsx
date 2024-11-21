"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import Image from "next/image";
import { menuItems } from "@/config/menu-items";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const { currentTheme } = useTheme();
  const pathname = usePathname();

  return (
    <aside
      className="w-24 h-full flex flex-col items-center py-4 shrink-0"
      style={{ backgroundColor: currentTheme.bg }}
    >
      <div className="mb-10">
        <Image src="/logo.svg" alt="Logo" width={40} height={40} priority />
      </div>
      <nav className="flex flex-col w-full">
        {menuItems.map((item) => {
          const isActive = pathname === item.url;

          return (
            <Link
              key={item.label}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center w-full py-4 text-gray-400 transition-all hover:text-white relative group",
                isActive && "text-white"
              )}
            >
              <div
                className="absolute inset-0 transition-colors"
                style={{
                  backgroundColor: isActive
                    ? currentTheme.primary
                    : "transparent",
                }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: !isActive
                    ? currentTheme.hoverBg
                    : "transparent",
                }}
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
