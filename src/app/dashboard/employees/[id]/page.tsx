'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  History, 
  Pencil, 
  CalendarCheck, 
  CalendarX, 
  Coins,
  Trash2
} from 'lucide-react';
import { db } from '@/app/lib/supabase/client';
import { Employee, EmployeeStatusHistory, SalaryAdvance, Category } from '@/app/lib/supabase/types';
import { EmployeeService } from '@/app/lib/services/employee';
import { LeaveService } from '@/app/lib/services/leave';
import { AdvanceService } from '@/app/lib/services/advance';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EmployeeProfilePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [timeline, setTimeline] = useState<EmployeeStatusHistory[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // মোডাল ও ফর্ম স্টেটস
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // ডিলিট মোডাল স্টেট

  // ফর্ম ফিল্ড স্টেটস
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [joiningDate, setJoiningDate] = useState(''); // যোগদানের তারিখ এডিটের জন্য নতুন স্টেট
  const [monthlySalary, setMonthlySalary] = useState('');
  const [remarks, setRemarks] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [deleteReason, setDeleteReason] = useState(''); // ডিলিট করার কারণ স্টেট
  
  const [leaveStartDate, setLeaveStartDate] = useState('2026-06-24');
  const [leaveType, setLeaveType] = useState<'paid' | 'unpaid' | 'sick' | 'emergency' | 'suspension'>('unpaid');
  const [leaveReason, setLeaveReason] = useState('');

  const [resumeDate, setResumeDate] = useState('2026-06-24');

  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // সেশন থেকে বর্তমানে প্রবেশকৃত ইউজারের নাম ও রোল ডাইনামিকভাবে ট্র্যাক করার মেথড
  const getCurrentUserName = useCallback(() => {
    if (typeof window !== 'undefined') {
      const currentUserStr = localStorage.getItem('bismillah_current_user');
      if (currentUserStr) {
        try {
          const parsed = JSON.parse(currentUserStr);
          return `${parsed.role === 'owner' ? 'মালিক' : 'ম্যানেজার'} ${parsed.name}`;
        } catch (e) {
          console.error('Error parsing session user:', e);
        }
      }
    }
    return 'এডিটর ম্যানেজার';
  }, []);

  // প্রোফাইল ডাটা লোড ফাংশন (মেমোইজড ও অ্যাসিনক্রোনাস মাইক্রোটাস্ক হ্যান্ডলার)
  const loadProfileData = useCallback(async () => {
    await Promise.resolve(); 

    // 🛡️ অত্যন্ত শক্তিশালী UUID ভ্যালিডেশন চেক (যাতে categories বা অন্য কোনো টেক্সট আসলে ডাটাবেজ ক্র্যাশ না করে)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(employeeId)) {
      router.push('/dashboard/employees');
      return;
    }

    try {
      setLoading(true);

      // ১. কর্মচারীর মৌলিক তথ্য লোড
      const { data: empData, error: empErr } = await db.employees()
        .select('*')
        .eq('id', employeeId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (empErr) throw empErr;
      if (!empData) {
        alert('কর্মচারী খুঁজে পাওয়া যায়নি।');
        router.push('/dashboard/employees');
        return;
      }

      const activeEmp = empData as unknown as Employee;
      setEmployee(activeEmp);

      // ফর্ম প্রি-ফিল সেটআপ
      setFullName(activeEmp.full_name);
      setMobileNumber(activeEmp.mobile_number);
      setCategoryId(activeEmp.category_id);
      setJoiningDate(activeEmp.joining_date); // যোগদানের তারিখ ইনিশিয়ালাইজ করা হলো
      setMonthlySalary(activeEmp.monthly_salary.toString());
      setRemarks(activeEmp.remarks || '');

      // ২. কাজের টাইমলাইন/ছুটির ইতিহাস লোড
      const { data: timelineData, error: timeErr } = await db.employee_status_history()
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });
      if (timeErr) throw timeErr;
      setTimeline((timelineData as unknown as EmployeeStatusHistory[]) || []);

      // ৩. অগ্রিম বেতনের তালিকা লোড
      const { data: advData, error: advErr } = await db.salary_advances()
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (advErr) throw advErr;
      setAdvances((advData as unknown as SalaryAdvance[]) || []);

      // ৪. ড্রপডাউনের জন্য ক্যাটাগরি লোড
      const { data: cData } = await db.categories().select('*').eq('is_deleted', false);
      setCategories((cData as unknown as Category[]) || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, router]);

  // মাউন্ট ইফেক্ট
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadProfileData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadProfileData]);

  // ক. তথ্য পরিবর্তন হ্যান্ডলার
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!changeReason) {
      setErrorMsg('정보 পরিবর্তনের কারণ উল্লেখ করা বাধ্যতামূলক।');
      return;
    }
    try {
      setSubmitting(true);
      await EmployeeService.updateEmployee(
        employeeId,
        {
          fullName,
          mobileNumber,
          categoryId,
          joiningDate, // যোগদানের তারিখ পরিবর্তনের রিকোয়েস্টে পাঠানো হলো
          monthlySalary: Number(monthlySalary),
          remarks
        },
        changeReason,
        '00000000-0000-0000-0000-000000000000',
        getCurrentUserName()
      );
      setIsEditModalOpen(false);
      setChangeReason('');
      await loadProfileData();
      alert('তথ্য সফলভাবে আপডেট হয়েছে।');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'আপডেট করতে ত্রুটি হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  }

  // খ. ছুটি শুরু করার হ্যান্ডলার
  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveReason) {
      setErrorMsg('ছুটি মঞ্জুরের কারণ উল্লেখ করা বাধ্যতামূলক।');
      return;
    }
    try {
      setSubmitting(true);
      await LeaveService.startLeave({
        employeeId,
        startDate: leaveStartDate,
        leaveType,
        reason: leaveReason,
        adminId: '00000000-0000-0000-0000-000000000000',
        adminName: getCurrentUserName()
      });
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      await loadProfileData();
      alert('ছুটি সফলভাবে রেকর্ড করা হয়েছে।');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ছুটি শুরু করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  }

  // গ. কাজে যোগদানের হ্যান্ডলার
  async function handleResumeSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      await LeaveService.resumeDuty({
        employeeId,
        resumeDate,
        adminId: '00000000-0000-0000-0000-000000000000',
        adminName: getCurrentUserName()
      });
      setIsResumeModalOpen(false);
      await loadProfileData();
      alert('কাজে যোগদান সফলভাবে নথিভুক্ত হয়েছে।');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'কাজে যোগদান সম্পন্ন করতে ত্রুটি হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  }

  // ঘ. অগ্রিম বেতন যুক্ত করার হ্যান্ডলার
  async function handleAdvanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const currentMonth = '06';
      const currentYear = '2026';
      await AdvanceService.addAdvance({
        employeeId,
        amount: Number(advanceAmount),
        month: currentMonth,
        year: currentYear,
        reason: advanceReason,
        adminId: '00000000-0000-0000-0000-000000000000',
        adminName: getCurrentUserName()
      });
      setIsAdvanceModalOpen(false);
      setAdvanceAmount('');
      setAdvanceReason('');
      await loadProfileData();
      alert('অগ্রিম বেতন সফলভাবে যুক্ত করা হয়েছে।');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'অগ্রিম যুক্ত করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  }

  // ঙ. প্রোফাইল সফট ডিলিট করার হ্যান্ডলার (অডিট লগসহ)
  async function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteReason.trim()) {
      setErrorMsg('প্রোফাইল ডিলিট করার কারণ উল্লেখ করা বাধ্যতামূলক।');
      return;
    }
    try {
      setSubmitting(true);

      // ১. employees টেবিলে is_deleted = true করা
      const { error: deleteErr } = await db.employees()
        .update({ is_deleted: true })
        .eq('id', employeeId);

      if (deleteErr) throw deleteErr;

      // ২. অডিট লগে ডিলিট ট্র্যাকার এন্ট্রি করা
      const { error: auditErr } = await db.audit_logs().insert({
        table_name: 'employees',
        record_id: employeeId,
        action_type: 'SOFT_DELETE',
        old_values: employee,
        new_values: { is_deleted: true },
        change_reason: deleteReason,
        created_by_name: getCurrentUserName()
      });

      if (auditErr) throw auditErr;

      setIsDeleteModalOpen(false);
      setDeleteReason('');
      alert('কর্মচারীর প্রোফাইল সফলভাবে ডিলিট করা হয়েছে।');
      router.push('/dashboard/employees'); // ডিলিট হওয়ার পর কর্মচারীদের তালিকায় ব্যাক করবে

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ডিলিট করতে অভ্যন্তরীণ ত্রুটি হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !employee) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-bold text-gray-700">{"তথ্য লোড হচ্ছে..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ব্যাক বোতাম ও হেডার */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Link href="/dashboard/employees" className="rounded-lg border p-2 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-[#8B0000]" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">{employee.full_name}</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">{"কোড:"} {employee.employee_code} {"| কাজের তথ্য ও হিস্ট্রি"}</p>
        </div>
      </div>

      {/* কর্মচারীর মৌলিক তথ্য গ্রিড */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* বাম কলাম: ব্যক্তিগত তথ্য */}
        <div className="md:col-span-2 rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-2">
            <User className="h-5 w-5 text-gray-400" />
            <span>{"ব্যক্তিগত ও পেশাগত তথ্য"}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base font-bold text-gray-700">
            <div className="flex items-center gap-2.5">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400 font-bold">{"মোবাইল নম্বর"}</p>
                <span>{employee.mobile_number}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400 font-bold">{"স্টাফ ক্যাটাগরি"}</p>
                <span>{categories.find(c => c.id === employee.category_id)?.category_name || 'নাই'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400 font-bold">{"যোগদানের তারিখ"}</p>
                <span>{employee.joining_date}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs text-gray-400 font-bold">{"অন্যান্য মন্তব্য"}</h3>
            <p className="text-base font-bold text-gray-800 mt-1">{employee.remarks || 'কোনো মন্তব্য নেই।'}</p>
          </div>
        </div>

        {/* ডান কলাম: বেতন স্ট্যাটাস ও ওয়ান-ক্লিক অ্যাকশন */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span>{"বেতন ও কাজের স্ট্যাটাস"}</span>
            </h2>
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-500">{"মাসিক বেতন:"}</span>
              <span className="text-2xl font-black text-gray-900">{employee.monthly_salary} {"টাকা"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-500">{"বর্তমান স্ট্যাটাস:"}</span>
              <span className={`rounded-full px-3 py-1 text-sm font-black ${
                employee.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {employee.status === 'active' ? 'বর্তমানে কর্মরত' : 'ছুটিতে আছেন'}
              </span>
            </div>
          </div>

          {/* ওয়ান-ক্লিক কুইক অ্যাকশন বাটনসমূহ */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t">
            {employee.status === 'active' ? (
              <button
                onClick={() => { setIsLeaveModalOpen(true); setErrorMsg(''); }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/50 p-3 text-center transition-colors cursor-pointer"
              >
                <CalendarX className="h-6 w-6 text-amber-700" />
                <span className="text-sm font-black text-amber-900">{"ছুটি শুরু করুন"}</span>
              </button>
            ) : (
              <button
                onClick={() => { setIsResumeModalOpen(true); setErrorMsg(''); }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100/50 p-3 text-center transition-colors cursor-pointer"
              >
                <CalendarCheck className="h-6 w-6 text-green-700" />
                <span className="text-sm font-black text-green-900">{"কাজে যোগদান"}</span>
              </button>
            )}

            <button
              onClick={() => { setIsAdvanceModalOpen(true); setErrorMsg(''); }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100/50 p-3 text-center transition-colors cursor-pointer"
            >
              <Coins className="h-6 w-6 text-[#8B0000]" />
              <span className="text-sm font-black text-red-900">{"অগ্রিম প্রদান"}</span>
            </button>

            <button
              onClick={() => { setIsEditModalOpen(true); setErrorMsg(''); }}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-center hover:bg-gray-50 text-sm font-black text-gray-700 transition-colors cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              <span>{"তথ্য পরিবর্তন করুন"}</span>
            </button>

            {/* প্রোফাইল ডিলিট করার নতুন বাটন */}
            <button
              onClick={() => { setIsDeleteModalOpen(true); setDeleteReason(''); setErrorMsg(''); }}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 py-3 text-center text-sm font-black text-red-700 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>{"প্রোফাইল ডিলিট করুন"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ছুটি ও অগ্রিম হিস্ট্রি ট্যাব বা গ্রিড */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ১. কাজের টাইমলাইন / ছুটির ইতিহাস */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-2">
            <History className="h-5 w-5 text-gray-400" />
            <span>{"হাজিরা ও কাজের টাইমলাইন"}</span>
          </h2>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {timeline.length === 0 ? (
              <p className="text-center font-bold text-gray-400 py-8">{"কোনো টাইমলাইন রেকর্ড পাওয়া যায়নি।"}</p>
            ) : (
              timeline.map((item) => (
                <div key={item.id} className="flex gap-4 border-l-2 border-gray-100 pl-4 pb-2 relative">
                  <div className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ${
                    item.status === 'active' ? 'bg-green-500' : 'bg-amber-500'
                  }`} />
                  <div className="text-base font-bold text-gray-700">
                    <p className="font-black text-gray-950">
                      {item.status === 'active' ? 'ডিউটিতে সক্রিয়' : 'ছুটি শুরু'} 
                      {item.leave_type && ` (ছুটি: ${item.leave_type === 'unpaid' ? 'অবৈতনিক' : 'অন্যান্য'})`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{"শুরু:"} {item.start_date} {item.end_date ? `| শেষ: ${item.end_date}` : '| চলমান'}</p>
                    {item.reason && <p className="text-sm text-gray-500 mt-1">{"কারণ:"} {item.reason}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ২. অগ্রিম বেতন হিস্ট্রি */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-2">
            <Coins className="h-5 w-5 text-gray-400" />
            <span>{"অগ্রিম বেতন ইতিহাস"}</span>
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {advances.length === 0 ? (
              <p className="text-center font-bold text-gray-400 py-8">{"কোনো অগ্রিম বেতন রেকর্ড পাওয়া যায়নি।"}</p>
            ) : (
              advances.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-4 border border-gray-100">
                  <div className="text-base font-bold text-gray-700">
                    <p className="font-black text-gray-950">{item.amount} {"টাকা"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{"মাস:"} {item.advance_month}-{item.advance_year}</p>
                    {item.reason && <p className="text-sm text-gray-500 mt-1">{"কারণ:"} {item.reason}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      const reason = prompt('অগ্রিম ডিলেট করার কারণ লিখুন:');
                      if (!reason) return;
                      try {
                        await AdvanceService.deleteAdvance(item.id, reason, '00000000-0000-0000-0000-000000000000', getCurrentUserName());
                        await loadProfileData();
                        alert('অগ্রিম ডিলিট করা হয়েছে।');
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'ডিলিট করতে ত্রুটি হয়েছে।');
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-black cursor-pointer"
                  >
                    {"মুছে ফেলুন"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* ১. ছুটি শুরু করার মডাল (Leave Modal) */}
      {/* ========================================== */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-amber-600" />
              <span>{"ছুটি শুরু করুন"}</span>
            </h2>
            <form onSubmit={handleLeaveSubmit} className="space-y-4 text-base font-bold text-gray-700">
              {errorMsg && <div className="rounded-lg bg-red-50 p-3 text-sm font-black text-red-600">{errorMsg}</div>}
              
              <div className="space-y-1">
                <label className="block">{"ছুটি শুরু হওয়ার তারিখ"}</label>
                <input
                  type="date"
                  required
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block">{"ছুটির ধরণ"}</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as 'unpaid')}
                  className="w-full rounded-lg border p-2.5 font-bold"
                >
                  <option value="unpaid">{"অবৈতনিক ছুটি (Unpaid) - বেতন থেকে কাটা যাবে"}</option>
                  <option value="paid">{"বৈতনিক ছুটি (Paid) - পূর্ণ বেতন পাবেন"}</option>
                  <option value="sick">{"অসুস্থতাজনিত ছুটি (Sick)"}</option>
                  <option value="emergency">{"জরুরি পরিস্থিতি ছুটি (Emergency)"}</option>
                  <option value="suspension">{"সাময়িক বরখাস্ত (Suspension) - বেতন কাটা যাবে"}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block">{"ছুটি মঞ্জুরের কারণ (বাধ্যতামূলক)"}</label>
                <textarea
                  required
                  placeholder="যেমন: গ্রামে যাবে জরুরি কাজে"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="flex-1 rounded-lg border py-3 font-bold cursor-pointer">{"বাতিল"}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-[#8B0000] text-white py-3 font-bold cursor-pointer">
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'ছুটি শুরু করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ২. কাজে যোগদানের মডাল (Resume Duty Modal) */}
      {/* ========================================== */}
      {isResumeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-green-600" />
              <span>{"কাজে যোগদান"}</span>
            </h2>
            <form onSubmit={handleResumeSubmit} className="space-y-4 text-base font-bold text-gray-700">
              {errorMsg && <div className="rounded-lg bg-red-50 p-3 text-sm font-black text-red-600">{errorMsg}</div>}
              
              <div className="space-y-1">
                <label className="block">{"যোগদানের তারিখ"}</label>
                <input
                  type="date"
                  required
                  value={resumeDate}
                  onChange={(e) => setResumeDate(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button type="button" onClick={() => setIsResumeModalOpen(false)} className="flex-1 rounded-lg border py-3 font-bold cursor-pointer">{"বাতিল"}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-green-700 text-white py-3 font-bold cursor-pointer">
                  {submitting ? 'যোগদান হচ্ছে...' : 'যোগদান করান'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ৩. অগ্রিম প্রদানের মডাল (Advance Modal) */}
      {/* ========================================== */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <Coins className="h-5 w-5 text-[#8B0000]" />
              <span>{"অগ্রিম বেতন প্রদান"}</span>
            </h2>
            <form onSubmit={handleAdvanceSubmit} className="space-y-4 text-base font-bold text-gray-700">
              {errorMsg && <div className="rounded-lg bg-red-50 p-3 text-sm font-black text-red-600">{errorMsg}</div>}
              
              <div className="space-y-1">
                <label className="block">{"টাকার পরিমাণ (ইংলিশ সংখ্যায়)"}</label>
                <input
                  type="number"
                  required
                  placeholder="যেমন: 5000"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block">{"অগ্রিমের কারণ (ঐচ্ছিক)"}</label>
                <textarea
                  placeholder="যেমন: পারিবারিক জরুরি অবস্থা"
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 rounded-lg border py-3 font-bold cursor-pointer">{"বাতিল"}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-[#8B0000] text-white py-3 font-bold cursor-pointer">
                  {submitting ? 'যোগ হচ্ছে...' : 'অগ্রিম যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ৪. তথ্য পরিবর্তন মডাল (Edit Info Modal) */}
      {/* ========================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-gray-500" />
              <span>{"তথ্য পরিবর্তন করুন"}</span>
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-base font-bold text-gray-700">
              {errorMsg && <div className="rounded-lg bg-red-50 p-3 text-sm font-black text-red-600">{errorMsg}</div>}
              
              <div className="space-y-1">
                <label className="block">{"পূর্ণ নাম"}</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block">{"মোবাইল নম্বর"}</label>
                <input
                  type="text"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              {/* ক্যাটাগরি */}
              <div className="space-y-1">
                <label className="block">{"ক্যাটাগরি"}</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>

              {/* যোগদানের তারিখ (নতুন অপশন যুক্ত করা হয়েছে) */}
              <div className="space-y-1">
                <label className="block">{"যোগদানের তারিখ"}</label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block">{"মাসিক বেতন"}</label>
                <input
                  type="number"
                  required
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block">{"অন্যান্য মন্তব্য"}</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              {/* obligatoire audit */}
              <div className="space-y-1 bg-red-50 p-3 rounded-lg border border-red-100">
                <label className="block text-red-900 font-black">{"পরিবর্তনের কারণ (বাধ্যতামূলক)"}</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ভুল বেতন সংশোধন বা প্রোমোশন"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full rounded-lg border bg-white p-2.5 font-bold text-gray-800"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 rounded-lg border py-3 font-bold cursor-pointer">{"বাতিল"}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-[#8B0000] text-white py-3 font-bold cursor-pointer">
                  {submitting ? 'আপডেট হচ্ছে...' : 'তথ্য সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ৫. প্রোফাইল ডিলিট মডাল (Delete Profile Modal) */}
      {/* ========================================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <span>{"প্রোফাইল ডিলিট করুন"}</span>
            </h2>
            <form onSubmit={handleDeleteSubmit} className="space-y-4 text-base font-bold text-gray-700">
              {errorMsg && <div className="rounded-lg bg-red-50 p-3 text-sm font-black text-red-600">{errorMsg}</div>}
              
              <div className="space-y-1 bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-sm font-black text-red-900">
                  {"সতর্কতা: প্রোফাইল ডিলিট করলে কর্মচারী নিষ্ক্রিয় হয়ে যাবে এবং তালিকায় দেখা যাবে না। তবে অতীতের বেতন পরিশোধ বা অগ্রিমের ইতিহাস সুরক্ষিত থাকবে।"}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-red-950">{"ডিলিট করার সুনির্দিষ্ট কারণ (বাধ্যতামূলক)"}</label>
                <textarea
                  required
                  placeholder="যেমন: চাকরি ছেড়ে চলে গেছেন বা ভুল তথ্য দিয়ে অ্যাকাউন্ট খোলা হয়েছিল।"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full rounded-lg border p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 rounded-lg border py-3 font-bold cursor-pointer">{"বাতিল"}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-red-600 text-white py-3 font-bold cursor-pointer">
                  {submitting ? 'ডিলিট হচ্ছে...' : 'প্রোফাইল ডিলিট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}