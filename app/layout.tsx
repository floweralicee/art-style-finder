import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const artchiveFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-artchive",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Artchive — Museum masterpieces into your brand's design language",
  description: "Find your perfect design identity from 500k+ works across the world's greatest museums.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${artchiveFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
