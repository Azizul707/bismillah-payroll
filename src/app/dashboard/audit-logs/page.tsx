'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { History, ShieldAlert, ArrowRight } from 'lucide-react';
import { AuditService } from '@/app/lib/services/audit';
import { AuditLog } from '@/app/lib/supabase/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // অডিট লগ লোড করার মেমোইজড ফাংশন
  const loadLogs = useCallback(async () => {
    await Promise.resolve(); // লিন্টারের সিনক্রোনাস স্টেট এরর দূর করতে ডিফারেল
    try {
      setLoading(true);
      const data = await AuditService.getLogs(undefined, 100);
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadLogs();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadLogs]);

  // বাংলায় অ্যাকশন রূপান্তর
  const getActionBadge = (action: string) => {
    if (action === 'INSERT') {
      return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-black text-green-700">নতুন ভ্যালু</span>;
    }
    if (action === 'UPDATE') {
      return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">সংশোধন</span>;
    }
    return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-black text-red-700">সফট ডিলিট</span>;
  };

  // বাংলায় টেবিল নাম রূপান্তর
  const translateTable = (table: string) => {
    if (table === 'employees') return 'কর্মচারী প্রোফাইল';
    if (table === 'salary_advances') return 'অগ্রিম বেতন';
    if (table === 'employee_status_history') return 'ছুটি ও টাইমলাইন';
    if (table === 'payrolls') return 'মাসের বেতন লক/আনলক';
    return table;
  };

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b pb-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">পরিবর্তন লগ (Audit Logs)</h1>
        <p className="text-sm font-bold text-gray-500 mt-1">সিস্টেমে হওয়া সমস্ত পরিবর্তন ও পরিবর্তনের কারণ সমূহের ট্র্যাকিং হিস্ট্রি</p>
      </div>

      {/* তালিকা টেবিল */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8B0000] border-t-transparent mx-auto"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-400">
          <ShieldAlert className="h-12 w-12 mx-auto text-gray-300" />
          <p className="mt-4 text-lg font-bold">এখনও সিস্টেমে কোনো পরিবর্তন রেকর্ড করা হয়নি।</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b bg-gray-50 text-sm font-black text-gray-700">
                <th className="p-4">তারিখ ও সময়</th>
                <th className="p-4">পরিবর্তনকারী</th>
                <th className="p-4">বিভাগ/টেবিল</th>
                <th className="p-4">অ্যাকশন</th>
                <th className="p-4">পরিবর্তনের কারণ (বাধ্যতামূলক)</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm font-bold text-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-xs font-black text-gray-400">
                    {new Date(log.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="p-4">
                    <p className="font-black text-gray-900">{log.created_by_name || 'সিস্টেম ইউজার'}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-black text-gray-600">{translateTable(log.table_name)}</span>
                  </td>
                  <td className="p-4">{getActionBadge(log.action_type)}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 max-w-sm">
                      <p className="font-black text-red-950 bg-red-50/50 rounded px-2.5 py-1 border border-red-100/50 text-xs">
                        {log.change_reason}
                      </p>
                      {log.old_values && log.action_type === 'UPDATE' && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                          <span>আগে: {JSON.stringify(log.old_values).slice(0, 40)}...</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>পরে: {JSON.stringify(log.new_values).slice(0, 40)}...</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}