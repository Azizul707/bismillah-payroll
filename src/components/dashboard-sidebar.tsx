'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Layers, 
  CreditCard, 
  FileText, 
  History, 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard 
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // সম্পূর্ণ বাংলায় মেনুসমূহ
  const menuItems: SidebarItem[] = [
    { name: 'ড্যাশবোর্ড', path: '/dashboard', icon: LayoutDashboard },
    { name: 'কর্মচারী তালিকা', path: '/dashboard/employees', icon: Users },
    { name: 'ক্যাটাগরি সমূহ', path: '/dashboard/employees/categories', icon: Layers },
    { name: 'বেতন ও পে-রোল', path: '/dashboard/payroll', icon: CreditCard },
    { name: 'মালিক রিপোর্ট', path: '/dashboard/reports', icon: FileText },
    { name: 'পরিবর্তন লগ (Audit)', path: '/dashboard/audit-logs', icon: History },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* মোবাইল হেডার (মোবাইল-ফার্স্ট ডিজাইন) */}
      <header className="flex h-16 items-center justify-between border-b bg-[#8B0000] px-4 text-white md:hidden">
        <span className="text-xl font-bold tracking-wider">বিসমিল্লাহ</span>
        <button 
          onClick={toggleSidebar} 
          className="rounded-md p-1 hover:bg-[#F4C430] hover:text-black focus:outline-none"
          aria-label="মেনু খুলুন"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* মোবাইল ব্যাকড্রপ (মোবাইল ওভারলে) */}
      {isOpen && (
        <div 
          onClick={toggleSidebar} 
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* সাইডবার মেনু মেইন বডি */}
      <aside className={`
        fixed bottom-0 top-16 z-50 flex w-64 flex-col border-r bg-white transition-transform duration-300 md:top-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:sticky md:h-screen md:translate-x-0 md:z-30
      `}>
        {/* ডেক্সটপ লোগো এরিয়া */}
        <div className="hidden h-20 items-center justify-center border-b bg-[#8B0000] md:flex">
          <h1 className="text-2xl font-black tracking-widest text-white">বিসমিল্লাহ</h1>
        </div>

        {/* নেভিগেশন লিংকসমূহ */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-4 py-3.5 text-base font-bold transition-all duration-150
                  ${isActive 
                    ? 'bg-[#8B0000] text-white shadow-md' 
                    : 'text-gray-700 hover:bg-[#F4C430]/20 hover:text-black'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-[#F4C430]' : 'text-gray-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* সাইডবার নিচে লগআউট বাটন */}
        <div className="border-t p-4">
          <button
            onClick={() => {
              // লগআউট লজিক এখানে সংযুক্ত করা হবে
              alert('লগআউট করা হচ্ছে...');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-bold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span>লগআউট করুন</span>
          </button>
        </div>
      </aside>
    </>
  );
}