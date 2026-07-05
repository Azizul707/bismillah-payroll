import { DashboardLayoutClient } from '@/components/dashboard-layout-client';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardLayoutProps) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
