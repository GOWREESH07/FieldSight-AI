import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldSight — Warehouse Safety & Damage Prevention",
  description: "AI video intelligence platform for warehouse handling and damage prevention.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
