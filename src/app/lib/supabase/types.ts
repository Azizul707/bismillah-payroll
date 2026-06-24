export interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  is_active: boolean;
  created_at: string;
  is_deleted: boolean;
}

export interface Category {
  id: string;
  category_name: string;
  is_active: boolean;
  created_at: string;
  is_deleted: boolean;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  mobile_number: string;
  branch_id: string;
  category_id: string;
  joining_date: string;
  monthly_salary: number;
  status: 'active' | 'leave' | 'resigned';
  photo_url: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface EmployeeStatusHistory {
  id: string;
  employee_id: string;
  status: 'active' | 'leave' | 'resigned';
  start_date: string;
  end_date: string | null;
  leave_type: 'paid' | 'unpaid' | 'sick' | 'emergency' | 'suspension' | null;
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

export interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount: number;
  advance_month: string;
  advance_year: string;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  is_deleted: boolean;
}

export interface Payroll {
  id: string;
  payroll_month: string;
  payroll_year: string;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  unlock_reason: string | null;
  created_at: string;
}

export interface PayrollItem {
  id: string;
  payroll_id: string;
  employee_id: string;
  monthly_salary: number;
  daily_salary: number;
  duty_days: number;
  absent_days: number;
  bonus_days: number;
  gross_salary: number;
  advance_deducted: number;
  net_salary: number;
  created_at: string;
}

export interface PendingAction {
  id: string;
  action_type: string;
  raw_message: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action_type: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  change_reason: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}