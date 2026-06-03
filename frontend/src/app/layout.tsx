import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VidioMetrics AI | Social Video Analysis",
  description: "Advanced RAG-based AI to analyze and compare social media videos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white" suppressHydrationWarning>
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
