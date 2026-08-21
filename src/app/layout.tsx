import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ispatla — X haber sinyal odası",
  description: "Bağımsız XPatla haber araştırması, kalite kapısı ve x-use yayın kontrolü.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
