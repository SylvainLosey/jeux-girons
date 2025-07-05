import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Navbar } from "./_components/navbar";
import { AdminProvider } from "./_components/navbar";
import { Footer } from "./_components/footer";
import { Toaster } from "~/components/ui/sonner";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Jeux Murist 25",
  description: "Site officiel des Jeux de Murist 2025",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <AdminProvider>
            <Navbar />
            {children}
            <Footer />
            <Toaster />
          </AdminProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
