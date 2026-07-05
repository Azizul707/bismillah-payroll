'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserCheck,
  CalendarX,
  Banknote,
  Sparkles,
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
    { label: 'সক্রিয় কর্মচারী', labelEn: 'Active Staff', value: stats.activeEmployees, suffix: 'জন', icon: UserCheck, color: 'text-[--color-success]', bg: 'bg-green-50' },
    { label: 'ছুটিতে', labelEn: 'On Leave', value: stats.leaveEmployees, suffix: 'জন', icon: CalendarX, color: 'text--color-warning', bg: 'bg-amber-50' },
    { label: `চলতি মাসের অগ্রিম`, labelEn: 'This Month Advances', value: formatCurrency(stats.totalAdvancesThisMonth), suffix: 'টাকা', icon: Banknote, color: 'text-amber-700', bg: 'bg-amber-50', isCurrency: true },
    { label: 'আনুমানিক বেতন বাজেট', labelEn: 'Est. Payroll Budget', value: formatCurrency(stats.estimatedSalaryThisMonth), suffix: 'টাকা', icon: Banknote, color: 'text-[--color-primary]', bg: 'bg-[--color-primary]/[0.06]', isCurrency: true },
    { label: 'AI পরামর্শ', labelEn: 'AI Insights', value: '৩', suffix: '', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-foreground-muted] font-body mb-1">{"আজকের সারাংশ"}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-[--color-foreground] font-bengali">{"ড্যাশবোর্ড"}</h1>
          <p className="text-sm text-[--color-foreground-muted] mt-1">
            {"আজ: "}{formattedToday}{" | "}{monthName}{" "}{currentYear}
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
            <div key={i} className="card card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-[--radius-sm] flex items-center justify-center ${metric.bg} ${metric.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="metric-value text-2xl md:text-3xl">
                <span className="font-body">{metric.value}</span>
                {metric.suffix && <span className="font-bengali text-lg md:text-xl text-[--color-foreground-muted] ml-1">{metric.suffix}</span>}
              </p>
              <p className="metric-label mt-1 font-bengali">{metric.label}</p>
              <p className="text-[11px] text-[--color-foreground-muted] mt-0.5 font-body">{metric.labelEn}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom panels grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leave List Panel */}
        <div className="lg:col-span-2 glass overflow-hidden">
          <div className="border-b border-[--color-border] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[--color-accent] font-bengali mb-1">{"অপেক্ষমান"}</p>
            <h2 className="text-lg font-semibold text-[--color-foreground] font-bengali">{"বর্তমানে ছুটিতে থাকা কর্মচারীদের তালিকা"}</h2>
          </div>
          {leaveList.length === 0 ? (
            <div className="p-8 text-center text-[--color-foreground-muted]">
              <p className="font-bengali font-semibold">{"বর্তমানে কোনো কর্মচারী ছুটিতে নেই।"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-raised] text-xs font-semibold text-[--color-foreground-muted]">
                    <th className="p-3 px-5">{"কর্মচারীর নাম"}</th>
                    <th className="p-3 px-5">{"ক্যাটাগরি"}</th>
                    <th className="p-3 px-5">{"ছুটি শুরুর তারিখ"}</th>
                    <th className="p-3 px-5">{"ছুটিতে থাকার সময়কাল"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border] text-sm">
                  {leaveList.map((emp) => (
                    <tr key={emp.id} className="transition-colors hover:bg-[--color-primary]/[0.02]">
                      <td className="p-3 px-5 font-semibold text-[--color-foreground] font-bengali">{emp.fullName}</td>
                      <td className="p-3 px-5">
                        <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 font-bengali">
                          {emp.categoryName}
                        </span>
                      </td>
                      <td className="p-3 px-5 text-[--color-foreground-muted] font-body">{formatDate(emp.startDate)}</td>
                      <td className="p-3 px-5 font-bold text-red-600 font-bengali">{`${emp.daysOnLeave} দিন যাবত`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        <div className="glass p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-accent] font-bengali mb-1">{"AI পরামর্শ"}</p>
          <h2 className="text-lg font-semibold text-[--color-foreground] font-bengali mb-4">{"পাঠকালীন সূচনা"}</h2>
          <div className="space-y-3">
            {[
              { icon: Sparkles, text: 'এই মাসে মোট অগ্রিমের পরিমাণ গত মাসের তুলনায় ১৫% বেশি হয়েছে, মনোযোগ দিন।', color: 'text-amber-700', bg: 'bg-amber-50' },
              { icon: Sparkles, text: '২ জন কর্মচারী presently on unpaid leave — check their return schedule.', color: 'text-purple-600', bg: 'bg-purple-50' },
              { icon: Sparkles, text: 'বেতন স্লিপ ডাউনলোডে নতুন পেমেন্ট ট্র্যাকিং ফিচার চালু হয়েছে।', color: 'text-[--color-success]', bg: 'bg-green-50' },
            ].map((insight, i) => (
              <div key={i} className={`rounded-[--radius-sm] ${insight.bg} p-3 flex gap-2.5`}>
                <insight.icon className={`h-4 w-4 ${insight.color} shrink-0 mt-0.5`} />
                <p className="text-xs font-semibold text-[--color-foreground] font-bengali leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised]/50 p-5">
        <h4 className="text-sm font-bold text-[--color-primary] font-bengali mb-2">{"সহজ নির্দেশিকা:"}</h4>
        <ul className="space-y-1.5 text-sm font-semibold text-[--color-foreground-muted] list-disc pl-5 font-bengali">
          <li>{"নতুন কর্মচারী যোগ করতে বাম পাশের মেনু থেকে কর্মচারী তালিকা-এ যান।"}</li>
          <li>{"প্রতি মাসের বেতন তৈরি করতে বেতন ও পে-রোল মেনু ব্যবহার করুন।"}</li>
          <li>{"মোবাইল থেকে দেখার সময় নিচের নেভিগেশัน বা মেনু বাটন ব্যবহার করুন।"}</li>
        </ul>
      </div>
    </div>
  );
}
