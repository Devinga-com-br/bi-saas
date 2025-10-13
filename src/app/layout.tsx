import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/contexts/tenant-context";
import { ThemeProvider } from "@/contexts/theme-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BI System - Business Intelligence",
  description: "Sistema de Business Intelligence SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}