'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  // সম্পূর্ণ বাংলায় মেনুসমূহ
  const menuItems: SidebarItem[] = [
    { name: 'ড্যাশবোর্ড', path: '/dashboard', icon: LayoutDashboard },
    { name: 'কর্মচারী তালিকা', path: '/dashboard/employees', icon: Users },
    { name: 'ক্যাটাগরি সমূহ', path: '/dashboard/employees/categories', icon: Layers },
    { name: 'বেতন ও পে-রোল', path: '/dashboard/payroll', icon: CreditCard },
    { name: 'মালিক রিপোর্ট', path: '/dashboard/reports', icon: FileText },
    { name: 'পরিবর্তন লগ (Audit)', path: '/dashboard/audit-logs', icon: History },
  ];

  // লোকাল সেশন থেকে কারেন্ট ইউজারের নাম ও রোল লোড করা
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (active) {
        const userStr = localStorage.getItem('bismillah_current_user');
        if (userStr) {
          try {
            setCurrentUser(JSON.parse(userStr));
          } catch (e) {
            console.error('Error loading session user:', e);
          }
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // লগআউট হ্যান্ডলার লজিক (নিরাপদে সেশন ক্লিয়ার করে রিডাইরেক্ট করে)
  const handleLogout = () => {
    const confirmLogout = confirm('আপনি কি নিশ্চিত যে লগআউট করতে চান?');
    if (!confirmLogout) return;

    localStorage.removeItem('bismillah_current_user');
    setIsOpen(false);
    
    // পুনরায় রুট লগইন পেজে পাঠিয়ে দেওয়া এবং ব্রাউজার সেশন ফ্রেশ করা
    router.push('/');
  };

  return (
    <>
      {/* মোবাইল হেডার (মোবাইল-ফার্স্ট ডিজাইন) */}
      <header className="flex h-16 items-center justify-between border-b bg-[#8B0000] px-4 text-white md:hidden">
        <span className="text-xl font-bold tracking-wider">{"বিসমিল্লাহ"}</span>
        <button 
          onClick={toggleSidebar} 
          className="rounded-md p-1 hover:bg-[#F4C430] hover:text-black focus:outline-none cursor-pointer"
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
          <h1 className="text-2xl font-black tracking-widest text-white">{"বিসমিল্লাহ"}</h1>
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

        {/* প্রবেশকৃত ইউজারের প্রোফাইল ব্যাজ */}
        {currentUser && (
          <div className="mx-4 mb-2 p-3 rounded-lg bg-gray-50 border border-gray-100 flex flex-col gap-1 animate-in fade-in duration-200">
            <span className="text-xs font-bold text-gray-400">{"প্রবেশকৃত ইউজার:"}</span>
            <span className="text-sm font-black text-gray-900">{currentUser.name}</span>
            <span className="inline-block text-[10px] font-black w-fit px-2.5 py-0.5 rounded-full bg-[#8B0000]/10 text-[#8B0000]">
              {currentUser.role === 'owner' ? 'মালিক (Owner)' : 'ম্যানেজার (Manager)'}
            </span>
          </div>
        )}

        {/* সাইডবার নিচে লগআউট বাটন */}
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-bold text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            <span>{"লগআউট করুন"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}