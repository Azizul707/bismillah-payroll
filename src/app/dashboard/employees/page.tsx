'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Phone, 
  Briefcase, 
  DollarSign, 
  Eye 
} from 'lucide-react';
import { db } from '@/app/lib/supabase/client';
import { Employee, Category } from '@/app/lib/supabase/types';
import { EmployeeService } from '@/app/lib/services/employee';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Array<Employee & { 
    categories: { category_name: string } | null; 
  }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(''); // ক্যাটাগরি ফিল্টারিং স্টেট
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // নতুন কর্মচারীর ফর্ম স্টেট
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [joiningDate, setJoiningDate] = useState('2026-06-24'); // বর্তমান ডেট ২০২৬-০৬-২৪
  const [monthlySalary, setMonthlySalary] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // মেমোইজড ডাটা লোড ফাংশন
  const loadData = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      // কর্মচারী তালিকা লোড করা
      const { data: empData, error: empError } = await db.employees()
        .select(`
          *,
          categories(category_name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (empError) throw empError;
      setEmployees((empData as unknown as typeof employees) || []);

      // ক্যাটাগরি তালিকা লোড
      const { data: cData, error: cError } = await db.categories().select('*').eq('is_deleted', false);
      if (cError) throw cError;
      setCategories((cData as unknown as Category[]) || []);
    } catch (err) {
      console.error('Error loading employees page data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // মাউন্ট ইফেক্ট
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadData]);

  // নতুন কর্মচারী সাবমিট হ্যান্ডলার
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!fullName || !mobileNumber || !categoryId || !monthlySalary || !joiningDate) {
      setFormError('অনুগ্রহ করে সব তথ্য সঠিকভাবে পূরণ করুন।');
      return;
    }

    try {
      setSubmitting(true);
      
      // সিস্টেমে যদি কোনো ব্রাঞ্চ না থাকে, তবে একটি ডিফল্ট ব্রাঞ্চ তৈরি করে ব্যাকএন্ডে ম্যাপ করা হবে
      const { data: branches } = await db.branches().select('id').limit(1);
      let targetBranchId = '';
      
      if (!branches || branches.length === 0) {
        const { data: defBranch, error: bErr } = await db.branches().insert({
          branch_code: 'BR-MAIN',
          branch_name: 'প্রধান শাখা'
        }).select().single();
        if (bErr) throw bErr;
        targetBranchId = defBranch.id;
      } else {
        targetBranchId = branches[0].id;
      }

      // EmployeeService ব্যবহার করে নতুন এমপ্লয়ি তৈরি ও অডিট লগ জেনারেশন
      await EmployeeService.createEmployee({
        fullName,
        mobileNumber,
        branchId: targetBranchId,
        categoryId,
        joiningDate,
        monthlySalary: Number(monthlySalary),
        remarks,
      }, '00000000-0000-0000-0000-000000000000', 'এডিটর ম্যানেজার');

      setFullName('');
      setMobileNumber('');
      setCategoryId('');
      setMonthlySalary('');
      setRemarks('');
      setIsModalOpen(false);
      
      await loadData();
      alert('নতুন কর্মচারী সফলভাবে যুক্ত হয়েছে।');
    } catch (err: unknown) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  }

  // সার্চিং এবং ক্যাটাগরি ফিল্টারিং লজিক (উভয় কন্ডিশন একসাথে কাজ করবে)
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.mobile_number.includes(searchTerm);

    const matchesCategory = selectedCategoryFilter === '' || emp.category_id === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-bold text-gray-700">{"তথ্য লোড করা হচ্ছে..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* হেডার এরিয়া */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">{"কর্মচারী তালিকা"}</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">{"সব কর্মচারীদের ড্যাশবোর্ড ও প্রোফাইল অ্যাকশন"}</p>
        </div>
        <button
          onClick={() => {
            if (categories.length === 0) {
              alert('শুরু করার জন্য বাম পাশের মেনু থেকে "ক্যাটাগরি সমূহ"-এ গিয়ে অন্তত একটি ক্যাটাগরি তৈরি করে নিন।');
              return;
            }
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 px-5 py-3 text-base font-bold text-white shadow transition-all duration-150 cursor-pointer"
        >
          <Plus className="h-5 w-5 text-[#F4C430]" />
          <span>{"নতুন কর্মচারী যোগ করুন"}</span>
        </button>
      </div>

      {/* সার্চ ও ক্যাটাগরি ফিল্টার এরিয়া */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* সার্চ ইনপুট */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="নাম, কোড বা মোবাইল নম্বর দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-base font-bold text-gray-800 placeholder-gray-400 focus:border-[#8B0000] focus:outline-none"
          />
        </div>

        {/* ক্যাটাগরি ড্রপডাউন ফিল্টার */}
        <div className="w-full sm:w-64">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base font-bold text-gray-800 focus:border-[#8B0000] focus:outline-none cursor-pointer"
          >
            <option value="">{"সকল ক্যাটাগরি/বিভাগ"}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* কর্মচারী তালিকা গ্রিড (মোবাইলের জন্য কার্ড ভিউ) */}
      <div className="block md:hidden space-y-4">
        {filteredEmployees.length === 0 ? (
          <p className="text-center font-bold text-gray-500 py-12">{"কোনো কর্মচারী পাওয়া হয়নি।"}</p>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">{emp.full_name}</h3>
                  <span className="text-xs font-black text-gray-400">{emp.employee_code}</span>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                  emp.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {emp.status === 'active' ? 'বর্তমানে কর্মরত' : 'ছুটিতে আছেন'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm font-bold text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{emp.mobile_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>{emp.categories?.category_name || 'নাই'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>{emp.monthly_salary} {"টাকা"}</span>
                </div>
              </div>

              <Link
                href={`/dashboard/employees/${emp.id}`}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-gray-100 hover:bg-[#F4C430]/20 hover:text-black py-3 text-sm font-black text-gray-700 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>{"প্রোফাইল ও অ্যাকশন দেখুন"}</span>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* ডেক্সটপ ভিউ টেবিল */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b bg-gray-50 text-sm font-black text-gray-700">
              <th className="p-4">{"কোড"}</th>
              <th className="p-4">{"নাম"}</th>
              <th className="p-4">{"মোবাইল"}</th>
              <th className="p-4">{"ক্যাটাগরি/বিভাগ"}</th>
              <th className="p-4">{"মাসিক বেতন"}</th>
              <th className="p-4">{"স্ট্যাটাস"}</th>
              <th className="p-4 text-center">{"অ্যাকশন"}</th>
            </tr>
          </thead>
          <tbody className="divide-y text-base font-bold text-gray-800">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500 font-bold">{"কোনো কর্মচারী পাওয়া হয়নি।"}</td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/55 transition-colors">
                  <td className="p-4 font-black text-gray-400">{emp.employee_code}</td>
                  <td className="p-4 font-black">{emp.full_name}</td>
                  <td className="p-4">{emp.mobile_number}</td>
                  <td className="p-4">{emp.categories?.category_name || 'নাই'}</td>
                  <td className="p-4">{emp.monthly_salary} {"টাকা"}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
                      emp.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {emp.status === 'active' ? 'বর্তমানে কর্মরত' : 'ছুটিতে আছেন'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Link
                      href={`/dashboard/employees/${emp.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 hover:bg-[#F4C430]/20 px-3.5 py-2 text-sm font-black text-gray-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{"প্রোফাইল"}</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* নতুন কর্মচারী যোগ করার মডাল/পপআপ ফর্ম */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#8B0000]" />
                <span>{"নতুন কর্মচারী যোগ করুন"}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black focus:outline-none">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-base font-bold text-gray-700">
              {formError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm font-black text-red-600">{formError}</div>
              )}

              {/* নাম */}
              <div className="space-y-1">
                <label className="block">{"পূর্ণ নাম (বাংলায় লিখুন)"}</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: আব্দুর রহিম"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 focus:border-[#8B0000] focus:outline-none font-bold text-gray-800"
                />
              </div>

              {/* মোবাইল নম্বর */}
              <div className="space-y-1">
                <label className="block">{"মোবাইল নম্বর"}</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 01712345678"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 focus:border-[#8B0000] focus:outline-none font-bold text-gray-800"
                />
              </div>

              {/* ক্যাটাগরি */}
              <div className="space-y-1">
                <label className="block">{"ক্যাটাগরি / বিভাগ"}</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 p-2.5 focus:border-[#8B0000] focus:outline-none font-bold text-gray-800"
                >
                  <option value="">{"ক্যাটাগরি নির্বাচন করুন"}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>

              {/* মাসিক বেতন ও যোগদানের তারিখ */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block">{"মাসিক মূল বেতন"}</label>
                  <input
                    type="number"
                    required
                    placeholder="যেমন: 15000"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 focus:border-[#8B0000] focus:outline-none font-bold text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block">{"যোগদানের তারিখ"}</label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 focus:border-[#8B0000] focus:outline-none font-bold text-gray-800"
                  />
                </div>
              </div>

              {/* মন্তব্য */}
              <div className="space-y-1">
                <label className="block">{"মন্তব্য বা রিমার্কস (ঐচ্ছিক)"}</label>
                <textarea
                  placeholder="যেমন: কারিগর প্রধান"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 focus:border-[#8B0000] focus:outline-none font-bold text-gray-800"
                />
              </div>

              {/* সাবমিট বোতামসমূহ */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-3 text-center font-bold text-gray-600 hover:bg-gray-50 focus:outline-none cursor-pointer"
                >
                  {"বাতিল করুন"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 py-3 text-center font-bold text-white shadow focus:outline-none cursor-pointer"
                >
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}