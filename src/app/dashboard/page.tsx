'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserCheck,
  CalendarX,
  Banknote,
  RefreshCw,
} from 'lucide-react';
import { db } from '@/app/lib/supabase/client';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  leaveEmployees: number;
  totalAdvancesThisMonth: number;
  estimatedSalaryThisMonth: number;
}

interface LeaveEmployeeInfo {
  id: string;
  fullName: string;
  categoryName: string;
  startDate: string;
  daysOnLeave: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
}

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState('06');
  const [currentYear, setCurrentYear] = useState('2026');
  const [formattedToday, setFormattedToday] = useState('24-06-2026');
  const [monthName, setMonthName] = useState('জুন');

  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    leaveEmployees: 0,
    totalAdvancesThisMonth: 0,
    estimatedSalaryThisMonth: 0,
  });

  const [leaveList, setLeaveList] = useState<LeaveEmployeeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    return isNaN(num) ? '0' : num.toLocaleString('en-US');
  };

  const loadDashboardData = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);

      const { data: employees, error: empError } = await db.employees()
        .select('id, status, monthly_salary')
        .eq('is_deleted', false);
      if (empError) throw empError;

      const totalEmp = employees?.length || 0;
      const activeEmp = employees?.filter(e => e.status === 'active').length || 0;
      const leaveEmp = employees?.filter(e => e.status === 'leave').length || 0;

      const { data: advances, error: advError } = await db.salary_advances()
        .select('amount')
        .eq('advance_month', currentMonth)
        .eq('advance_year', currentYear)
        .eq('is_deleted', false);
      if (advError) throw advError;

      const totalAdvances = (advances || []).reduce((sum, item) => sum + Number(item.amount), 0);
      const totalSalaryBudget = (employees || []).reduce((sum, item) => sum + Number(item.monthly_salary), 0);

      setStats({
        totalEmployees: totalEmp,
        activeEmployees: activeEmp,
        leaveEmployees: leaveEmp,
        totalAdvancesThisMonth: totalAdvances,
        estimatedSalaryThisMonth: totalSalaryBudget,
      });

      const { data: leaveEmployeesData, error: leaveErr } = await db.employees()
        .select(`
          id,
          full_name,
          categories(
            category_name
          ),
          employee_status_history(
            start_date,
            status
          )
        `)
        .eq('status', 'leave')
        .eq('is_deleted', false);

      if (leaveErr) throw leaveErr;

      const typedLeaveData = leaveEmployeesData as unknown as {
        id: string;
        full_name: string;
        categories: { category_name: string } | null;
        employee_status_history: { start_date: string; status: string }[] | null;
      }[];

      const parsedLeaves: LeaveEmployeeInfo[] = (typedLeaveData || []).map((emp) => {
        const leaveHistory = (emp.employee_status_history || [])
          .filter((h) => h.status === 'leave')
          .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

        const startDate = leaveHistory[0]?.start_date || new Date().toISOString().split('T')[0];
        const today = new Date();
        const startDateObj = new Date(startDate);
        const diffTime = today.getTime() - startDateObj.getTime();
        const daysCount = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysOnLeave = Math.max(0, daysCount);

        return {
          id: emp.id,
          fullName: emp.full_name,
          categoryName: emp.categories?.category_name || 'N/A',
          startDate,
          daysOnLeave,
        };
      });

      setLeaveList(parsedLeaves);

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (active) {
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = String(now.getFullYear());

        const monthsList = [
          'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
          'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];

        setFormattedToday(`${d}-${m}-${y}`);
        setCurrentMonth(m);
        setCurrentYear(y);
        setMonthName(monthsList[now.getMonth()]);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadDashboardData();
      }
    })();
    return () => { active = false; };
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[--color-primary] border-t-transparent mx-auto" />
          <p className="mt-4 text-base font-semibold text-[--color-foreground-muted]">{"তথ্য লোড করা হচ্ছে..."}</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'মোট কর্মচারী', labelEn: 'Total Employees', value: stats.totalEmployees, suffix: 'জন', icon: Users, color: 'text-[--color-primary]', bg: 'bg-[--color-primary]/[0.08]' },
    { label: 'সক্রিয় কর্মচারী', labelEn: 'Active Staff', value: stats.activeEmployees, suffix: 'জন', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'ছুটিতে', labelEn: 'On Leave', value: stats.leaveEmployees, suffix: 'জন', icon: CalendarX, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: `চলতি মাসের অগ্রিম`, labelEn: 'This Month Advances', value: formatCurrency(stats.totalAdvancesThisMonth), suffix: 'টাকা', icon: Banknote, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'আনুমানিক বেতন বাজেট', labelEn: 'Est. Payroll Budget', value: formatCurrency(stats.estimatedSalaryThisMonth), suffix: 'টাকা', icon: Banknote, color: 'text-rose-700', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-block w-1 h-6 rounded-full bg-[--color-primary]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[--color-foreground-muted] font-body">{"আজকের সারাংশ"}</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[--color-foreground] font-bengali">{"ড্যাশবোর্ড"}</h1>
          <p className="text-sm text-[--color-foreground-muted] mt-1 flex items-center gap-1.5">
            <span className="inline-block w-4 h-px bg-[--color-border]" />
            {"আজ: "}<span className="font-body font-semibold text-[--color-foreground]">{formattedToday}</span>
            <span className="text-[--color-border]">|</span>
            <span className="font-bengali">{monthName}</span>
            <span className="font-body">{currentYear}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn self-start"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="font-bengali">{"রিফ্রেশ"}</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl border border-[--color-border] bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${metric.bg} ${metric.color} ring-1 ring-inset ring-black/[0.03] group-hover:scale-110 group-hover:shadow-sm transition-all duration-300`}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${metric.color} opacity-60`}>
                  {`0${i + 1}`}
                </span>
              </div>
              <p className="metric-value text-3xl md:text-4xl tracking-tight">
                <span className="font-body">{metric.value}</span>
                {metric.suffix && <span className="font-bengali text-lg md:text-xl text-[--color-foreground-muted] ml-1.5">{metric.suffix}</span>}
              </p>
              <p className="font-bengali text-sm font-semibold text-[--color-foreground] mt-1.5">{metric.label}</p>
              <p className="text-[11px] text-[--color-foreground-muted] mt-0.5 font-body">{metric.labelEn}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom panels grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leave List Panel */}
        <div className="lg:col-span-2 rounded-xl border border-[--color-border] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-[--color-border]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 font-bengali mb-0.5">{"অপেক্ষমান"}</p>
              <h2 className="text-lg font-semibold text-[--color-foreground] font-bengali">{"বর্তমানে ছুটিতে থাকা কর্মচারীদের তালিকা"}</h2>
            </div>
            {leaveList.length > 0 && (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 font-bold text-sm font-body">
                {leaveList.length}
              </span>
            )}
          </div>
          {leaveList.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <UserCheck className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-bengali font-semibold text-[--color-foreground] text-base">{"বর্তমানে কোনো কর্মচারী ছুটিতে নেই"}</p>
              <p className="text-sm text-[--color-foreground-muted] mt-1 font-bengali">{"সকল কর্মচারী সক্রিয়ভাবে কাজ করছেন"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[--color-border] bg-gray-50/80 text-xs font-semibold text-[--color-foreground-muted] uppercase tracking-wider">
                    <th className="p-3.5 px-5 font-body">{"কর্মচারীর নাম"}</th>
                    <th className="p-3.5 px-5 font-body">{"ক্যাটাগরি"}</th>
                    <th className="p-3.5 px-5 font-body">{"ছুটি শুরুর তারিখ"}</th>
                    <th className="p-3.5 px-5 font-body">{"সময়কাল"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]/60 text-sm">
                  {leaveList.map((emp) => (
                    <tr key={emp.id} className="transition-colors hover:bg-amber-50/40 group">
                      <td className="p-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-[--color-primary]/[0.08] text-[--color-primary] flex items-center justify-center font-bold text-xs font-body shrink-0 group-hover:scale-110 transition-transform duration-200">
                            {emp.fullName.charAt(0)}
                          </span>
                          <span className="font-semibold text-[--color-foreground] font-bengali">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="p-3.5 px-5">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/60 font-bengali">
                          {emp.categoryName}
                        </span>
                      </td>
                      <td className="p-3.5 px-5 text-[--color-foreground-muted] font-body">{formatDate(emp.startDate)}</td>
                      <td className="p-3.5 px-5">
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600 font-bengali">
                          <CalendarX className="h-3.5 w-3.5" />
                          {`${emp.daysOnLeave} দিন`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

            {/* Quick tips banner */}
      <div className="rounded-xl border border-[--color-border] bg-gradient-to-r from-[--color-primary]/[0.03] via-white to-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[--color-primary]/[0.08] flex items-center justify-center shrink-0">
            <span className="text-[--color-primary] font-bold text-sm font-body">i</span>
          </div>
          <p className="text-sm text-[--color-foreground-muted] font-bengali leading-relaxed">
            {"সহায়িকা: "}
            <span className="text-[--color-foreground] font-semibold">{"নতুন কর্মচারী"}</span>
            {" যোগ করতে "}
            <span className="text-[--color-primary] font-semibold">{"কর্মচারী তালিকা"}</span>
            {" > প্রতি মাসের বেতনের জন্য "}
            <span className="text-[--color-primary] font-semibold">{"বেতন ও পে-রোল"}</span>
            {" > মোবাইলে নিচের মেনু ব্যবহার করুন"}
          </p>
        </div>
      </div>
    </div>
  );
}
