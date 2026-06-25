'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  CheckCircle, 
  CalendarX, 
  DollarSign 
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

// সুপাবেস ডাটাবেস কুয়েরির জয়েন রেসপন্সকে টাইপ-সেফ করতে সুনির্দিষ্ট ইন্টারফেস
interface SupabaseLeaveEmployee {
  id: string;
  full_name: string;
  categories: {
    category_name: string;
  } | null;
  employee_status_history: {
    start_date: string;
    status: string;
  }[] | null;
}

// তারিখ সুন্দর করে ফরম্যাট করার হেল্পার ফাংশন (YYYY-MM-DD -> DD-MM-YYYY)
function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
}

export default function DashboardPage() {
  // ডাইনামিক তারিখ, মাস এবং বছরের স্টেটসমূহ (Hydration সেফ ফলব্যাক সহ)
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

  // কারেন্সি কমা সেপারেটর ফরম্যাটার
  const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    return isNaN(num) ? '0' : num.toLocaleString('en-US');
  };

  // ড্যাশবোর্ডের ডেটা লোড করার নিরাপদ মেমোইজড ফাংশন
  const loadDashboardData = useCallback(async () => {
    await Promise.resolve(); // সিনক্রোনাস রেন্ডার এরর দূর করতে মাইক্রো-টাস্ক টিক
    try {
      setLoading(true);

      // ১. মোট কর্মচারী সংখ্যা (সফট ডিলিট বাদে)
      const { data: employees, error: empError } = await db.employees()
        .select('id, status, monthly_salary')
        .eq('is_deleted', false);
      if (empError) throw empError;

      const totalEmp = employees?.length || 0;
      const activeEmp = employees?.filter(e => e.status === 'active').length || 0;
      const leaveEmp = employees?.filter(e => e.status === 'leave').length || 0;

      // ২. চলতি মাসের মোট অগ্রিম (ডাইনামিক মাস ও বছরের ওপর ভিত্তি করে)
      const { data: advances, error: advError } = await db.salary_advances()
        .select('amount')
        .eq('advance_month', currentMonth)
        .eq('advance_year', currentYear)
        .eq('is_deleted', false);
      if (advError) throw advError;

      const totalAdvances = (advances || []).reduce((sum, item) => sum + Number(item.amount), 0);

      // ৩. চলতি মাসের আনুমানিক মোট বেসিক স্যালারি বাজেট
      const totalSalaryBudget = (employees || []).reduce((sum, item) => sum + Number(item.monthly_salary), 0);

      setStats({
        totalEmployees: totalEmp,
        activeEmployees: activeEmp,
        leaveEmployees: leaveEmp,
        totalAdvancesThisMonth: totalAdvances,
        estimatedSalaryThisMonth: totalSalaryBudget,
      });

      // ৪. বর্তমানে যারা ছুটিতে আছেন তাদের ক্যাটাগরি ও স্ট্যাটাস হিস্টোরি সহ তথ্য কুয়েরি করা
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

      const typedLeaveData = leaveEmployeesData as unknown as SupabaseLeaveEmployee[];

      // ছুটির সময়কাল ডাইনামিকভাবে আজকের আসল তারিখ অনুযায়ী হিসাব করা
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
          startDate: startDate,
          daysOnLeave: daysOnLeave,
        };
      });

      setLeaveList(parsedLeaves);

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  // আজকের রিয়েল তারিখ ও মাস ডাইনামিক সেটআপ (Next.js 15-এর কড়া Rule #1 মেনে মাইক্রো-টাস্ক ডিফারেল সহ)
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve(); // 🌟 রেন্ডার ক্যাস্কেডিং ও বিল্ড ফেল প্রতিরোধক মাইক্রো-টাস্ক টিক
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
    return () => {
      active = false;
    };
  }, []);

  // ডাইনামিক তারিখের পর ডেটা লোড নিশ্চিতকরণ
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadDashboardData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-bold text-gray-700">{"তথ্য লোড করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-normal">
      {/* হেডার সেকশন */}
      <div className="border-b pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{"স্বাগতম, বিসমিল্লাহ ড্যাশবোর্ড"}</h1>
        <p className="text-sm md:text-base font-semibold text-gray-500 mt-1">
          {"আজকের তারিখ: "}{formattedToday}{" | চলতি মাসের হিসাব ("}{monthName}{" "}{currentYear}{")"}
        </p>
      </div>

      {/* ৫টি মূল তথ্য কার্ডের গ্রিড লেআউট */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        
        {/* ১. মোট কর্মচারী কার্ড */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-full bg-blue-50 p-4 text-blue-600">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-500">{"মোট কর্মচারী"}</p>
            <h3 className="text-2xl font-bold text-gray-850 mt-1">{stats.totalEmployees} {"জন"}</h3>
          </div>
        </div>

        {/* ২. বর্তমানে কর্মরত কার্ড */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-full bg-green-50 p-4 text-green-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-500">{"বর্তমানে কর্মরত"}</p>
            <h3 className="text-2xl font-bold text-green-700 mt-1">{stats.activeEmployees} {"জন"}</h3>
          </div>
        </div>

        {/* ৩. ছুটিতে থাকা কার্ড */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-full bg-amber-50 p-4 text-amber-600">
            <CalendarX className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-500">{"বর্তমানে ছুটিতে"}</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">{stats.leaveEmployees} {"জন"}</h3>
          </div>
        </div>

        {/* ৪. এই মাসের মোট অগ্রিম */}
        <div className="flex items-center gap-4 rounded-xl border border-[#F4C430]/20 bg-[#F4C430]/10 p-6 shadow-sm">
          <div className="rounded-full bg-[#F4C430]/20 p-4 text-amber-800">
            <DollarSign className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-amber-900">{"চলতি মাসের মোট অগ্রিম"}</p>
            <h3 className="text-2xl font-bold text-amber-950 mt-1">{formatCurrency(stats.totalAdvancesThisMonth)} {"টাকা"}</h3>
          </div>
        </div>

        {/* ৫. আনুমানিক বেতন বাজেট */}
        <div className="flex items-center gap-4 rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 p-6 shadow-sm">
          <div className="rounded-full bg-[#8B0000]/10 p-4 text-[#8B0000]">
            <DollarSign className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#8B0000]">{"চলতি মাসের মূল বেতন বাজেট"}</p>
            <h3 className="text-2xl font-bold text-[#8B0000] mt-1">{formatCurrency(stats.estimatedSalaryThisMonth)} {"টাকা"}</h3>
          </div>
        </div>

      </div>

      {/* ছুটিতে থাকা কর্মচারীদের তালিকা টেবিল সেকশন */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-gray-50/50 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <CalendarX className="h-5 w-5 text-[#8B0000]" />
            <span>{"বর্তমানে ছুটিতে থাকা কর্মচারীদের তালিকা"}</span>
          </h3>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">{"বর্তমানে কারখানায় অনুপস্থিত ও ছুটিতে থাকা সকল কর্মচারীদের বিবরণ"}</p>
        </div>

        {leaveList.length === 0 ? (
          <div className="p-8 text-center text-gray-400 font-bold">
            <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-2" />
            <p>{"বর্তমানে কোনো কর্মচারী ছুটিতে নেই।"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm font-semibold text-gray-800">
              <thead>
                <tr className="border-b bg-gray-50/75 text-xs font-bold text-gray-600">
                  <th className="p-4">{"কর্মচারীর নাম"}</th>
                  <th className="p-4">{"ক্যাটাগরি"}</th>
                  <th className="p-4">{"ছুটি শুরুর তারিখ"}</th>
                  <th className="p-4">{"ছুটিতে থাকার সময়কাল"}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {leaveList.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-gray-900 font-bold">{emp.fullName}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                        {emp.categoryName}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{formatDate(emp.startDate)}</td>
                    <td className="p-4 text-red-700 font-bold">
                      {`${emp.daysOnLeave} দিন যাবত`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* নির্দেশাবলী */}
      <div className="rounded-xl border border-gray-100 bg-[#8B0000]/5 p-6">
        <h4 className="text-base font-bold text-[#8B0000]">{"সহজ নির্দেশিকা:"}</h4>
        <ul className="mt-2 space-y-2 text-sm font-semibold text-gray-700 list-disc pl-5">
          <li>{"নতুন কর্মচারী যোগ করতে এবং কর্মচারীদের ছুটি বা অগ্রিম দিতে বাম পাশের মেনু থেকে \"কর্মচারী তালিকা\"-এ যান।"}</li>
          <li>{"প্রতি মাসের বেতন তৈরি করতে এবং মাসের হিসেব মেলাতে \"বেতন ও পে-রোল\" মেনু ব্যবহার করুন।"}</li>
          <li>{"মোবাইল থেকে দেখার সময় উপরে ডানের বোতাম টিপে মেনু ওপেন করুন।"}</li>
        </ul>
      </div>
    </div>
  );
}