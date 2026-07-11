'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Printer, X, Download, CheckCircle2 } from 'lucide-react';

// @react-pdf/renderer (1.45MB) is dynamically imported ONLY when the user clicks "রসিদ প্রিন্ট"
// The modal shell + HTML preview remain in the main bundle; the PDF engine loads on demand.
const LazyPDFWrapper = dynamic(
  () => import('./salary-slip-renderer').then((mod) => mod.LazyPDFWrapper),
  { ssr: false }
);

// কারেন্সি কমা সেপারেটর হেল্পার ফাংশন
const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  return isNaN(num) ? '0' : num.toLocaleString('en-US');
};

// Timezone-safe payment date formatter
function formatPaymentDate(isoString: string | null): string {
  if (!isoString) return '';
  const datePart = isoString.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const yearTwoDigits = parts[0].slice(-2);
    return `${parts[2]}-${parts[1]}-${yearTwoDigits}`;
  }
  return isoString;
}

interface SalarySlipProps {
  data: {
    employeeName: string;
    employeeCode: string;
    branchName: string;
    categoryName: string;
    month: string;
    year: string;
    monthlySalary: number;
    dailySalary: number;
    dutyDays: number;
    bonusDays: number;
    absentDays: number;
    grossSalary: number;
    advanceAmount: number;
    netSalary: number;
    is_paid?: boolean;
    paid_at?: string | null;
  };
}

// ৫. ওয়ান-ক্লিক লাইভ প্রিভিউ এবং ডাউনলোড বাটন কম্পোনেন্ট (LAZY LOADED)
export function SalarySlipDownloadButton({ data }: SalarySlipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [printDate, setPrintDate] = useState('24-06-2026');
  const [isActivated, setIsActivated] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // PDF compilation only happens when isActivated is true (modal is open)
  const activatePdf = useCallback(() => {
    setIsActivated(true);
    setIsOpen(true);
    setPdfUrl(null);
  }, []);

  const deactivatePdf = useCallback(() => {
    setIsActivated(false);
    setIsOpen(false);
    setPdfUrl(null);
  }, []);

  // রিয়াল-টাইম আজকের তারিখ ডাইনামিক সেটআপ (Next.js 15-এর কড়া Rule #1)
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (active) {
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = String(now.getFullYear());
        setPrintDate(`${d}-${m}-${y}`);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const fileName = `Salary-Slip-${data.employeeCode}-${data.month}-${data.year}.pdf`;

  // Lightweight mock button in the table row – NO PDF compilation on mount
  if (!isOpen) {
    return (
      <button
        onClick={activatePdf}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-3.5 py-2 text-sm font-black transition-colors cursor-pointer"
      >
        <Printer className="h-4 w-4 text-[#F4C430]" />
        <span>{"রসিদ প্রিন্ট"}</span>
      </button>
    );
  }

  // Modal opens with LazyPDFWrapper – usePDF runs ONLY here
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
          {/* মডাল হেডার */}
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-lg font-black text-gray-900">{"বেতন রসিদ প্রিভিউ (ভাউচার সাইজ)"}</h3>
              <p className="text-xs font-bold text-gray-500">{"রসিদ সঠিক আছে কিনা দেখে নিন। স্ক্রিনশট নিয়ে হোয়াটসঅ্যাপেও পাঠাতে পারেন।"}</p>
            </div>
            <button
              onClick={deactivatePdf}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* PDF compilation only runs when modal is open (isActivated = true) */}
          {isActivated && (
            <LazyPDFWrapper data={data} printDate={printDate} onReady={setPdfUrl} />
          )}

          {/* মোবাইল ফ্রেন্ডলি ও রেসপন্সিভ রিঅ্যাকট এইচটিএমএল প্রিভিউ */}
          <div className="bg-gray-50 rounded-lg border p-4 shadow-inner overflow-x-auto max-w-full font-sans select-none">
            <div className="min-w-[640px] border border-gray-200 rounded-xl p-4 bg-white relative space-y-4 shadow-sm">

              {/* প্রিভিউ হেডার */}
              <div className="flex justify-between items-center border-b-2 border-[#8B0000] pb-2">
                <span className="text-xl font-bold text-[#8B0000]">{"বিসমিল্লাহ"}</span>
                <span className="text-sm font-bold text-gray-500">{"বেতন পরিশোধের রসিদ (ভাউচার)"}</span>
              </div>

              {/* ৩-কলাম গ্রিড লেআউট */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {/* কলাম ১: কর্মচারীর বিবরণ */}
                <div className="border border-gray-150 rounded-lg p-3 bg-gray-50">
                  <div className="bg-[#8B0000] text-white py-1.5 text-center font-bold rounded-md mb-2">{"কর্মচারির বিবরণ"}</div>
                  <div className="space-y-1 font-semibold text-gray-700">
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"কোড:"}</span><span className="font-bold">{data.employeeCode}</span></div>
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"নাম:"}</span><span className="font-bold">{data.employeeName}</span></div>
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"ক্যাটাগরি:"}</span><span className="font-bold">{data.categoryName}</span></div>
                  </div>
                </div>

                {/* কলাম ২: হাজিরা বিবরণী */}
                <div className="border border-gray-150 rounded-lg p-3 bg-gray-50">
                  <div className="bg-[#8B0000] text-white py-1.5 text-center font-bold rounded-md mb-2">{"হাজিরা বিবরণী"}</div>
                  <div className="space-y-1 font-semibold text-gray-700">
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"বেতন মাস:"}</span><span className="font-bold">{`${data.month}-${data.year}`}</span></div>
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"উপস্থিত দিন:"}</span><span className="font-bold">{`${data.dutyDays} দিন`}</span></div>
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"অনুপস্থিত দিন:"}</span><span className="font-bold">{`${data.absentDays} দিন`}</span></div>
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"বোনাস দিন:"}</span><span className="font-bold">{`+${data.bonusDays} দিন`}</span></div>
                  </div>
                </div>

                {/* কলাম ৩: বেতন ও সমন্বয় */}
                <div className="border border-gray-150 rounded-lg p-3 bg-gray-50">
                  <div className="bg-[#8B0000] text-white py-1.5 text-center font-bold rounded-md mb-2">{"বেতন ও সমন্বয়"}</div>
                  <div className="space-y-1 font-semibold text-gray-700">
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"মূল বেতন:"}</span><span className="font-bold">{formatCurrency(data.monthlySalary)} {"টাকা"}</span></div>
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"প্রাপ্য বেতন:"}</span><span className="font-bold">{formatCurrency(data.grossSalary)} {"টাকা"}</span></div>
                    <div className="flex justify-between border-b border-gray-200 pb-1"><span>{"অগ্রিম (-):"}</span><span className="font-bold">-{formatCurrency(data.advanceAmount)} {"টাকা"}</span></div>
                    <div className="bg-[#F4C430] text-black font-bold p-1.5 rounded-md flex justify-between mt-2">
                      <span>{"নিট বেতন:"}</span>
                      <span className="text-[#8B0000]">{formatCurrency(data.netSalary)} {"টাকা"}</span>
                    </div>

                    {/* পেমেন্ট স্ট্যাটাস ব্যাজ */}
                    {data.is_paid && (
                      <div className="mt-2 bg-green-100 text-green-700 font-bold p-1.5 rounded-md flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {"পরিশোধিত"}
                        </span>
                        {data.paid_at && (
                          <span className="text-gray-500 font-semibold">
                            {formatPaymentDate(data.paid_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* স্বাক্ষর লাইন */}
              <div className="flex justify-between pt-6 px-6 text-xs text-center font-bold">
                <div className="w-[35%] border-t border-black pt-1">{"কর্মচারীর স্বাক্ষর"}</div>
                <div className="w-[35%] border-t border-black pt-1">{"কর্তৃপক্ষের স্বাক্ষর"}</div>
              </div>

              {/* ফুটার */}
              <div className="text-[10px] text-gray-400 text-center border-t border-gray-100 pt-2 font-semibold">
                <p>{"* এই স্লিপটি বিসমিল্লাহ প্রতিষ্ঠানের অভ্যন্তরীণ ব্যবহারের জন্য তৈরি।"}</p>
                <p>{"মুদ্রণের তারিখ: "}{printDate}</p>
              </div>

            </div>
          </div>

          {/* অ্যাকশন বাটনসমূহ */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
            <button
              onClick={deactivatePdf}
              className="flex-1 rounded-lg border py-3 text-sm font-black text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-center"
            >
              {"বাতিল করুন"}
            </button>

            {pdfUrl && (
              <a
                href={pdfUrl}
                download={fileName}
                className="flex-1 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 text-white py-3 text-sm font-black transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4 text-[#F4C430]" />
                <span>{"ফাইল ডাউনলোড করুন"}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
