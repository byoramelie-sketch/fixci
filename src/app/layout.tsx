import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-corps",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-titre",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FixCI — Trouvez un artisan de confiance",
  description:
    "La marketplace de confiance des services à domicile en Côte d'Ivoire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}