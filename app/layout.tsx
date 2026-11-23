import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AMS Tools",
  description: "Pencatatan invoice, surat jalan, dan piutang",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AMS Tools",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/images/favicon.ico",
    apple: "/images/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3A6D94",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
