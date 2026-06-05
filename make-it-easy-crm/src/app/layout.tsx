import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Make It Easy CRM",
  description: "CRM de Make It Easy — Intelligent Automation. Gestión de leads, cotizaciones, proyectos y más.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* Always dark — matches the Stitch "Luminous Engine" design */
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} antialiased`}
        style={{ background: "var(--bg-workspace)", color: "var(--text-primary)" }}
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
