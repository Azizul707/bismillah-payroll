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

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState('06');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedCategory, setSelectedCategory] = useState('all'); // ক্যাটাগরি ফিল্টার স্টেট
  const [categoriesList, setCategoriesList] = useState<{ id: string; category_name: string }[]>([]);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // বাংলা মাসের তালিকা
  const bengaliMonths = [
    { code: '01', name: 'জানুয়ারি' },
    { code: '02', name: 'ফেব্রুয়ারি' },
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

  // কারেন্সি ফরম্যাটার (টাকা কমা সেপারেটর দিতে)
  const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    return isNaN(num) ? '0' : num.toLocaleString('en-US');
  };

  // ১. ক্যাটাগরির তালিকা লোড করার মেমোইজড ফাংশন (সিনক্রোনাস রেন্ডার এরর মুক্ত)
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

  // মাউন্ট ইফেক্ট
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

  // রিয়েল-টাইম ক্যাটাগরি ফিল্টারিং
  const filteredReportItems = reportItems.filter((item: ReportItem) => {
    if (selectedCategory === 'all') return true;
    return item.employees?.categories?.category_name === selectedCategory;
  });

  // সামারি কার্ডের জন্য ক্যালকুলেশন (টাইপস্ক্রিপ্ট টাইপ সেফটি সহ)
  const totalNetSalary = filteredReportItems.reduce((acc: number, item: ReportItem) => acc + Number(item.net_salary), 0);
  const totalAdvances = filteredReportItems.reduce((acc: number, item: ReportItem) => acc + Number(item.advance_deducted), 0);
  const totalActiveEmployees = filteredReportItems.length;

  const currentMonthName = bengaliMonths.find(m => m.code === selectedMonth)?.name || '';

  return (
    <div className="space-y-6 font-normal antialiased">
      {/* গুগোল ফন্ট 'Tiro Bangla' ইন্টিগ্রেশন এবং বিল্ড-সেফ কাস্টম স্টাইল শীট */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&display=swap');
        body {
          font-family: 'Tiro Bangla', serif !important;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* প্রিন্ট মোডে সাইডবার, বাটন ও ফিল্টার লুকিয়ে রাখা */
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}} />

      {/* প্রিন্ট পিডিএফ এর জন্য এক্সক্লুসিভ হেডার (সাধারণ স্ক্রিনে লুকানো থাকবে) */}
      <div className="hidden print-only text-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{"মাসিক বেতন রিপোর্ট"}</h1>
        <p className="text-base text-gray-600 mt-1">
          {"মাস: "} {currentMonthName} {" | বছর: "} {selectedYear}
        </p>
      </div>

      {/* স্ক্রিন হেডার (প্রিন্টে হাইড থাকবে) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{"মালিক রিপোর্ট"}</h1>
          <p className="text-sm font-semibold text-gray-500 mt-1">{"ব্যবসায়িক খরচ ও মোট বেতনের মাসিক সংক্ষিপ্ত বিবরণ"}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-5 py-2.5 text-sm font-bold shadow-md transition-colors cursor-pointer"
        >
          <Printer className="h-4.5 w-4.5 text-[#F4C430]" />
          <span>{"রিপোর্ট প্রিন্ট করুন"}</span>
        </button>
      </div>

      {/* ফিল্টার এবং ক্যাটাগরি ফিল্টার এরিয়া (প্রিন্টে হাইড থাকবে) */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-base font-semibold text-gray-700 no-print">
        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-xs text-gray-400">{"হিসাবের মাস"}</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-gray-200 p-2.5 font-bold focus:outline-none focus:border-[#8B0000]"
          >
            {bengaliMonths.map(m => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-xs text-gray-400">{"হিসাবের বছর"}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border border-gray-200 p-2.5 font-bold focus:outline-none focus:border-[#8B0000]"
          >
            <option value="2026">{"2026"}</option>
            <option value="2027">{"2027"}</option>
          </select>
        </div>

        {/* ক্যাটাগরি ফিল্টার ড্রপডাউন */}
        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-xs text-gray-400">{"ক্যাটাগরি ফিল্টার"}</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-gray-200 pl-8 pr-4 p-2.5 font-bold focus:outline-none focus:border-[#8B0000] appearance-none"
            >
              <option value="all">{"সকল ক্যাটাগরি"}</option>
              {categoriesList.map(c => (
                <option key={c.id} value={c.category_name}>{c.category_name}</option>
              ))}
            </select>
            <SlidersHorizontal className="absolute left-2.5 top-3.5 h-4 w-4 text-gray-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* সারাংশ কার্ডসমূহ (প্রিন্টে হাইড থাকবে) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-full bg-red-50 p-3.5 text-[#8B0000]">
            <DollarSign className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold">{"মোট নিট বেতন পরিশোধ"}</p>
            <h3 className="text-lg font-bold text-gray-800 mt-0.5">{formatCurrency(totalNetSalary)} {"টাকা"}</h3>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-full bg-amber-50 p-3.5 text-amber-700">
            <Briefcase className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold">{"মোট অগ্রিম বেতন সমন্বয়"}</p>
            <h3 className="text-lg font-bold text-gray-800 mt-0.5">{formatCurrency(totalAdvances)} {"টাকা"}</h3>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-full bg-blue-50 p-3.5 text-blue-600">
            <Users className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold">{"পরিশোধকৃত মোট কর্মচারী"}</p>
            <h3 className="text-lg font-bold text-gray-800 mt-0.5">{totalActiveEmployees} {"জন"}</h3>
          </div>
        </div>
      </div>

      {/* রিপোর্ট তালিকা টেবিল */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
        </div>
      ) : filteredReportItems.length === 0 ? (
        <p className="text-center font-bold text-gray-400 py-12">{"এই ক্যাটাগরির কোনো হিসেব এখনও তৈরি করা হয়নি।"}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-bold text-gray-600">
                <th className="p-4">{"কর্মচারী"}</th>
                <th className="p-4">{"ক্যাটাগরি"}</th>
                <th className="p-4">{"মূল বেতন"}</th>
                <th className="p-4">{"ডিউটি দিন"}</th>
                <th className="p-4">{"বোনাস দিন"}</th>
                <th className="p-4">{"অগ্রিম কর্তন"}</th>
                <th className="p-4 font-bold text-[#8B0000]">{"পরিশোধিত নিট বেতন"}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm font-semibold text-gray-700">
              {filteredReportItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-gray-850">{item.employees?.full_name}</p>
                    <span className="text-xs text-gray-400 font-semibold">{item.employees?.employee_code}</span>
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-gray-50 border border-gray-100 px-2.5 py-1 text-xs text-gray-600 font-bold">
                      {item.employees?.categories?.category_name || 'কারিগর'}
                    </span>
                  </td>
                  <td className="p-4">{formatCurrency(item.monthly_salary)} {"টাকা"}</td>
                  <td className="p-4 text-green-700 font-bold">{item.duty_days} {"দিন"}</td>
                  <td className="p-4 text-blue-700 font-bold">+{item.bonus_days} {"দিন"}</td>
                  <td className="p-4 text-amber-700">-{formatCurrency(item.advance_deducted)} {"টাকা"}</td>
                  <td className="p-4 font-bold text-green-800">{formatCurrency(item.net_salary)} {"টাকা"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}