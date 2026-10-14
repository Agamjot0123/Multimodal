import type { Metadata } from "next";
import { Bricolage_Grotesque, Fraunces, Newsreader } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-fraunces", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap" });

export const metadata: Metadata = {
  title: "AnchorLearn: Cited AI Tutor",
  description: "Adaptive tutoring grounded in your lecture videos, slides and textbooks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${bricolage.variable} ${newsreader.variable} ${fraunces.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
