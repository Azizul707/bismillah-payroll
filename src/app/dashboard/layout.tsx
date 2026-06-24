import React from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:flex-row">
      {/* বাম পাশে সাইডবার */}
      <DashboardSidebar />

      {/* ডান পাশে মূল কনটেন্ট এরিয়া */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mx-auto max-w-7xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}