import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";
import { ConfigBanner } from "@/components/ConfigBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-chakra" });

export const metadata: Metadata = {
  title: { default: "Score Engine — Smash Karts Tournaments", template: "%s · Score Engine" },
  description: "Host Smash Karts solo and team tournaments, track kills and climb the leaderboard. AI reads your match screenshots.",
};

export const viewport: Viewport = { themeColor: "#07070c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${chakra.variable}`}>
      <body>
        <Background />
        <ToastProvider>
          <AuthProvider>
            <ConfigBanner />
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pt-12">{children}</main>
            <footer className="border-t border-line py-8 text-center text-xs text-muted">
              Score Engine — an unofficial community tournament tracker. Not affiliated with Smash Karts.
            </footer>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
