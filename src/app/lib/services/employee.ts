import { db } from '@/app/lib/supabase/client';
import { Employee } from '@/app/lib/supabase/types';
import { AuditService } from './audit';

export class EmployeeService {
  /**
   * নতুন কর্মচারী যুক্ত করা এবং ইউনিক এমপ্লয়ি কোড জেনারেট করা
   */
  static async createEmployee(
    employee: {
      fullName: string;
      mobileNumber: string;
      branchId: string;
      categoryId: string;
      joiningDate: string;
      monthlySalary: number;
      remarks?: string;
    },
    adminId: string,
    adminName: string
  ): Promise<Employee> {
    // ১. পরবর্তী অটো ইনক্রিমেন্ট কোড বের করা (যেমন: BIS-1001)
    const { data: countData, error: countError } = await db.employees()
      .select('employee_code')
      .order('created_at', { ascending: false })
      .limit(1);

    if (countError) throw countError;

    let nextNumber = 1001;
    if (countData && countData.length > 0) {
      const lastCode = (countData[0] as { employee_code: string }).employee_code;
      const match = lastCode.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    const employeeCode = `BIS-${nextNumber}`;

    // ২. নতুন কর্মচারী ইনসার্ট করা
    const { data, error } = await db.employees()
      .insert({
        employee_code: employeeCode,
        full_name: employee.fullName,
        mobile_number: employee.mobileNumber,
        branch_id: employee.branchId,
        category_id: employee.categoryId,
        joining_date: employee.joiningDate,
        monthly_salary: employee.monthlySalary,
        status: 'active',
        remarks: employee.remarks || null,
        is_deleted: false,
      })
      .select()
      .single();

    if (error) throw error;

    const createdEmployee = data as unknown as Employee;

    // ৩. ডিফল্ট ডিউটি টাইমলাইন (Active) তৈরি করা
    const { error: timelineError } = await db.employee_status_history()
      .insert({
        employee_id: createdEmployee.id,
        status: 'active',
        start_date: employee.joiningDate,
        reason: 'যোগদান উপলক্ষে সয়ংক্রিয় সক্রিয়',
        created_by: adminId,
      });

    if (timelineError) throw timelineError;

    // ৪. অডিট লগ তৈরি
    await AuditService.logChange({
      tableName: 'employees',
      recordId: createdEmployee.id,
      actionType: 'INSERT',
      newValues: createdEmployee as unknown as Record<string, unknown>,
      changeReason: 'নতুন কর্মচারী যুক্ত করা হয়েছে।',
      createdBy: adminId,
      createdByName: adminName,
    });

    return createdEmployee;
  }

  /**
   * কর্মচারীর তথ্য আপডেট করা (বাধ্যতামূলক কারণ সহ)
   */
  static async updateEmployee(
    id: string,
    updates: {
      fullName?: string;
      mobileNumber?: string;
      branchId?: string;
      categoryId?: string;
      monthlySalary?: number;
      remarks?: string;
    },
    changeReason: string,
    adminId: string,
    adminName: string
  ): Promise<Employee> {
    // ১. আগের ডাটা রিড করা অডিটের জন্য
    const { data: oldData, error: getError } = await db.employees()
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    // ২. আপডেট ডাটা প্রস্তুত করা
    const { data: newData, error: updateError } = await db.employees()
      .update({
        full_name: updates.fullName,
        mobile_number: updates.mobileNumber,
        branch_id: updates.branchId,
        category_id: updates.categoryId,
        monthly_salary: updates.monthlySalary,
        remarks: updates.remarks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const updatedEmployee = newData as unknown as Employee;

    // ৩. অডিট লগ সংরক্ষণ
    await AuditService.logChange({
      tableName: 'employees',
      recordId: id,
      actionType: 'UPDATE',
      oldValues: oldData as unknown as Record<string, unknown>,
      newValues: updatedEmployee as unknown as Record<string, unknown>,
      changeReason,
      createdBy: adminId,
      createdByName: adminName,
    });

    return updatedEmployee;
  }

  /**
   * কর্মচারীকে সফট ডিলিট করা
   */
  static async deleteEmployee(
    id: string,
    changeReason: string,
    adminId: string,
    adminName: string
  ): Promise<void> {
    const { data: oldData, error: getError } = await db.employees()
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    const { error } = await db.employees()
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) throw error;

    await AuditService.logChange({
      tableName: 'employees',
      recordId: id,
      actionType: 'SOFT_DELETE',
      oldValues: oldData as unknown as Record<string, unknown>,
      newValues: { is_deleted: true },
      changeReason,
      createdBy: adminId,
      createdByName: adminName,
    });
  }

  /**
   * সকল সক্রিয় কর্মচারীদের তালিকা দেখা (ব্রাঞ্চ ও ক্যাটাগরি নাম সহ)
   */
  static async getAllEmployees(): Promise<Employee[]> {
    const { data, error } = await db.employees()
      .select(`
        *,
        branches(branch_name),
        categories(category_name)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as unknown as Employee[]) || [];
  }
}