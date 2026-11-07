import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { InboxProvider } from "@/lib/inbox";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import WelcomeGuide from "@/components/WelcomeGuide";

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
            <InboxProvider>
              <AppShell>
                <Header />
                {children}
                <BottomNav />
              </AppShell>
              <WelcomeGuide />
            </InboxProvider>
          </Suspense>
        </CartProvider>
      </body>
    </html>
  );
}