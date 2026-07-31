'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Briefcase, Printer, SlidersHorizontal } from 'lucide-react';
import { db } from '@/app/lib/supabase/client';
import { PayrollItem } from '@/app/lib/supabase/types';

// ১. টাইপস্ক্রিপ্ট টাইপ সেফ ইন্টারসেকশন টাইপ (এরর ফিক্স)
type ReportItem = PayrollItem & {
  is_paid?: boolean;
  paid_at?: string | null;
  employees: {
    full_name: string;
    employee_code: string;
    branches: { branch_name: string } | null;
    categories: { category_name: string } | null;
  } | null;
};

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

// টাইমজোন-সেফ পেমেন্ট তারিখ ফরম্যাটার (Pure String Split)
function formatPaymentDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const datePart = isoString.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const yearTwoDigits = parts[0].slice(-2);
    return `${parts[2]}-${parts[1]}-${yearTwoDigits}`; // Returns DD-MM-YY
  }
  return isoString;
}

// প্রিন্ট কপির জন্য ইংলিশ ডিজিটকে বাংলায় রূপান্তর করার হেল্পার ফাংশন
function toBengaliDigits(num: number | string): string {
  const numStr = String(num);
  const englishToBengali: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return numStr.replace(/[0-9]/g, (char) => englishToBengali[char] || char);
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

  // গাণিতিক সমীকরণ ও সামারি হিসাবসমূহ
  const totalGrossSalary = filteredReportItems.reduce((acc: number, item: ReportItem) => acc + Number(item.gross_salary), 0);
  const totalAdvances = filteredReportItems.reduce((acc: number, item: ReportItem) => acc + Number(item.advance_deducted), 0);
  const totalNetSalary = filteredReportItems.reduce((acc: number, item: ReportItem) => acc + Number(item.net_salary), 0);
  const totalActiveEmployees = filteredReportItems.length;

  const currentMonthName = bengaliMonths.find(m => m.code === selectedMonth)?.name || '';

  // ওনারের চাহিদা অনুযায়ী প্রিন্ট হেডারের বিভাগ বা ক্যাটাগরি লেবেল তৈরি
  const categoryPrintLabel = selectedCategory === 'all' ? 'সকল' : selectedCategory;

  return (
    <div className="space-y-6 font-normal antialiased">
      {/* 🛡️ গ্লোবাল সিএসএস প্রিন্ট মিডিয়া কোয়েরি (মেনু হাইড, হেডার ২য় পাতায় রিপিট ও অনুভূমিক প্যানেল) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* সাইডবার, ন্যাভিগেশন বার, প্রিন্ট বোতাম ও ড্রপডাউন হাইড */
          .no-print, header, nav, .sidebar, .bottom-nav, .menu-container {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* ২য় পাতায় কলামের নাম স্বয়ংক্রিয়ভাবে রিপিট করার আধুনিক রুল */
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          /* A4 প্রিন্ট কপিতে গাণিতিক বিবরণী বার-টি জোরপূর্বক এক লাইনে (Horizontal) রাখা হলো */
          .math-summary-bar {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            gap: 12px !important;
            padding: 12px !important;
            border: 1px solid #cbd5e1 !important;
            background-color: #fafafa !important;
            border-radius: 8px !important;
            margin-bottom: 20px !important;
          }
          .math-summary-bar > div {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
        }
      `}} />

      {/* 🛡️ প্রিন্ট পিডিএফ এর জন্য এক্সক্লুসিভ হেডার (প্রিন্ট কপিতে বছর বাংলায় ডাইনামিক করা হলো) */}
      <div className="hidden print:block text-center border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-3xl font-black text-gray-900">{"বিসমিল্লাহ সুইটস এন্ড বেকারি"}</h1>
        <h2 className="text-xl font-bold text-gray-700 mt-1.5">
          {currentMonthName}{" "}{toBengaliDigits(selectedYear)}{" - মাসিক স্টাফ বেতন রিপোর্ট (বিভাগঃ "}{categoryPrintLabel}{")"}
        </h2>
        <p className="text-xs font-semibold text-gray-400 mt-1">{"* এই রিপোর্টটি বিসমিল্লাহ প্রতিষ্ঠানের অভ্যন্তরীণ ব্যবহারের জন্য তৈরি।"}</p>
      </div>

      {/* স্ক্রিন হেডার (প্রিন্টে হাইড থাকবে এবং মাস-বছর বড় করে টাইটেলে দেখানো হলো) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[--color-foreground]">
            {currentMonthName}{" "}{selectedYear}{" - মাসিক রিপোর্ট"}
          </h1>
          <p className="text-sm font-semibold text-[--color-foreground-muted] mt-1">{"ব্যবসায়িক খরচ ও মোট বেতনের মাসিক সংক্ষিপ্ত বিবরণ"}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-accent flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold cursor-pointer"
        >
          <Printer className="h-4.5 w-4.5" />
          <span>{"রিপোর্ট প্রিন্ট করুন"}</span>
        </button>
      </div>

      {/* ফিল্টার এবং ক্যাটাগরি ফিল্টার এরিয়া (প্রিন্টে হাইড থাকবে) */}
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

      {/* ওনারের রুলস অনুযায়ী গাণিতিক সমীকরণ সামারি বার (প্রিন্ট কপিতে সকল সংখ্যা বাংলায় ডাইনামিকালি ম্যাপড) */}
      <div className="math-summary-bar glass p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 text-base font-bold bg-[--color-surface-raised] border border-[--color-border]/50">
        <div className="flex flex-col items-center">
          <span className="text-xs text-[--color-foreground-muted] font-bengali">{"মোট প্রাপ্য বেতন (Gross)"}</span>
          <span className="text-lg font-bold text-gray-800 mt-1">
            <span className="print:hidden"><span className="font-body">{formatCurrency(totalGrossSalary)}</span> {"টাকা"}</span>
            <span className="hidden print:inline">{toBengaliDigits(formatCurrency(totalGrossSalary))} {"টাকা"}</span>
          </span>
        </div>
        <div className="text-xl font-bold text-gray-400">{"-"}</div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-[--color-foreground-muted] font-bengali">{"মোট অগ্রিম কর্তন (Advance)"}</span>
          <span className="text-lg font-bold text-amber-700 mt-1">
            <span className="print:hidden"><span className="font-body">{formatCurrency(totalAdvances)}</span> {"টাকা"}</span>
            <span className="hidden print:inline">{toBengaliDigits(formatCurrency(totalAdvances))} {"টাকা"}</span>
          </span>
        </div>
        <div className="text-xl font-bold text-gray-400">{"="}</div>
        <div className="flex flex-col items-center bg-[--color-primary]/[0.08] px-6 py-2.5 rounded-xl border border-[--color-primary]/[0.2]">
          <span className="text-xs text-[--color-primary] font-bold font-bengali">{"মোট পরিশোধিত নিট বেতন (Net)"}</span>
          <span className="text-xl font-black text-[--color-primary] mt-1">
            <span className="print:hidden"><span className="font-body">{formatCurrency(totalNetSalary)}</span> {"টাকা"}</span>
            <span className="hidden print:inline">{toBengaliDigits(formatCurrency(totalNetSalary))} {"টাকা"}</span>
          </span>
        </div>
        {/* মোট কর্মী সংখ্যা */}
        <div className="hidden md:flex border-l pl-4 flex-col items-center border-[--color-border] no-print">
          <span className="text-xs text-[--color-foreground-muted] font-bengali">{"মোট পরিশোধকৃত কর্মচারী"}</span>
          <span className="text-lg font-bold text-[--color-foreground] mt-1"><span className="font-body">{totalActiveEmployees}</span> {"জন"}</span>
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
        <div className="glass overflow-hidden shadow-sm border border-[--color-border]/50">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-[--color-surface-raised] text-xs font-bold text-[--color-foreground]">
                <th className="p-4 font-bengali">{"কর্মচারি"}</th>
                <th className="p-4 font-bengali">{"ক্যাটাগরি"}</th>
                <th className="p-4 font-bengali">{"মূল বেতন"}</th>
                <th className="p-4 font-bengali">{"ডিউটি দিন"}</th>
                <th className="p-4 font-bengali">{"বোনাস দিন"}</th>
                <th className="p-4 font-bengali">{"অগ্রিম কর্তন"}</th>
                <th className="p-4 font-bengali font-bold text-[--color-primary]">{"পরিশোধিত নিট বেতন"}</th>
                {/* নতুন কলাম: পেমেন্ট স্ট্যাটাস মার্কিং */}
                <th className="p-4 font-bengali text-center">{"পরিশোধ (Sign)"}</th>
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
                  
                  {/* 🛡️ টাকার কলামগুলোতে ভেঙে নিচে নামা রুখতে টাকা লেখার পরিবর্তে Taka Sign ৳ ব্যবহার ও প্রিন্ট কপিতে ডাইনামিক বাংলা সংখ্যা */}
                  <td className="p-4">
                    <span className="print:hidden">{"৳"}<span className="font-body">{formatCurrency(item.monthly_salary)}</span></span>
                    <span className="hidden print:inline">{"৳"}{toBengaliDigits(formatCurrency(item.monthly_salary))}</span>
                  </td>
                  <td className="p-4 text-[--color-success] font-bold">
                    <span className="print:hidden"><span className="font-body">{item.duty_days}</span> {"দিন"}</span>
                    <span className="hidden print:inline">{toBengaliDigits(item.duty_days)} {"দিন"}</span>
                  </td>
                  <td className="p-4 text-[--color-foreground] font-bold">
                    <span className="print:hidden">+<span className="font-body">{item.bonus_days}</span> {"দিন"}</span>
                    <span className="hidden print:inline">+{toBengaliDigits(item.bonus_days)} {"দিন"}</span>
                  </td>
                  <td className="p-4 text-[--color-accent-dark]">
                    <span className="print:hidden">-{"৳"}<span className="font-body">{formatCurrency(item.advance_deducted)}</span></span>
                    <span className="hidden print:inline">-{"৳"}{toBengaliDigits(formatCurrency(item.advance_deducted))}</span>
                  </td>
                  <td className="p-4 font-bold text-[--color-success]">
                    <span className="print:hidden"><span className="font-body">{formatCurrency(item.net_salary)}</span> {"টাকা"}</span>
                    <span className="hidden print:inline">{toBengaliDigits(formatCurrency(item.net_salary))} {"টাকা"}</span>
                  </td>
                  
                  {/* পেইড ও আনপেইড কর্মচারীদের জন্য আলাদা প্রিন্ট সই/মার্কিং ঘর */}
                  <td className="p-4 text-center">
                    {item.is_paid ? (
                      <div className="flex flex-col items-center justify-center text-xs text-[--color-success] font-bold leading-normal">
                        <span className="text-sm font-black text-[--color-success] flex items-center gap-0.5">
                          {"☒ পেইড"}
                        </span>
                        {item.paid_at && (
                          <span className="text-[10px] text-[--color-foreground-muted] font-semibold mt-0.5">
                            <span className="print:hidden font-body">{formatPaymentDate(item.paid_at)}</span>
                            <span className="hidden print:inline">{toBengaliDigits(formatPaymentDate(item.paid_at))}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        {/* আনপেইড কর্মীদের জন্য প্রিন্টে কলম দিয়ে টিক দেওয়ার সুন্দর ফাঁকা চারকোনা বক্স */}
                        <span className="text-xl font-bold text-gray-400 select-none">{"☐"}</span>
                      </div>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}