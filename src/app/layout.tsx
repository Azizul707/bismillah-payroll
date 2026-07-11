import type { Metadata } from "next";
import "./globals.css";
import { GlobalToastProvider } from "@/components/global-toaster";

export const metadata: Metadata = {
  title: "বিসমিল্লাহ - স্যালারি ও এআই ম্যানেজমেন্ট",
  description: "বিসমিল্লাহ মিষ্টি প্রস্তুতকারক প্রতিষ্ঠানের অভ্যন্তরীণ ব্যবহার উপযোগী পে-রোল অ্যাপ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className="h-full antialiased"
    >
      <head>
        {/* Preconnect to Google Fonts origins — font download starts sooner than @import in CSS */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter + Tiro Bangla loaded via <link> instead of CSS @import for earlier discovery */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Tiro+Bangla:ital,wght@0,400;0,600;0,700;1,400;1,700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[--color-bg] text-[--color-foreground]">
        <GlobalToastProvider />
        {children}
      </body>
    </html>
  );
}
