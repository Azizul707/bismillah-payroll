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
      <body className="min-h-full flex flex-col bg-[--color-bg] text-[--color-foreground]">
        <GlobalToastProvider />
        {children}
      </body>
    </html>
  );
}
