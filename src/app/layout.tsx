import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eleMENTAL — Periodic Table Drag & Drop",
  description:
    "A sleek, snappy periodic-table learning game. Drag element cards into the right slot, build streaks, and master all 118.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
