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
    await Promise.resolve();
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
      return <span className="inline-flex items-center rounded-full bg-[--color-success]/[0.12] text-[--color-success] px-2.5 py-0.5 text-xs font-black gap-1">{"নতুন ভ্যালু"}</span>;
    }
    if (action === 'UPDATE') {
      return <span className="inline-flex items-center rounded-full bg-[--color-accent]/[0.12] text-[--color-accent-dark] px-2.5 py-0.5 text-xs font-black gap-1">{"সংশোধন"}</span>;
    }
    return <span className="inline-flex items-center rounded-full bg-[--color-danger]/[0.12] text-[--color-danger] px-2.5 py-0.5 text-xs font-black gap-1">{"সফট ডিলিট"}</span>;
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
        <h1 className="text-2xl md:text-3xl font-black text-[--color-foreground]">{"পরিবর্তন লগ (Audit Logs)"}</h1>
        <p className="text-sm font-bold text-[--color-foreground-muted] mt-1">{"সিস্টেমে হওয়া সমস্ত পরিবর্তন ও পরিবর্তনের কারণ সমূহের ট্র্যাকিং হিস্ট্রি"}</p>
      </div>

      {/* তালিকা টেবিল */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--color-primary] border-t-transparent mx-auto"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center text-[--color-foreground-muted]">
          <ShieldAlert className="h-12 w-12 mx-auto text-[--color-foreground-muted]" />
          <p className="mt-4 text-lg font-bold text-[--color-foreground]">{"এখনও সিস্টেমে কোনো পরিবর্তন রেকর্ড করা হয়নি।"}</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b bg-[--color-surface-raised] text-sm font-black text-[--color-foreground]">
                <th className="p-4 font-bengali">{"তারিখ ও সময়"}</th>
                <th className="p-4 font-bengali">{"পরিবর্তনকারী"}</th>
                <th className="p-4 font-bengali">{"বিভাগ/টেবিল"}</th>
                <th className="p-4 font-bengali">{"অ্যাকশন"}</th>
                <th className="p-4 font-bengali">{"পরিবর্তনের কারণ (বাধ্যতামূলক)"}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm font-bold text-[--color-foreground]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[--color-primary]/[0.02] transition-colors">
                  <td className="p-4 text-xs font-black text-[--color-foreground-muted]">
                    {new Date(log.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="p-4">
                    <p className="font-black text-[--color-foreground]">{log.created_by_name || 'সিস্টেম ইউজার'}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-black text-[--color-foreground]">{translateTable(log.table_name)}</span>
                  </td>
                  <td className="p-4">{getActionBadge(log.action_type)}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 max-w-sm">
                      <p className="font-black text-[--color-danger] bg-[--color-danger]/[0.08] rounded px-2.5 py-1 border border-[--color-danger]/[0.2] text-xs">
                        {log.change_reason}
                      </p>
                      {log.old_values && log.action_type === 'UPDATE' && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[--color-foreground-muted] mt-1">
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