import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, supabase } from '@/app/lib/supabase/client';
import { Employee } from '@/app/lib/supabase/types';
import { AdvanceService } from '@/app/lib/services/advance';
import { LeaveService } from '@/app/lib/services/leave';
import { PayrollService } from '@/app/lib/services/payroll';

// ১. এপিআই রিকোয়েস্ট ভ্যালিডেশন জোড স্কিমা
const aiRequestSchema = z.object({
  phase: z.enum(['draft', 'confirm']),
  pending_action_id: z.string().optional(),
  action: z.enum([
    'add_advance',
    'start_leave',
    'resume_duty',
    'generate_payroll',
    'lock_payroll',
    'unlock_payroll'
  ]),
  raw_message: z.string(),
  parameters: z.object({
    employee_name: z.string().optional(),
    amount: z.number().optional(),
    date: z.string().optional(), // Expected format: 'DD-MM-YYYY'
    leave_type: z.enum(['paid', 'unpaid', 'sick', 'emergency', 'suspension']).optional(),
    reason: z.string().optional(),
    month: z.string().optional(), // '01'-'12'
    year: z.string().optional()   // '2026'
  }).optional()
});

// তারিখ ফরম্যাট পরিবর্তন (DD-MM-YYYY -> YYYY-MM-DD)
function convertDateToDBFormat(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
  }
  return dateStr;
}

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
    // জোড স্কিমা দিয়ে ডাটা ভ্যালিডেট করা
    const validatedData = aiRequestSchema.parse(rawBody);
    const { phase, action, raw_message, parameters, pending_action_id } = validatedData;

    // টেম্পোরারি বা ডিফল্ট এডমিন তথ্য (বাস্তব ক্ষেত্রে এটি লগইন সেশন থেকে আসবে)
    const adminId = '00000000-0000-0000-0000-000000000000';
    const adminName = 'এআই ম্যানেজার (টেলিগ্রাম)';

    // ==========================================
    // ধাপ ১: খসড়া বা ড্রাফট ফেজ (Phase: Draft)
    // ==========================================
    if (phase === 'draft') {
      if (!parameters) {
        return NextResponse.json({ success: false, error: 'Parameters are required in draft phase' }, { status: 400 });
      }

      let employee: Employee | null = null;

      // ক. কর্মচারীর নাম থাকলে তা খুঁজে বের করা (নামের জটিলতা নিরসন লজিক)
      if (parameters.employee_name) {
        const { data: matchedEmployees, error: empError } = await db.employees()
          .select(`
            *,
            branches(branch_name),
            categories(category_name)
          `)
          .eq('is_deleted', false)
          .ilike('full_name', `%${parameters.employee_name}%`);

        if (empError) throw empError;

        const empList = (matchedEmployees || []) as unknown as Array<Employee & { 
          branches: { branch_name: string }; 
          categories: { category_name: string }; 
        }>;

        if (empList.length === 0) {
          return NextResponse.json({
            success: false,
            message: `"${parameters.employee_name}" নামে কোনো কর্মচারী খুঁজে পাওয়া যায়নি। দয়া করে সঠিক নাম বলুন।`
          });
        }

        // একাধিক মিল পাওয়া গেলে (Ambiguity Resolution)
        if (empList.length > 1) {
          const options = empList.map((emp, index) => ({
            option_number: index + 1,
            employee_id: emp.id,
            display_name: `${emp.full_name} (${emp.categories.category_name}, ${emp.branches.branch_name}, মোবাইল শেষ ৪ ডিজিট: ${emp.mobile_number.slice(-4)})`
          }));

          return NextResponse.json({
            success: false,
            error_type: 'ambiguous_employee',
            message: `আপনার এই নামে ${empList.length} জন কর্মচারী আছেন। আপনি কাকে বোঝাতে চেয়েছেন? সঠিক নম্বরটি লিখে জানান।`,
            options
          });
        }

        employee = empList[0];
      }

      // খ. খসড়া ট্রানজেকশনটি পেন্ডিং অ্যাকশন কিউ টেবিলে সংরক্ষণ করা (১০ মিনিট ভ্যালিডিটি)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const draftPayload = {
        ...parameters,
        employee_id: employee?.id || null,
        employee_name: employee?.full_name || parameters.employee_name
      };

      const { data: pendingAction, error: draftInsertError } = await db.pending_actions()
        .insert({
          action_type: action,
          raw_message,
          parameters: draftPayload as unknown as Record<string, unknown>,
          status: 'pending',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (draftInsertError) throw draftInsertError;

      // গ. ওনারের জন্য ওয়ান-ক্লিক রিড্যাবল সুন্দর বাংলা কনভারসেশন মেসেজ তৈরি করা
      let confirmationText = '';
      const formattedDate = parameters.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

      if (action === 'add_advance') {
        confirmationText = `আমি যা বুঝেছি:
• নাম: ${employee?.full_name}
• পরিমাণ: ${parameters.amount} টাকা
• নেয়ার তারিখ: ${formattedDate}
• কারণ: ${parameters.reason || 'পারিবারিক প্রয়োজন'}

সব ঠিক থাকলে "হ্যাঁ" লিখুন, না হলে "না" লিখুন।`;
      } else if (action === 'start_leave') {
        confirmationText = `আমি যা বুঝেছি:
• নাম: ${employee?.full_name}
• ছুটির ধরণ: ${parameters.leave_type === 'unpaid' ? 'অবৈতনিক ছুটি (Unpaid)' : 'অন্যান্য ছুটি'}
• ছুটি শুরু: ${formattedDate}
• কারণ: ${parameters.reason || 'জরুরি ব্যক্তিগত কাজ'}

সব ঠিক থাকলে "হ্যাঁ" লিখুন, না হলে "না" লিখুন।`;
      } else if (action === 'resume_duty') {
        confirmationText = `আমি যা বুঝেছি:
• নাম: ${employee?.full_name}
• কাজে যোগদানের তারিখ: ${formattedDate} (আজ)

সব ঠিক থাকলে "হ্যাঁ" লিখুন, না হলে "না" লিখুন।`;
      } else if (action === 'generate_payroll') {
        confirmationText = `আমি যা বুঝেছি:
• মাসের হিসাব: ${parameters.month}-${parameters.year}-এর বেতন তৈরি করা হবে।

সব ঠিক থাকলে "হ্যাঁ" লিখুন, না হলে "না" লিখুন।`;
      }

      return NextResponse.json({
        success: true,
        phase: 'draft',
        pending_action_id: pendingAction.id,
        message: confirmationText
      });
    }

    // ==========================================
    // ধাপ ২: কনফার্মেশন ফেজ (Phase: Confirm)
    // ==========================================
    if (phase === 'confirm') {
      if (!pending_action_id) {
        return NextResponse.json({ success: false, error: 'Pending action ID is required in confirm phase' }, { status: 400 });
      }

      // ক. পেন্ডিং এন্ট্রি লোড করা
      const { data: draftRecord, error: fetchDraftError } = await db.pending_actions()
        .select('*')
        .eq('id', pending_action_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchDraftError || !draftRecord) {
        return NextResponse.json({ success: false, message: 'পেন্ডিং অ্যাকশনটি খুঁজে পাওয়া যায়নি অথবা এর মেয়াদ শেষ হয়েছে।' });
      }

      // মেয়াদ উত্তীর্ণ চেক
      if (new Date(draftRecord.expires_at) < new Date()) {
        await db.pending_actions().update({ status: 'expired' }).eq('id', pending_action_id);
        return NextResponse.json({ success: false, message: 'রিকোয়েস্টটির মেয়াদ ১০ মিনিট শেষ হয়েছে। অনুগ্রহ করে আবার বলুন।' });
      }

      const draftParams = draftRecord.parameters as Record<string, unknown>;
      const targetEmpId = draftParams.employee_id as string | null;

      // খ. অ্যাকশন টাইপ অনুযায়ী নির্দিষ্ট সার্ভিস কল করা
      if (action === 'add_advance') {
        if (!targetEmpId) throw new Error('Employee ID missing in confirm phase');
        await AdvanceService.addAdvance({
          employeeId: targetEmpId,
          amount: Number(draftParams.amount),
          month: draftParams.month as string,
          year: draftParams.year as string,
          reason: draftParams.reason as string,
          adminId,
          adminName
        });
      } else if (action === 'start_leave') {
        if (!targetEmpId) throw new Error('Employee ID missing in confirm phase');
        await LeaveService.startLeave({
          employeeId: targetEmpId,
          startDate: convertDateToDBFormat(draftParams.date as string),
          leaveType: (draftParams.leave_type as 'unpaid') || 'unpaid',
          reason: (draftParams.reason as string) || 'জরুরি ব্যক্তিগত ছুটি',
          adminId,
          adminName
        });
      } else if (action === 'resume_duty') {
        if (!targetEmpId) throw new Error('Employee ID missing in confirm phase');
        await LeaveService.resumeDuty({
          employeeId: targetEmpId,
          resumeDate: convertDateToDBFormat(draftParams.date as string),
          adminId,
          adminName
        });
      } else if (action === 'generate_payroll') {
        await PayrollService.generateMonthlyPayroll(
          draftParams.month as string,
          draftParams.year as string,
          adminId,
          adminName
        );
      }

      // গ. পেন্ডিং স্ট্যাটাস আপডেট করে 'confirmed' করা
      await db.pending_actions().update({ status: 'confirmed' }).eq('id', pending_action_id);

      // ঘ. এআই অ্যাকশন লগ সংরক্ষণ
      await supabase.from('ai_action_logs').insert({
        action_type: action,
        raw_message: draftRecord.raw_message,
        parsed_result: draftParams,
        is_success: true,
        executed_by: adminId
      });

      return NextResponse.json({
        success: true,
        phase: 'confirm',
        message: 'সফলভাবে সংরক্ষণ ও হিসাব সম্পন্ন হয়েছে।'
      });
    }

  } catch (err: unknown) {
    console.error('AI Gateway Error:', err);
    
    // সিস্টেম ফেইলিউর লগ ট্র্যাকিং
    try {
      await supabase.from('ai_action_logs').insert({
        is_success: false,
        error_message: err instanceof Error ? err.message : 'Unknown routing error'
      });
    } catch (logErr) {
      console.error('Failed to save error log:', logErr);
    }

    return NextResponse.json({
      success: false,
      message: 'দুঃখিত, অভ্যন্তরীণ প্রসেসিং সমস্যার কারণে ডাটাবেজে সংরক্ষণ করা যায়নি।'
    }, { status: 500 });
  }
}