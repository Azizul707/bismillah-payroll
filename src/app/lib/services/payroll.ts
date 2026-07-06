import { db } from '@/app/lib/supabase/client';
import { Payroll, PayrollItem, EmployeeStatusHistory, SalaryAdvance } from '@/app/lib/supabase/types';
import { AuditService } from './audit';

export class PayrollService {
  /**
   * নির্দিষ্ট মাস ও বছরের জন্য নির্দিষ্ট কর্মচারীর উপস্থিত দিন (Duty Days) এবং অনুপস্থিত দিন হিসেব করা (টাইমজোন-সেফ)
   */
  static async calculateDutyDays(
    employeeId: string,
    joiningDate: string, // YYYY-MM-DD
    month: string, // '01' - '12'
    year: string   // '2026'
  ): Promise<{ dutyDays: number; absentDays: number }> {
    const endOfMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0);
    const totalDaysInMonth = endOfMonth.getDate(); // ক্যালেন্ডার মাসের আসল দিন

    const endOfMonthStr = `${year}-${month}-${String(totalDaysInMonth).padStart(2, '0')}`;

    // ১. কর্মচারী যদি এই মাসের পর জয়েন করেন, তবে ডিউটি দিন ০
    if (joiningDate > endOfMonthStr) {
      return { dutyDays: 0, absentDays: 30 };
    }

    // ২. কর্মচারীর স্ট্যাটাস হিস্টোরি বা টাইমলাইন আনা
    const { data: timelineData, error } = await db.employee_status_history()
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: true });

    if (error) throw error;
    const history = (timelineData as unknown as EmployeeStatusHistory[]) || [];

    let absentDays = 0;
    let missedDaysDueToJoining = 0;

    // ৩. মাস জুড়ে প্রতিদিনের স্ট্যাটাস চেক করা (অ্যালগরিদম লুপ)
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currentDayStr = `${year}-${month}-${String(day).padStart(2, '0')}`;

      // ক. কর্মচারীর জয়েনিং ডেটের আগের দিনগুলো "missed days" হিসেবে গণ্য হবে
      if (currentDayStr < joiningDate) {
        missedDaysDueToJoining++;
        continue;
      }

      // খ. ওই নির্দিষ্ট দিনের জন্য কার্যকর স্ট্যাটাস খুঁজে বের করা (টাইমজোন-সেফ স্ট্রিং তুলনা)
      const activeStatus = history.find((record) => {
        const start = record.start_date; // YYYY-MM-DD
        const end = record.end_date || '9999-12-31'; // YYYY-MM-DD
        return currentDayStr >= start && currentDayStr <= end;
      });

      // গ. স্ট্যাটাস যদি 'leave' বা ছুটি হয় এবং তা যদি 'unpaid' (অবৈতনিক) বা 'suspension' হয়, তবে অনুপস্থিত
      if (activeStatus && activeStatus.status === 'leave') {
        if (activeStatus.leave_type === 'unpaid' || activeStatus.leave_type === 'suspension') {
          absentDays++;
        }
      }
    }

    // ৪. ৩০ দিনের ধ্রুবক নিয়ম (30-day Constant Divisor Rule) অনুযায়ী সমন্বয়
    const totalDeductedDays = absentDays + missedDaysDueToJoining;
    const dutyDays = Math.max(0, 30 - totalDeductedDays);

    return {
      dutyDays,
      absentDays: totalDeductedDays,
    };
  }

  /**
   * বোনাস দিন হিসাবের ফর্মুলা (Bonus Day Rules)
   */
  static calculateBonusDays(dutyDays: number): number {
    if (dutyDays >= 26) return 4;
    if (dutyDays >= 21) return 3;
    if (dutyDays >= 13) return 2;
    if (dutyDays >= 7) return 1;
    return 0;
  }

  /**
   * নির্দিষ্ট মাসের বেতন হিসেব জেনারেট করা (Sprint 2: batch queries)
   */
  static async generateMonthlyPayroll(
    month: string,
    year: string,
    adminId: string,
    adminName: string
  ): Promise<Payroll> {
    // ১. চেক করা মাসের হিসাব অলরেডি লকড কিনা
    const { data: existingPayroll, error: checkError } = await db.payrolls()
      .select('*')
      .eq('payroll_month', month)
      .eq('payroll_year', year)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingPayroll && existingPayroll.is_locked) {
      throw new Error('এই মাসের বেতন হিসাব ইতিমধ্যে ওনার দ্বারা সম্পন্ন ও লক করা হয়েছে। কোনো পরিবর্তন সম্ভব নয়।');
    }

    // ২. পে-রোল মাস্টার এন্ট্রি তৈরি বা আপডেট করা
    let payrollId = '';
    if (!existingPayroll) {
      const { data: newPayroll, error: createError } = await db.payrolls()
        .insert({
          payroll_month: month,
          payroll_year: year,
          is_locked: false,
        })
        .select()
        .single();

      if (createError) throw createError;
      payrollId = newPayroll.id;
    } else {
      payrollId = existingPayroll.id;
    }

    // ৩. পূর্বের পে-রোল আইটেমগুলো ক্লিয়ার করা নতুন করে জেনারেট করার জন্য
    const { error: deleteItemsError } = await db.payroll_items()
      .delete()
      .eq('payroll_id', payrollId);

    if (deleteItemsError) throw deleteItemsError;

    // ৪. সকল সক্রিয় কর্মচারীদের ডাটা আনা
    const { data: employees, error: empError } = await db.employees()
      .select('*')
      .eq('is_deleted', false);

    if (empError) throw empError;

    // ৫. (Sprint 2) সব কর্মচারীদের জন্য অগ্রিম টেবিল থেকে একসাথে bulk fetch
    const { data: advData, error: advError } = await db.salary_advances()
      .select('*')
      .eq('advance_month', month)
      .eq('advance_year', year)
      .eq('is_deleted', false);

    if (advError) throw advError;
    const allAdvances = (advData as SalaryAdvance[]) || [];

    // ৭. প্রতিটি কর্মচারীর বেতন হিসাব করা (in-memory filtering)
    for (const emp of employees) {
      // ক. ডিউটি এবং অনুপস্থিত দিন হিসেব (টাইমজোন-সেফ স্ট্রিং তুলনা)
      const { dutyDays, absentDays } = await this.calculateDutyDays(
        emp.id,
        emp.joining_date,
        month,
        year
      );

      // খ. বোনাস দিন হিসেব
      const bonusDays = this.calculateBonusDays(dutyDays);

      // গ. দৈনিক বেতন (Monthly Salary ÷ 30)
      const dailySalary = Number(emp.monthly_salary) / 30;

      // ঘ. গ্রস বেতন (Gross Salary = Daily Salary × Payable Days)
      const payableDays = dutyDays + bonusDays;
      const grossSalary = dailySalary * payableDays;

      // ঙ. (Sprint 2) in-memory advance filtering (no extra DB round-trip)
      const empAdvances = allAdvances.filter(adv => adv.employee_id === emp.id);
      const totalAdvance = empAdvances.reduce((acc, curr) => acc + Number(curr.amount), 0);

      // চ. নিট বেতন (Net Salary = Gross Salary − Advance Amount)
      const netSalary = Math.max(0, grossSalary - totalAdvance);

      // ছ. পে-রোল আইটেম টেবিলে ডাটা সংরক্ষণ করা
      const { error: itemInsertError } = await db.payroll_items().insert({
        payroll_id: payrollId,
        employee_id: emp.id,
        monthly_salary: emp.monthly_salary,
        daily_salary: Math.round(dailySalary * 100) / 100,
        duty_days: dutyDays,
        absent_days: absentDays,
        bonus_days: bonusDays,
        gross_salary: Math.round(grossSalary),
        advance_deducted: totalAdvance,
        net_salary: Math.round(netSalary),
      });

      if (itemInsertError) throw itemInsertError;
    }

    // ৮. অডিট লগ তৈরি
    await AuditService.logChange({
      tableName: 'payrolls',
      recordId: payrollId,
      actionType: 'INSERT',
      changeReason: `বেতন জেনারেশন করা হয়েছে। মাস: ${month}-${year}`,
      createdBy: adminId,
      createdByName: adminName,
    });

    const { data: updatedPayroll } = await db.payrolls().select('*').eq('id', payrollId).single();
    return updatedPayroll as unknown as Payroll;
  }

  /**
   * মাসের পে-রোল হিসাব সম্পন্ন ও লক করা (শুধুমাত্র ওনার করতে পারবেন)
   */
  static async lockPayroll(payrollId: string, ownerId: string, ownerName: string): Promise<void> {
    const { error } = await db.payrolls()
      .update({
        is_locked: true,
        locked_by: ownerId,
        locked_at: new Date().toISOString(),
      })
      .eq('id', payrollId);

    if (error) throw error;

    await AuditService.logChange({
      tableName: 'payrolls',
      recordId: payrollId,
      actionType: 'UPDATE',
      newValues: { is_locked: true },
      changeReason: 'মাসের হিসাব সফলভাবে সম্পন্ন ও লক করা হয়েছে।',
      createdBy: ownerId,
      createdByName: ownerName,
    });
  }

  /**
   * পে-রোল হিসাব আনলক করা (বাধ্যতামূলক কারণ সহ - শুধুমাত্র ওনার করতে পারবেন)
   */
  static async unlockPayroll(
    payrollId: string,
    unlockReason: string,
    ownerId: string,
    ownerName: string
  ): Promise<void> {
    const { error } = await db.payrolls()
      .update({
        is_locked: false,
        unlock_reason: unlockReason,
        locked_by: null,
        locked_at: null,
      })
      .eq('id', payrollId);

    if (error) throw error;

    await AuditService.logChange({
      tableName: 'payrolls',
      recordId: payrollId,
      actionType: 'UPDATE',
      newValues: { is_locked: false },
      changeReason: `বেতন হিসাব আনলক করা হয়েছে। কারণ: ${unlockReason}`,
      createdBy: ownerId,
      createdByName: ownerName,
    });
  }

  /**
   * Persistently update payment status of a payroll item in Supabase and log to audit
   */
  static async togglePaymentStatus(
    payrollItemId: string,
    isPaid: boolean,
    adminName: string
  ): Promise<void> {
    const paidAt = isPaid ? new Date().toISOString() : null;

    // 1. Update database
    const { error: updateErr } = await db.payroll_items()
      .update({
        is_paid: isPaid,
        paid_at: paidAt,
        paid_by_name: isPaid ? adminName : null
      })
      .eq('id', payrollItemId);

    if (updateErr) throw updateErr;

    // 2. Fetch employee details for audit logs
    const { data: itemData, error: fetchErr } = await db.payroll_items()
      .select('*, employees(full_name, employee_code)')
      .eq('id', payrollItemId)
      .single();

    if (fetchErr || !itemData) return;

    const empName = itemData.employees?.full_name || 'কর্মচারী';
    const empCode = itemData.employees?.employee_code || 'N/A';

    // 3. Save to system audit logs
    await db.audit_logs().insert({
      table_name: 'payroll_items',
      record_id: payrollItemId,
      action_type: 'UPDATE',
      new_values: { is_paid: isPaid, paid_at: paidAt },
      change_reason: isPaid
        ? `${empName} (${empCode}) এর বেতন পরিশোধ করা হয়েছে।`
        : `${empName} (${empCode}) এর বেতন পরিশোধ বাতিল করা হয়েছে।`,
      created_by_name: adminName
    });
  }
}