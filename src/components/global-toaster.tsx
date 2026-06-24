'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function GlobalToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nativeAlert = window.alert;

      // eslint-any ত্রুটি এড়াতে কড়া টাইপ-সেফ 'unknown' ব্যবহার করা হয়েছে
      window.alert = (message: unknown) => {
        const msgStr = String(message);
        const id = Date.now().toString() + Math.random().toString();

        // মেসেজের ভেতরের লেখা অ্যানালাইসিস করে ক্যাটাগরি (Success, Error, Info) বের করা
        let type: 'success' | 'error' | 'info' = 'info';
        if (
          msgStr.includes('সফল') || 
          msgStr.includes('সম্পন্ন') || 
          msgStr.includes('যুক্ত হয়েছে') || 
          msgStr.includes('আপডেট') || 
          msgStr.includes('ডিলিট করা হয়েছে') ||
          msgStr.includes('যোগদান')
        ) {
          type = 'success';
        } else if (
          msgStr.includes('ভুল') || 
          msgStr.includes('ত্রুটি') || 
          msgStr.includes('সমস্যা') || 
          msgStr.includes('বাধ্যতামূলক') ||
          msgStr.includes('ব্যর্থ') ||
          msgStr.includes('সতর্কতা')
        ) {
          type = 'error';
        }

        setToasts((prev) => [...prev, { id, message: msgStr, type }]);

        // ৪ সেকেন্ড পর অটো-হাইড করার টাইমার সেট
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
      };

      return () => {
        window.alert = nativeAlert;
      };
    }
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-5 right-5 z-9999 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-4 shadow-xl text-sm font-black transition-all duration-300 ${
            t.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : t.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-[#F4C430]/30 text-amber-950'
          }`}
        >
          <div className="flex gap-2.5">
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{t.message}</span>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-400 hover:text-gray-600 shrink-0 focus:outline-none cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}