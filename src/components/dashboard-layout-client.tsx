'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Layers,
  CreditCard,
  FileText,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
}

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  const menuItems: SidebarItem[] = [
    { name: 'ড্যাশবোর্ড', path: '/dashboard', icon: LayoutDashboard },
    { name: 'কর্মচারী তালিকা', path: '/dashboard/employees', icon: Users },
    { name: 'ক্যাটাগরি সমূহ', path: '/dashboard/employees/categories', icon: Layers },
    { name: 'বেতন ও পে-রোল', path: '/dashboard/payroll', icon: CreditCard },
    { name: 'মাসিক রিপোর্ট', path: '/dashboard/reports', icon: FileText },
    { name: 'পরিবর্তন লগ', path: '/dashboard/audit-logs', icon: History },
  ];

  // Load user from localStorage (Next.js 15 deferral pattern)
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (active) {
        try {
          const raw = localStorage.getItem('bismillah_current_user');
          if (raw) {
            setCurrentUser(JSON.parse(raw));
          }
        } catch (e) {
          console.error('Error loading user session:', e);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    const confirmLogout = confirm('আপনি কি নিশ্চিত যে লগআউট করতে চান?');
    if (!confirmLogout) return;
    localStorage.removeItem('bismillah_current_user');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[--color-bg]">
      {/* ============ DESKTOP SIDEBAR ============ */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[260px] flex-col border-r border-[--color-border] bg-[--color-surface] z-30">
        {/* Logo */}
        <div className="flex h-20 items-center justify-center border-b border-[--color-border]">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-3.5 h-3.5 rounded-sm bg-[--color-primary]" />
            <h1 className="font-bengali text-xl font-bold text-[--color-primary]">{"বিসমিল্লাহ"}</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={true}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[--color-primary]' : 'text-[--color-foreground-muted]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        {currentUser && (
          <div className="p-3 border-t border-[--color-border]">
            <div className="flex items-center gap-3 rounded-lg bg-[--color-surface-raised] p-2.5">
              <div className="w-9 h-9 rounded-full bg-[--color-primary] flex items-center justify-center text-white font-body text-sm font-semibold shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[--color-foreground] truncate">{currentUser.name}</p>
                <p className="text-[11px] font-medium text-[--color-foreground-muted]">
                  {currentUser.role === 'owner' ? 'মালিক / Owner' : 'ম্যানেজার / Manager'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="p-3 border-t border-[--color-border]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-[--color-danger] transition-colors hover:bg-[--color-surface-raised] cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-bengali">{"লগআউট"}</span>
          </button>
        </div>
      </aside>

      {/* ============ MOBILE SIDEBAR OVERLAY ============ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Mobile aside */}
      <aside
        className={`fixed bottom-0 top-[56px] z-50 w-64 flex-col border-r border-[--color-border] bg-[--color-surface] transition-transform duration-200 lg:hidden ${
          isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'
        }`}
      >
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={true}
                onClick={() => setIsSidebarOpen(false)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[--color-primary]' : 'text-[--color-foreground-muted]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {currentUser && (
          <div className="p-3 border-t border-[--color-border]">
            <div className="flex items-center gap-3 rounded-lg bg-[--color-surface-raised] p-2.5">
              <div className="w-9 h-9 rounded-full bg-[--color-primary] flex items-center justify-center text-white font-body text-sm font-semibold shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[--color-foreground] truncate">{currentUser.name}</p>
                <p className="text-[11px] font-medium text-[--color-foreground-muted]">
                  {currentUser.role === 'owner' ? 'মালিক / Owner' : 'ম্যানেজার / Manager'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-[--color-border]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-[--color-danger] transition-colors hover:bg-[--color-surface-raised] cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-bengali">{"লগআউট"}</span>
          </button>
        </div>
      </aside>

      {/* ============ MAIN WRAPPER ============ */}
      <div className="lg:ml-[260px]">
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[--color-border] bg-[--color-surface]/95 px-4 backdrop-blur-md">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-1.5 text-[--color-foreground] hover:bg-[--color-surface-raised] cursor-pointer"
            aria-label="মেনু খুলুন"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[--color-primary]" />
            <span className="font-bengali text-lg font-bold text-[--color-primary]">{"বিসমিল্লাহ"}</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* ============ MOBILE BOTTOM NAVIGATION ============ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[--color-border] pb-[env(safe-area-inset-bottom)]" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <div className="flex justify-around items-center h-14">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={true}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg transition-all duration-150 active:scale-90 ${
                  isActive ? 'text-[--color-primary]' : 'text-[--color-foreground-muted]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-bengali text-[0.65rem] font-medium leading-none">{item.name}</span>
                {isActive && (
                  <span className="mt-0.5 block h-[2px] w-4 rounded-full bg-[--color-primary]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
