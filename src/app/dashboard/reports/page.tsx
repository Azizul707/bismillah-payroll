'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DollarSign, Users, Briefcase, Printer, SlidersHorizontal } from 'lucide-react';
import { db } from '@/app/lib/supabase/client';
import { PayrollItem } from '@/app/lib/supabase/types';

interface ReportItem extends PayrollItem {
  employees: {
    full_name: string;
    employee_code: string;
    branches: { branch_name: string } | null;
    categories: { category_name: string } | null;
  } | null;
}

// পেজ রিফ্রেশের পরেও ব্যবহারকারীর নির্বাচিত মাস/বছর মনে রাখার জন্য লোকাল স্টোরেজ কী
const REPORT_MONTH_KEY = 'bismillah_report_month';
const REPORT_YEAR_KEY = 'bismillah_report_year';

// লোকাল স্টোরেজ থেকে সংরক্ষিত মাস/বছর পড়া (না থাকলে বর্তমান মাস ডিফল্ট)
function getInitialReportMonth(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(REPORT_MONTH_KEY);
    if (saved) return saved;
  }
  return String(new Date().getMonth() + 1).padStart(2, '0');
}
function getInitialReportYear(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(REPORT_YEAR_KEY);
    if (saved) return saved;
  }
  return String(new Date().getFullYear());
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getInitialReportMonth());
  const [selectedYear, setSelectedYear] = useState<string>(getInitialReportYear());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoriesList, setCategoriesList] = useState<{ id: string; category_name: string }[]>([]);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const bengaliMonths = [
    { code: '01', name: 'জানুয়ারি' },
    { code: '02', name: 'ফেব্রুয়ারি' },
    { code: '03', name: 'মার্চ' },
    { code: '04', name: 'এপ্রিল' },
    { code: '05', name: 'মে' },
    { code: '06', name: 'জুন' },
    { code: '07', name: 'জুলাই' },
    { code: '08', name: 'আগস্ট' },
    { code: '09', name: 'সেপ্টেম্বর' },
    { code: '10', name: 'অক্টোবর' },
    { code: '11', name: 'নভেম্বর' },
    { code: '12', name: 'ডিসেম্বর' },
  ];

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    return isNaN(num) ? '0' : num.toLocaleString('en-US');
  };

  // ১. ক্যাটাগরির তালিকা লোড করার মেমোইজড ফাংশন
  const loadCategories = useCallback(async () => {
    await Promise.resolve();
    try {
      const { data, error } = await db.categories()
        .select('id, category_name')
        .eq('is_deleted', false);
      if (!error && data) {
        setCategoriesList(data as { id: string; category_name: string }[]);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  // ২. রিপোর্ট ডাটা লোড করার মেমোইজড ফাংশন
  const loadReportData = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);

      const { data: payrollData, error: pErr } = await db.payrolls()
        .select('id')
        .eq('payroll_month', selectedMonth)
        .eq('payroll_year', selectedYear)
        .maybeSingle();

      if (pErr) throw pErr;

      if (payrollData) {
        const { data: itemsData, error: itemsErr } = await db.payroll_items()
          .select(`
            *,
            employees(
              full_name,
              employee_code,
              branches(branch_name),
              categories(category_name)
            )
          `)
          .eq('payroll_id', payrollData.id);

        if (itemsErr) throw itemsErr;
        setReportItems((itemsData as unknown as ReportItem[]) || []);
      } else {
        setReportItems([]);
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // মাস/বছর পরিবর্তন হলে লোকাল স্টোরেজে সংরক্ষণ করা (রিফ্রেশের পরেও মনে রাখবে)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPORT_MONTH_KEY, selectedMonth);
      localStorage.setItem(REPORT_YEAR_KEY, selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadCategories();
        await loadReportData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadReportData, loadCategories]);

  const filteredReportItems = reportItems.filter((item: ReportItem) => {
    if (selectedCategory === 'all') return true;
    return item.employees?.categories?.category_name === selectedCategory;
  });

  const totalNetSalary = filteredReportItems.reduce((acc: number, item: ReportItem) => acc + Number(item.net_salary), 0);
  const totalAdvances = filteredReportItems.reduce((acc: number, item: ReportItem) => acc + Number(item.advance_deducted), 0);
  const totalActiveEmployees = filteredReportItems.length;

  const currentMonthName = bengaliMonths.find(m => m.code === selectedMonth)?.name || '';

  return (
    <div className="space-y-6 font-normal antialiased">
      {/* প্রিন্ট পিডিএফ এর জন্য এক্সক্লুসিভ হেডার */}
      <div className="hidden print-only text-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold text-[--color-foreground] font-bengali">{"মাসিক বেতন রিপোর্ট"}</h1>
        <p className="text-base text-[--color-foreground-muted] mt-1">
          {"মাস: "} {currentMonthName} {" | বছর: "} {selectedYear}
        </p>
      </div>

      {/* স্ক্রিন হেডার */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[--color-foreground]">{"মাসিক রিপোর্ট"}</h1>
          <p className="text-sm font-semibold text-[--color-foreground-muted] mt-1">{"ব্যবসায়িক খরচ ও মোট বেতনের মাসিক সংক্ষিপ্ত বিবরণ"}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-accent flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold"
        >
          <Printer className="h-4.5 w-4.5" />
          <span>{"রিপোর্ট প্রিন্ট করুন"}</span>
        </button>
      </div>

      {/* ফিল্টার এবং ক্যাটাগরি ফিল্টার এরিয়া */}
      <div className="glass p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-base font-bold no-print">
        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-sm text-[--color-foreground-muted]">{"হিসাবের মাস"}</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field font-bold focus:outline-none"
          >
            {bengaliMonths.map(m => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-sm text-[--color-foreground-muted]">{"হিসাবের বছর"}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="input-field font-bold focus:outline-none"
          >
            <option value="2026">{"2026"}</option>
            <option value="2027">{"2027"}</option>
          </select>
        </div>

        {/* ক্যাটাগরি ফিল্টার ড্রপডাউন */}
        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-sm text-[--color-foreground-muted]">{"ক্যাটাগরি ফিল্টার"}</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field pl-8 pr-4 p-2.5 font-bold focus:outline-none appearance-none"
            >
              <option value="all">{"সকল ক্যাটাগরি"}</option>
              {categoriesList.map(c => (
                <option key={c.id} value={c.category_name}>{c.category_name}</option>
              ))}
            </select>
            <SlidersHorizontal className="absolute left-2.5 top-3.5 h-4 w-4 text-[--color-foreground-muted] shrink-0" />
          </div>
        </div>
      </div>

      {/* সারাংশ কার্ডসমূহ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
        <div className="card flex items-center gap-4">
          <div className="rounded-full bg-[--color-primary]/[0.08] p-3.5 text-[--color-primary]">
            <DollarSign className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-[--color-foreground-muted] font-bengali">{"মোট নিট বেতন পরিশোধ"}</p>
            <h3 className="text-lg font-bold text-[--color-foreground] mt-0.5"><span className="font-body">{formatCurrency(totalNetSalary)}</span> {"টাকা"}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="rounded-full bg-[--color-accent]/[0.08] p-3.5 text-[--color-accent-dark]">
            <Briefcase className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-[--color-foreground-muted] font-bengali">{"মোট অগ্রিম বেতন সমন্বয়"}</p>
            <h3 className="text-lg font-bold text-[--color-foreground] mt-0.5"><span className="font-body">{formatCurrency(totalAdvances)}</span> {"টাকা"}</h3>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="rounded-full bg-[--color-primary]/[0.08] p-3.5 text-[--color-primary]">
            <Users className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-[--color-foreground-muted] font-bengali">{"বেতন প্রাপ্য মোট কর্মচারী"}</p>
            <h3 className="text-lg font-bold text-[--color-foreground] mt-0.5"><span className="font-body">{totalActiveEmployees}</span> {"জন"}</h3>
          </div>
        </div>
      </div>

      {/* রিপোর্ট তালিকা টেবিল */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--color-primary] border-t-transparent mx-auto"></div>
        </div>
      ) : filteredReportItems.length === 0 ? (
        <p className="text-center font-bold text-[--color-foreground-muted] py-12">{"এই ক্যাটাগরির কোনো হিসেব এখনও তৈরি করা হয়নি।"}</p>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-[--color-surface-raised] text-xs font-bold text-[--color-foreground]">
                <th className="p-4 font-bengali">{"কর্মচারী"}</th>
                <th className="p-4 font-bengali">{"ক্যাটাগরি"}</th>
                <th className="p-4 font-bengali">{"মূল বেতন"}</th>
                <th className="p-4 font-bengali">{"ডিউটি দিন"}</th>
                <th className="p-4 font-bengali">{"বোনাস দিন"}</th>
                <th className="p-4 font-bengali">{"অগ্রিম কর্তন"}</th>
                <th className="p-4 font-bengali font-bold text-[--color-primary]">{"পরিশোধিত নিট বেতন"}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm font-bold text-[--color-foreground]">
              {filteredReportItems.map((item) => (
                <tr key={item.id} className="hover:bg-[--color-primary]/[0.02] transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-[--color-foreground]">{item.employees?.full_name}</p>
                    <span className="text-xs font-bold text-[--color-foreground-muted]">{item.employees?.employee_code}</span>
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-[--color-surface-raised] border border-[--color-border] px-2.5 py-1 text-xs font-bold text-[--color-foreground]">
                      {item.employees?.categories?.category_name || 'কারিগর'}
                    </span>
                  </td>
                  <td className="p-4"><span className="font-body">{formatCurrency(item.monthly_salary)}</span> {"টাকা"}</td>
                  <td className="p-4 text-[--color-success] font-bold"><span className="font-body">{item.duty_days}</span> {"দিন"}</td>
                  <td className="p-4 text-[--color-foreground] font-bold">+<span className="font-body">{item.bonus_days}</span> {"দিন"}</td>
                  <td className="p-4 text-[--color-accent-dark]">-<span className="font-body">{formatCurrency(item.advance_deducted)}</span> {"টাকা"}</td>
                  <td className="p-4 font-bold text-[--color-success]"><span className="font-body">{formatCurrency(item.net_salary)}</span> {"টাকা"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
