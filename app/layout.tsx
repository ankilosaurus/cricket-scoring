import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cricket Scorer",
  description: "Simple ball-by-ball cricket scoring service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
