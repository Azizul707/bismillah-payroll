'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, DollarSign, Users, Briefcase, Printer } from 'lucide-react';
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
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadReportData = useCallback(async () => {
    await Promise.resolve(); // লিন্টারের সিনক্রোনাস স্টেট এরর দূর করতে ডিফারেল
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

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadReportData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadReportData]);

  // সারাংশ হিসাবসমূহ
  const totalNetSalary = reportItems.reduce((acc, curr) => acc + Number(curr.net_salary), 0);
  const totalAdvances = reportItems.reduce((acc, curr) => acc + Number(curr.advance_deducted), 0);
  const totalActiveEmployees = reportItems.length;

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">মালিক রিপোর্ট</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">ব্যবসায়িক খরচ ও মোট বেতনের মাসিক সংক্ষিপ্ত বিবরণ</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-5 py-3 text-base font-bold shadow transition-colors cursor-pointer"
        >
          <Printer className="h-5 w-5 text-[#F4C430]" />
          <span>রিপোর্ট প্রিন্ট করুন</span>
        </button>
      </div>

      {/* ফিল্টার */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-base font-bold text-gray-700">
        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-sm text-gray-400">হিসাবের মাস</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border p-2.5 font-bold focus:outline-none focus:border-[#8B0000]"
          >
            {bengaliMonths.map(m => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-sm text-gray-400">হিসাবের বছর</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border p-2.5 font-bold focus:outline-none focus:border-[#8B0000]"
          >
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {/* সারাংশ কার্ডসমূহ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-full bg-red-50 p-4 text-[#8B0000]">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold">মোট নিট বেতন পরিশোধ</p>
            <h3 className="text-xl font-black text-gray-900">{totalNetSalary} টাকা</h3>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-full bg-amber-50 p-4 text-amber-700">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold">মোট অগ্রিম বেতন সমন্বয়</p>
            <h3 className="text-xl font-black text-gray-900">{totalAdvances} টাকা</h3>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-full bg-blue-50 p-4 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold">পরিশোধকৃত মোট কর্মচারী</p>
            <h3 className="text-xl font-black text-gray-900">{totalActiveEmployees} জন</h3>
          </div>
        </div>
      </div>

      {/* রিপোর্ট তালিকা টেবিল */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
        </div>
      ) : reportItems.length === 0 ? (
        <p className="text-center font-bold text-gray-400 py-12">এই মাসের কোনো হিসেব এখনও তৈরি করা হয়নি।</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b bg-gray-50 text-sm font-black text-gray-700">
                <th className="p-4">কর্মচারী</th>
                <th className="p-4">শাখা ও ক্যাটাগরি</th>
                <th className="p-4">মূল বেতন</th>
                <th className="p-4">ডিউটি দিন</th>
                <th className="p-4">বোনাস দিন</th>
                <th className="p-4">অগ্রিম কর্তন</th>
                <th className="p-4 font-black text-[#8B0000]">পরিশোধিত নিট বেতন</th>
              </tr>
            </thead>
            <tbody className="divide-y text-base font-bold text-gray-800">
              {reportItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-black">{item.employees?.full_name}</p>
                    <span className="text-xs text-gray-400 font-black">{item.employees?.employee_code}</span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm">{item.employees?.branches?.branch_name}</p>
                    <span className="text-xs text-gray-400">{item.employees?.categories?.category_name}</span>
                  </td>
                  <td className="p-4">{item.monthly_salary} টাকা</td>
                  <td className="p-4 text-green-700">{item.duty_days} দিন</td>
                  <td className="p-4 text-blue-700">+{item.bonus_days} দিন</td>
                  <td className="p-4 text-amber-700">-{item.advance_deducted} টাকা</td>
                  <td className="p-4 font-black text-green-800">{item.net_salary} টাকা</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}