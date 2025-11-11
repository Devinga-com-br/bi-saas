import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/contexts/tenant-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DevIngá - Business Intelligence",
  description: "Sistema de Business Intelligence SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`} suppressHydrationWarning>
        <ThemeProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}