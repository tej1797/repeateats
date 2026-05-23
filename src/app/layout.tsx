// Root layout — wraps every page.
// next/font loads Google Fonts at build time (no extra network request in the browser).
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
import "./globals.css";

// Body font: Plus Jakarta Sans (weights used in the HTML prototype)
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",   // CSS variable so Tailwind can reference it
  display: "swap",
});

// Display / heading font: Syne (used for the logo, h1, h2, h3)
const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepEAT — Local Restaurant Deals",
  description:
    "Discover weekly promotions from local restaurants across Ontario. No delivery fees — just show your QR code at the door.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Attach font CSS variables to <html> so globals.css can use them
    <html lang="en" className={`${plusJakarta.variable} ${syne.variable}`}>
      <body>{children}</body>
    </html>
  );
}
