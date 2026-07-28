import type { Metadata } from "next";
import { Geist_Mono, Bebas_Neue, Montserrat } from "next/font/google";
import "./globals.css";

// Run functions next to the Supabase DB (Mumbai) instead of the US-East default,
// so every DB round trip is local instead of crossing the ocean.
export const preferredRegion = "bom1";

// Body face (portal redesign).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headings (Bebas Neue caps — portal redesign).
const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Premier Energies · Customer Service Portal",
  description:
    "Raise and track complaints for Premier Energies solar modules and cells.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${geistMono.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
