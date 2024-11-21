"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen lg:flex-row overflow-hidden">
      <Sidebar className="hidden lg:flex" />
      <MobileNav className="lg:hidden" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header employeeName={user.name} />
        <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
