import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Toaster from "@/components/Toaster";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const title = "CorrectSlip";
const description =
  "Tiered football predictions priced in naira — free daily spotlight pick, paid unlocks for Single, Accumulator, Banker and Correct Score tiers.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <Toaster />
        {children}
        <footer className="site">
          CorrectSlip — analysis and predictions, not financial advice. Results are historical, not
          guaranteed. Bet only what you can afford to lose.
        </footer>
      </body>
    </html>
  );
}
