import { db } from '@/app/lib/supabase/client';
import { SalaryAdvance } from '@/app/lib/supabase/types';
import { AuditService } from './audit';

export class AdvanceService {
  /**
   * কর্মচারীকে নতুন অগ্রিম বেতন যুক্ত করা
   */
  static async addAdvance(params: {
    employeeId: string;
    amount: number;
    month: string; // '01' - '12'
    year: string;  // '2026'
    reason?: string;
    adminId: string;
    adminName: string;
  }): Promise<SalaryAdvance> {
    const { data, error } = await db.salary_advances()
      .insert({
        employee_id: params.employeeId,
        amount: params.amount,
        advance_month: params.month,
        advance_year: params.year,
        reason: params.reason || null,
        created_by: params.adminId,
        is_deleted: false,
      })
      .select()
      .single();

    if (error) throw error;

    const createdAdvance = data as unknown as SalaryAdvance;

    // অডিট লগ
    await AuditService.logChange({
      tableName: 'salary_advances',
      recordId: createdAdvance.id,
      actionType: 'INSERT',
      newValues: createdAdvance as unknown as Record<string, unknown>,
      changeReason: `অগ্রিম প্রদান করা হয়েছে: ${params.amount} টাকা। মাস: ${params.month}-${params.year}`,
      createdBy: params.adminId,
      createdByName: params.adminName,
    });

    return createdAdvance;
  }

  /**
   * অগ্রিম এন্ট্রি সফট ডিলিট করা
   */
  static async deleteAdvance(
    advanceId: string,
    changeReason: string,
    adminId: string,
    adminName: string
  ): Promise<void> {
    const { data: oldData, error: getError } = await db.salary_advances()
      .select('*')
      .eq('id', advanceId)
      .single();

    if (getError) throw getError;

    const { error } = await db.salary_advances()
      .update({ is_deleted: true })
      .eq('id', advanceId);

    if (error) throw error;

    await AuditService.logChange({
      tableName: 'salary_advances',
      recordId: advanceId,
      actionType: 'SOFT_DELETE',
      oldValues: oldData as unknown as Record<string, unknown>,
      newValues: { is_deleted: true },
      changeReason,
      createdBy: adminId,
      createdByName: adminName,
    });
  }

  /**
   * নির্দিষ্ট কর্মচারীর অগ্রিম বেতনের তালিকা দেখা
   */
  static async getAdvancesByEmployee(employeeId: string): Promise<SalaryAdvance[]> {
    const { data, error } = await db.salary_advances()
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as unknown as SalaryAdvance[]) || [];
  }
}