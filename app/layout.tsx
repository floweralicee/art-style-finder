import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const artchiveFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-artchive",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.floweralice.me/artchive"
  ),
  title: "Artchive — Museum masterpieces into your brand's design language",
  description:
    "Find your perfect design identity from 500k+ works across the world's greatest museums.",
  openGraph: {
    title: "Artchive — Museum masterpieces into your brand's design language",
    description:
      "Find your perfect design identity from 500k+ works across the world's greatest museums.",
    siteName: "Artchive",
    type: "website",
    images: [
      {
        url: "opengraph-image",
        width: 1200,
        height: 630,
        alt: "Artchive — museum gallery preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Artchive — Museum masterpieces into your brand's design language",
    description:
      "Find your perfect design identity from 500k+ works across the world's greatest museums.",
    images: ["opengraph-image"],
  },
  icons: {
    icon: [{ url: "icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "apple-icon", type: "image/png", sizes: "180x180" }],
  },
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
