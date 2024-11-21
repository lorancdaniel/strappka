import { ThemeProvider } from "@/components/providers/theme-provider";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Panel administracyjny",
  description: "Panel administracyjny aplikacji",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="flex flex-col h-screen lg:flex-row overflow-hidden">
            <Sidebar className="hidden lg:flex" />
            <MobileNav className="lg:hidden" />
            <div className="flex flex-col flex-1 overflow-hidden">
              <Header employeeName="Jan Kowalski" />
              <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
