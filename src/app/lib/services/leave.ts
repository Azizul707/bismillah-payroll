import { db } from '@/app/lib/supabase/client';
import { EmployeeStatusHistory } from '@/app/lib/supabase/types';
import { AuditService } from './audit';

export class LeaveService {
  /**
   * কর্মচারীর ছুটি শুরু করা (ছুটি শুরু করুন)
   */
  static async startLeave(params: {
    employeeId: string;
    startDate: string; // YYYY-MM-DD
    leaveType: 'paid' | 'unpaid' | 'sick' | 'emergency' | 'suspension';
    reason: string;
    adminId: string;
    adminName: string;
  }): Promise<EmployeeStatusHistory> {
    // ১. আগের চলমান একটিভ টাইমলাইন রেকর্ডটির এন্ড ডেট (end_date) আপডেট করা (ছুটি শুরুর আগের দিন)
    const { data: currentTimeline, error: fetchError } = await db.employee_status_history()
      .select('*')
      .eq('employee_id', params.employeeId)
      .is('end_date', null)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const startDateObj = new Date(params.startDate);
    const dayBefore = new Date(startDateObj);
    dayBefore.setDate(startDateObj.getDate() - 1);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    if (currentTimeline) {
      const { error: updateError } = await db.employee_status_history()
        .update({ end_date: dayBeforeStr })
        .eq('id', currentTimeline.id);

      if (updateError) throw updateError;
    }

    // ২. নতুন ছুটির টাইমলাইন রেকর্ড তৈরি করা
    const { data: newTimeline, error: insertError } = await db.employee_status_history()
      .insert({
        employee_id: params.employeeId,
        status: 'leave',
        start_date: params.startDate,
        end_date: null,
        leave_type: params.leaveType,
        reason: params.reason,
        created_by: params.adminId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ৩. কর্মচারী টেবিলে কর্মচারীর বর্তমান স্ট্যাটাস 'leave' এ পরিবর্তন করা
    const { error: empUpdateError } = await db.employees()
      .update({ status: 'leave' })
      .eq('id', params.employeeId);

    if (empUpdateError) throw empUpdateError;

    // ৪. অডিট লগ সংরক্ষণ
    await AuditService.logChange({
      tableName: 'employee_status_history',
      recordId: (newTimeline as unknown as EmployeeStatusHistory).id,
      actionType: 'INSERT',
      newValues: newTimeline as unknown as Record<string, unknown>,
      changeReason: `ছুটি শুরু: ${params.leaveType} ছুটি, কারণ: ${params.reason}`,
      createdBy: params.adminId,
      createdByName: params.adminName,
    });

    return newTimeline as unknown as EmployeeStatusHistory;
  }

  /**
   * ছুটি শেষে কর্মচারীকে পুনরায় কাজে যোগদান করানো (কাজে যোগদান)
   */
  static async resumeDuty(params: {
    employeeId: string;
    resumeDate: string; // YYYY-MM-DD
    adminId: string;
    adminName: string;
  }): Promise<EmployeeStatusHistory> {
    // ১. চলমান ছুটির টাইমলাইনটির শেষ দিন (end_date) আপডেট করা (যোগদানের আগের দিন)
    const { data: currentTimeline, error: fetchError } = await db.employee_status_history()
      .select('*')
      .eq('employee_id', params.employeeId)
      .is('end_date', null)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const resumeDateObj = new Date(params.resumeDate);
    const dayBefore = new Date(resumeDateObj);
    dayBefore.setDate(resumeDateObj.getDate() - 1);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    if (currentTimeline) {
      const { error: updateError } = await db.employee_status_history()
        .update({ end_date: dayBeforeStr })
        .eq('id', currentTimeline.id);

      if (updateError) throw updateError;
    }

    // ২. নতুন একটিভ ডিউটি টাইমলাইন রেকর্ড তৈরি করা
    const { data: newTimeline, error: insertError } = await db.employee_status_history()
      .insert({
        employee_id: params.employeeId,
        status: 'active',
        start_date: params.resumeDate,
        end_date: null,
        leave_type: null,
        reason: 'ছুটি শেষে কাজে যোগদান',
        created_by: params.adminId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ৩. কর্মচারী টেবিলে কর্মচারীর বর্তমান স্ট্যাটাস 'active' এ পরিবর্তন করা
    const { error: empUpdateError } = await db.employees()
      .update({ status: 'active' })
      .eq('id', params.employeeId);

    if (empUpdateError) throw empUpdateError;

    // ৪. অডিট লগ সংরক্ষণ
    await AuditService.logChange({
      tableName: 'employee_status_history',
      recordId: (newTimeline as unknown as EmployeeStatusHistory).id,
      actionType: 'INSERT',
      newValues: newTimeline as unknown as Record<string, unknown>,
      changeReason: `ছুটি সম্পন্ন করে কাজে যোগদান করা হয়েছে। তারিখ: ${params.resumeDate}`,
      createdBy: params.adminId,
      createdByName: params.adminName,
    });

    return newTimeline as unknown as EmployeeStatusHistory;
  }

  /**
   * নির্দিষ্ট কর্মচারীর সমস্ত ছুটির ইতিহাস দেখা
   */
  static async getLeaveHistory(employeeId: string): Promise<EmployeeStatusHistory[]> {
    const { data, error } = await db.employee_status_history()
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'leave')
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data as unknown as EmployeeStatusHistory[]) || [];
  }
}