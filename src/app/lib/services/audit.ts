import { db } from '@/app/lib/supabase/client';
import { AuditLog } from '@/app/lib/supabase/types';

export class AuditService {
  /**
   * সিস্টেমে যেকোনো পরিবর্তন ট্র্যাকিং অডিট লগ জমা করার জন্য
   */
  static async logChange(params: {
    tableName: string;
    recordId: string;
    actionType: 'INSERT' | 'UPDATE' | 'SOFT_DELETE';
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    changeReason: string;
    createdBy?: string;
    createdByName?: string;
  }): Promise<void> {
    if (!params.changeReason || params.changeReason.trim() === '') {
      throw new Error('পরিবর্তনের কারণ উল্লেখ করা বাধ্যতামূলক।');
    }

    const { error } = await db.audit_logs().insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action_type: params.actionType,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      change_reason: params.changeReason,
      created_by: params.createdBy || null,
      created_by_name: params.createdByName || 'এআই ম্যানেজার',
    });

    if (error) {
      console.error('Audit log failed:', error);
      throw new Error(`অডিট লগ সংরক্ষণ করতে ব্যর্থ হয়েছে: ${error.message}`);
    }
  }

  /**
   * নির্দিষ্ট অডিট লগ হিস্ট্রি দেখার জন্য
   */
  static async getLogs(tableName?: string, limit = 50): Promise<AuditLog[]> {
    let query = db.audit_logs().select('*');

    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as unknown as AuditLog[]) || [];
  }
}