"use client";

import { redirect } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

const ProtectedRoute = ({ children, isAdmin = false }: ProtectedRouteProps) => {
  const { user } = useAuth();

  if (!user) {
    redirect("/login");
  }

  if (isAdmin && user.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
};

export default ProtectedRoute;
