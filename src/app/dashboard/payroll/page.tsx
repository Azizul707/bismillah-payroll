'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  CreditCard, 
  Lock, 
  Unlock, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  Search,
  SlidersHorizontal 
} from 'lucide-react';
import { db } from '@/app/lib/supabase/client';
import { Payroll, PayrollItem } from '@/app/lib/supabase/types';
import { PayrollService } from '@/app/lib/services/payroll';
import { SalarySlipDownloadButton } from '@/components/salary-slip-pdf';

interface ExtendedPayrollItem extends PayrollItem {
  employees: { 
    full_name: string; 
    employee_code: string;
    mobile_number: string;
    categories: { category_name: string } | null;
  } | null;
}

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState('06'); // জুন
  const [selectedYear, setSelectedYear] = useState('2026');   // ২০২৬
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [payrollItems, setPayrollItems] = useState<ExtendedPayrollItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ id: string; category_name: string }[]>([]);
  
  // অনুসন্ধান ও ফিল্টার স্টেট
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [locking, setLocking] = useState(false);
  
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // বছরের তালিকা (২০২৬ সাল থেকে শুরু)
  const years = ['2026', '2027', '2028'];

  // ক্যাটাগরি তালিকা লোড করার মেমোইজড ফাংশন
  const loadCategoriesData = useCallback(async () => {
    await Promise.resolve(); // Next.js 15 বিল্ড এরর মুক্ত রাখতে
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

  // পে-রোল ডেটা লোড করার মেমোইজড ফাংশন (সিনক্রোনাস রেন্ডার এরর মুক্ত)
  const loadPayrollData = useCallback(async () => {
    await Promise.resolve(); // লিন্টারের সিনক্রোনাস স্টেট এরর দূর করতে ডিফারেল
    try {
      setLoading(true);

      // ১. পে-রোল মাস্টার এন্ট্রি চেক
      const { data: payrollData, error: pErr } = await db.payrolls()
        .select('*')
        .eq('payroll_month', selectedMonth)
        .eq('payroll_year', selectedYear)
        .maybeSingle();

      if (pErr) throw pErr;

      if (payrollData) {
        setPayroll(payrollData as unknown as Payroll);

        // ২. পে-রোল আইটেমস লোড (মোবাইল নাম্বার ও ক্যাটাগরি জয়েন সহ)
        const { data: itemsData, error: itemsErr } = await db.payroll_items()
          .select(`
            *,
            employees(
              full_name, 
              employee_code,
              mobile_number,
              categories(
                category_name
              )
            )
          `)
          .eq('payroll_id', payrollData.id);

        if (itemsErr) throw itemsErr;
        setPayrollItems((itemsData as unknown as ExtendedPayrollItem[]) || []);
      } else {
        setPayroll(null);
        setPayrollItems([]);
      }
    } catch (err) {
      console.error('Error loading payroll page data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // মাউন্ট এবং সিলেকশন পরিবর্তনের ওপর ভিত্তি করে রিলোড লজিক
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadCategoriesData();
        await loadPayrollData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadPayrollData, loadCategoriesData]);

  // বেতন জেনারেট করার অ্যাকশন হ্যান্ডলার
  async function handleGeneratePayroll() {
    try {
      setGenerating(true);
      await PayrollService.generateMonthlyPayroll(
        selectedMonth,
        selectedYear,
        '00000000-0000-0000-0000-000000000000', // ডিফল্ট বা সিস্টেম ইউজার আইডি
        'এডিটর ম্যানেজার'
      );
      await loadPayrollData();
      alert('বেতন শিট সফলভাবে জেনারেট করা হয়েছে।');
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'বেতন তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setGenerating(false);
    }
  }

  // মাসের হিসেব লক করার হ্যান্ডলার
  async function handleLockPayroll() {
    if (!payroll) return;
    const confirmLock = confirm('আপনি কি নিশ্চিত যে মাসের বেতন লক করতে চান? লক করার পর কোনো তথ্য আর পরিবর্তন করা যাবে না।');
    if (!confirmLock) return;

    try {
      setLocking(true);
      await PayrollService.lockPayroll(
        payroll.id,
        '00000000-0000-0000-0000-000000000000',
        'মালিক ইউজার'
      );
      await loadPayrollData();
      alert('মাসের বেতন হিসাব সফলভাবে সম্পন্ন ও লক করা হয়েছে।');
    } catch (err) {
      console.error(err);
      alert('লক করতে সমস্যা হয়েছে।');
    } finally {
      setLocking(false);
    }
  }

  // মাসের হিসেব আনলক করার হ্যান্ডলার
  async function handleUnlockPayroll(e: React.FormEvent) {
    e.preventDefault();
    if (!payroll) return;
    if (!unlockReason.trim()) {
      setModalError('আনলক করার উপযুক্ত কারণ অবশ্যই উল্লেখ করতে হবে।');
      return;
    }

    try {
      setSubmitting(true);
      await PayrollService.unlockPayroll(
        payroll.id,
        unlockReason,
        '00000000-0000-0000-0000-000000000000',
        'মালিক ইউজার'
      );
      setIsUnlockModalOpen(false);
      setUnlockReason('');
      await loadPayrollData();
      alert('বেতন হিসাব সফলভাবে আনলক করা হয়েছে।');
    } catch (err) {
      console.error(err);
      setModalError('আনলক করতে অভ্যন্তরীণ সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  }

  // রিয়েল-টাইম ফিল্টারিং লজিক (নাম, কোড, মোবাইল, ক্যাটাগরি সার্চ ও ড্রপডাউন ক্যাটাগরি ফিল্টার)
  const filteredPayrollItems = payrollItems.filter((item) => {
    const emp = item.employees;
    if (!emp) return false;

    // ১. টেক্সট সার্চ লজিক
    const text = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !text || 
      emp.full_name?.toLowerCase().includes(text) ||
      emp.employee_code?.toLowerCase().includes(text) ||
      (emp.mobile_number && emp.mobile_number.includes(text)) ||
      emp.categories?.category_name?.toLowerCase().includes(text);

    // ২. ড্রপডাউন ক্যাটাগরি ফিল্টার লজিক
    const matchesCategory = 
      selectedCategory === 'all' || 
      emp.categories?.category_name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* হেডার এরিয়া */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">{"বেতন ও পে-রোল হিসাব"}</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">{"মাসের বেতন হিসাব এবং লক/আনলক কন্ট্রোল"}</p>
        </div>
      </div>

      {/* মাস ও বছর ফিল্টার এরিয়া */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-base font-bold text-gray-700">
        <div className="flex flex-col w-full sm:w-auto gap-1">
          <label className="text-sm text-gray-400">{"বেতন মাস"}</label>
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
          <label className="text-sm text-gray-400">{"বেতন বছর"}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border p-2.5 font-bold focus:outline-none focus:border-[#8B0000]"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end h-full pt-5 w-full sm:w-auto">
          {!payroll || !payroll.is_locked ? (
            <button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-5 py-3 shadow transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-5 w-5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'হিসাব তৈরি হচ্ছে...' : 'বেতন হিসাব তৈরি করুন'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 text-green-700 px-5 py-3">
              <CheckCircle2 className="h-5 w-5" />
              <span>{"এই মাসের বেতন সম্পন্ন হয়েছে।"}</span>
            </div>
          )}
        </div>
      </div>

      {/* মাসের স্ট্যাটাস অ্যালার্ট (লকড নাকি ড্রাফট) */}
      {payroll && (
        <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
          payroll.is_locked 
            ? 'bg-green-50 border-green-200 text-green-900' 
            : 'bg-[#F4C430]/10 border-[#F4C430]/30 text-amber-900'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`h-6 w-6 mt-0.5 ${payroll.is_locked ? 'text-green-600' : 'text-amber-600'}`} />
            <div className="text-base font-bold">
              <p className="font-black text-lg">
                {payroll.is_locked ? 'মাসের বেতন হিসেব সম্পূর্ণ লকড' : 'হিসেব খসড়া (Draft) অবস্থায় আছে'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {payroll.is_locked 
                  ? 'মালিক কর্তৃক হিসাব লক করা হয়েছে। নতুন কোনো অগ্রিম, কাজ বা বেতন পরিবর্তন করা যাবে না।' 
                  : 'আপনি এখন কর্মচারীদের অগ্রিম বা নতুন কাজের তথ্য যুক্ত করতে পারেন। সব কাজ শেষে ওনার হিসাব লক করবেন।'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {payroll.is_locked ? (
              <button
                onClick={() => { setIsUnlockModalOpen(true); setUnlockReason(''); setModalError(''); }}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 text-sm font-black transition-colors cursor-pointer"
              >
                <Unlock className="h-4 w-4" />
                <span>{"বেতন হিসাব আনলক করুন"}</span>
              </button>
            ) : (
              <button
                onClick={handleLockPayroll}
                disabled={locking}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-5 py-2.5 text-sm font-black shadow transition-colors cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>{locking ? 'লক হচ্ছে...' : 'মাসের হিসাব সম্পন্ন ও লক করুন'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* সার্চ ও ফিল্টার সেকশন (শুধুমাত্র তখনই দৃশ্যমান হবে যখন ডেটা থাকবে) */}
      {payrollItems.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          {/* সার্চ ইনপুট */}
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="কর্মচারীর নাম, কোড, মোবাইল বা ক্যাটাগরি দিয়ে খুঁজুন..."
              className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 font-bold text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#8B0000] focus:ring-1 focus:ring-[#8B0000] text-sm"
            />
          </div>

          {/* ক্যাটাগরি ড্রপডাউন */}
          <div className="flex items-center gap-2 w-full md:w-auto min-w-[220px]">
            <span className="text-gray-400 shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 font-bold text-gray-700 focus:outline-none focus:border-[#8B0000] text-sm"
            >
              <option value="all">{"সকল ক্যাটাগরি"}</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.category_name}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* পে-রোল বিস্তারিত টেবিল */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
          <p className="mt-4 font-bold text-gray-500">{"তথ্য খোঁজা হচ্ছে..."}</p>
        </div>
      ) : payrollItems.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-400 shadow-sm">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300" />
          <p className="mt-4 text-lg font-bold">{"এই মাসের কোনো বেতন হিসেব এখনও তৈরি করা হয়নি।"}</p>
          <p className="text-sm font-bold text-gray-400 mt-1">{"বেতন তৈরি করতে উপরের বোতামটি চাপুন।"}</p>
        </div>
      ) : filteredPayrollItems.length === 0 ? (
        // সার্চ বা ফিল্টার করে ডেটা না পাওয়া গেলে
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-400 shadow-sm">
          <Search className="h-12 w-12 mx-auto text-gray-300" />
          <p className="mt-4 text-lg font-bold">{"কোনো মিল পাওয়া যায়নি!"}</p>
          <p className="text-sm font-bold text-gray-400 mt-1">{"দয়া করে সঠিক নাম, কোড, মোবাইল বা ক্যাটাগরি লিখে আবার চেষ্টা করুন।"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b bg-gray-50 text-sm font-black text-gray-700">
                <th className="p-4">{"কোড ও নাম"}</th>
                <th className="p-4">{"মূল বেতন"}</th>
                <th className="p-4">{"দৈনিক বেতন"}</th>
                <th className="p-4">{"উপস্থিত দিন"}</th>
                <th className="p-4">{"অনুপস্থিত দিন"}</th>
                <th className="p-4">{"বোনাস দিন"}</th>
                <th className="p-4">{"মোট (Gross)"}</th>
                <th className="p-4">{"অগ্রিম সমন্বয়"}</th>
                <th className="p-4 font-black text-[#8B0000]">{"নিট বেতন"}</th>
                <th className="p-4 text-center">{"রসিদ"}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-base font-bold text-gray-800">
              {filteredPayrollItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-black text-gray-900">{item.employees?.full_name}</p>
                    <span className="text-xs font-black text-gray-400">
                      {item.employees?.employee_code}
                      {item.employees?.categories?.category_name && ` | ${item.employees.categories.category_name}`}
                    </span>
                  </td>
                  <td className="p-4">{item.monthly_salary} {"টাকা"}</td>
                  <td className="p-4">{Math.round(item.daily_salary)} {"টাকা"}</td>
                  <td className="p-4 text-green-700 font-black">{item.duty_days} {"দিন"}</td>
                  <td className="p-4 text-red-600">{item.absent_days} {"দিন"}</td>
                  <td className="p-4 text-blue-700 font-black">+{item.bonus_days} {"দিন"}</td>
                  <td className="p-4 font-black">{item.gross_salary} {"টাকা"}</td>
                  <td className="p-4 text-amber-700">-{item.advance_deducted} {"টাকা"}</td>
                  <td className="p-4 font-black text-lg text-green-800">{item.net_salary} {"টাকা"}</td>
                  {/* স্যালারি স্লিপ পিডিএফ বাটন ইন্টিগ্রেশন */}
                  <td className="p-4 text-center">
                    <SalarySlipDownloadButton 
                      data={{
                        employeeName: item.employees?.full_name || '',
                        employeeCode: item.employees?.employee_code || '',
                        branchName: 'প্রধান শাখা', 
                        categoryName: item.employees?.categories?.category_name || 'কারিগর',   
                        month: selectedMonth,
                        year: selectedYear,
                        monthlySalary: Number(item.monthly_salary),
                        dailySalary: Math.round(Number(item.daily_salary)),
                        dutyDays: item.duty_days,
                        bonusDays: item.bonus_days,
                        absentDays: item.absent_days,
                        grossSalary: Number(item.gross_salary),
                        advanceAmount: Number(item.advance_deducted),
                        netSalary: Number(item.net_salary),
                      }} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================== */}
      {/* আনলক করার পপআপ মডাল (Unlock Modal) */}
      {/* ========================================== */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <Unlock className="h-5 w-5 text-red-600" />
              <span>{"বেতন হিসাব আনলক করুন"}</span>
            </h2>
            <form onSubmit={handleUnlockPayroll} className="space-y-4 text-base font-bold text-gray-700">
              {modalError && <div className="rounded-lg bg-red-50 p-3 text-sm font-black text-red-600">{modalError}</div>}
              
              <div className="space-y-1">
                <label className="block text-red-900 font-black">{"আনলক করার সুনির্দিষ্ট কারণ (বাধ্যতামূলক)"}</label>
                <textarea
                  required
                  placeholder="যেমন: ম্যানেজারের অনুরোধে অমুকের অগ্রিম কাটতে ভুল সংশোধন করা হবে।"
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  className="w-full rounded-lg border bg-white p-2.5 font-bold text-gray-800"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button type="button" onClick={() => setIsUnlockModalOpen(false)} className="flex-1 rounded-lg border py-3 font-bold cursor-pointer">{"বাতিল"}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-red-600 text-white py-3 font-bold cursor-pointer">
                  {submitting ? 'আনলক হচ্ছে...' : 'হিসাব আনলক করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}