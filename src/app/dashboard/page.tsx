'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle, 
  CalendarX, 
  DollarSign, 
  Building, 
  Layers 
} from 'lucide-react';
import { db } from '@/app/lib/supabase/client';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  leaveEmployees: number;
  totalBranches: number;
  totalCategories: number;
  totalAdvancesThisMonth: number;
  estimatedSalaryThisMonth: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    leaveEmployees: 0,
    totalBranches: 0,
    totalCategories: 0,
    totalAdvancesThisMonth: 0,
    estimatedSalaryThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  // জুন ২০২৬ সালের হিসাব অনুযায়ী ডিফল্ট ডেটা লোড
  const currentMonth = '06';
  const currentYear = '2026';

  useEffect(() => {
    async function loadDashboardData() {
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

        // ২. মোট ব্রাঞ্চ সংখ্যা
        const { count: branchCount, error: branchError } = await db.branches()
          .select('*', { count: 'exact', head: true })
          .eq('is_deleted', false);
        if (branchError) throw branchError;

        // ৩. মোট ক্যাটাগরি সংখ্যা
        const { count: categoryCount, error: catError } = await db.categories()
          .select('*', { count: 'exact', head: true })
          .eq('is_deleted', false);
        if (catError) throw catError;

        // ৪. চলতি মাসের মোট অগ্রিম (জুন ২০২৬)
        const { data: advances, error: advError } = await db.salary_advances()
          .select('amount')
          .eq('advance_month', currentMonth)
          .eq('advance_year', currentYear)
          .eq('is_deleted', false);
        if (advError) throw advError;

        const totalAdvances = (advances || []).reduce((sum, item) => sum + Number(item.amount), 0);

        // ৫. চলতি মাসের আনুমানিক মোট বেসিক স্যালারি বাজেট
        const totalSalaryBudget = (employees || []).reduce((sum, item) => sum + Number(item.monthly_salary), 0);

        setStats({
          totalEmployees: totalEmp,
          activeEmployees: activeEmp,
          leaveEmployees: leaveEmp,
          totalBranches: branchCount || 0,
          totalCategories: categoryCount || 0,
          totalAdvancesThisMonth: totalAdvances,
          estimatedSalaryThisMonth: totalSalaryBudget,
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-bold text-gray-700">তথ্য লোড করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* হেডার সেকশন */}
      <div className="border-b pb-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">স্বাগতম, বিসমিল্লাহ ড্যাশবোর্ড</h1>
        <p className="text-sm md:text-base font-bold text-gray-500 mt-1">
          আজকের তারিখ: 24-06-2026 | চলতি মাসের হিসাব (জুন 2026)
        </p>
      </div>

      {/* বড় সাইজের তথ্য কার্ডসমূহ (৩ কলাম গ্রিড) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        
        {/* ১. মোট কর্মচারী কার্ড */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-full bg-blue-50 p-4 text-blue-600">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-500">মোট কর্মচারী</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.totalEmployees} জন</h3>
          </div>
        </div>

        {/* ২. বর্তমানে কর্মরত কার্ড */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-full bg-green-50 p-4 text-green-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-500">বর্তমানে কর্মরত</p>
            <h3 className="text-3xl font-black text-green-700 mt-1">{stats.activeEmployees} জন</h3>
          </div>
        </div>

        {/* ৩. ছুটিতে থাকা কার্ড */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="rounded-full bg-amber-50 p-4 text-amber-600">
            <CalendarX className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-500">বর্তমানে ছুটিতে</p>
            <h3 className="text-3xl font-black text-amber-700 mt-1">{stats.leaveEmployees} জন</h3>
          </div>
        </div>

        {/* ৪. এই মাসের মোট অগ্রিম */}
        <div className="flex items-center gap-4 rounded-xl border border-[#F4C430]/20 bg-[#F4C430]/10 p-6 shadow-sm">
          <div className="rounded-full bg-[#F4C430]/20 p-4 text-amber-800">
            <DollarSign className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-amber-900">চলতি মাসের মোট অগ্রিম</p>
            <h3 className="text-3xl font-black text-amber-950 mt-1">{stats.totalAdvancesThisMonth} টাকা</h3>
          </div>
        </div>

        {/* ৫. আনুমানিক বেতন বাজেট */}
        <div className="flex items-center gap-4 rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 p-6 shadow-sm">
          <div className="rounded-full bg-[#8B0000]/10 p-4 text-[#8B0000]">
            <DollarSign className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-[#8B0000]">চলতি মাসের মূল বেতন বাজেট</p>
            <h3 className="text-3xl font-black text-[#8B0000] mt-1">{stats.estimatedSalaryThisMonth} টাকা</h3>
          </div>
        </div>

        {/* ৬. মোট ব্রাঞ্চ ও ক্যাটাগরি */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-bold text-gray-600">
              <Building className="h-5 w-5 text-gray-400" />
              <span>মোট ব্রাঞ্চ</span>
            </div>
            <span className="text-xl font-black text-gray-900">{stats.totalBranches} টি</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-gray-600">
              <Layers className="h-5 w-5 text-gray-400" />
              <span>মোট স্টাফ ক্যাটাগরি</span>
            </div>
            <span className="text-xl font-black text-gray-900">{stats.totalCategories} টি</span>
          </div>
        </div>

      </div>

      {/* নির্দেশাবলী */}
      <div className="rounded-xl border border-gray-100 bg-[#8B0000]/5 p-6">
        <h4 className="text-lg font-bold text-[#8B0000]">সহজ নির্দেশিকা:</h4>
        <ul className="mt-2 space-y-2 text-base font-bold text-gray-700 list-disc pl-5">
          <li>নতুন কর্মচারী যোগ করতে এবং কর্মচারীদের ছুটি বা অগ্রিম দিতে বাম পাশের মেনু থেকে <span className="text-[#8B0000]">{"\"কর্মচারী তালিকা\""}</span>-এ যান।</li>
          <li>প্রতি মাসের বেতন তৈরি করতে এবং মাসের হিসেব মেলাতে <span className="text-[#8B0000]">{"\"বেতন ও পে-রোল\""}</span> মেনু ব্যবহার করুন।</li>
          <li>মোবাইল থেকে দেখার সময় উপরে ডানের বোতাম টিপে মেনু ওপেন করুন।</li>
        </ul>
      </div>
    </div>
  );
}