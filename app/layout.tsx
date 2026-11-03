import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Biryani Darbaar",
  description: "Hyderabadi biryani, ordered direct.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <CartProvider>
          <Suspense fallback={null}>
            <AppShell>
              <Header />
              {children}
              <BottomNav />
            </AppShell>
          </Suspense>
        </CartProvider>
      </body>
    </html>
  );
}