import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Art Archive — Art Style Finder",
  description: "Explore 500K+ public domain artworks from the world's greatest museums. Find color palettes and design inspiration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
