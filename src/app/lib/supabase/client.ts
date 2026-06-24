import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * এই db হেল্পারটি টাইপস্ক্রিপ্টের ইন্টারনাল 'never' টাইপ এরর দূর করার জন্য তৈরি।
 * এটি কম্পাইলারকে ১০০% সন্তুষ্ট রাখবে এবং কোড রান টাইমে সঠিক ডেটা রিটার্ন করবে।
 */
export const db = {
  branches: () => supabase.from('branches'),
  categories: () => supabase.from('categories'),
  employees: () => supabase.from('employees'),
  employee_status_history: () => supabase.from('employee_status_history'),
  salary_advances: () => supabase.from('salary_advances'),
  payrolls: () => supabase.from('payrolls'),
  payroll_items: () => supabase.from('payroll_items'),
  pending_actions: () => supabase.from('pending_actions'),
  audit_logs: () => supabase.from('audit_logs'),
};