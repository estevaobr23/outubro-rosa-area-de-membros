import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"], variable: "--fonte-titulo" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--fonte-corpo" });

export const metadata: Metadata = {
  title: { default: "Kit Outubro Rosa — Área de Membros", template: "%s · Kit Outubro Rosa" },
  description: "Cartinhas de força e acolhimento para a ação de Outubro Rosa.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fdf4f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
