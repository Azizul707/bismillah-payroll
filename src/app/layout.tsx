import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalToastProvider } from "@/components/global-toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* গ্লোবাল উইন্ডো অ্যালার্ট ইন্টারসেপ্টর ও টোস্ট রেন্ডারার */}
        <GlobalToastProvider />
        {children}
      </body>
    </html>
  );
}