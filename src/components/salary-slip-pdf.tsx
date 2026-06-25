'use client';

import React, { useEffect, useState } from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Font, 
  usePDF
} from '@react-pdf/renderer';
import { Printer, X, Download } from 'lucide-react';

// ১. অত্যন্ত স্থিতিশীল ও ক্র্যাশ-ফ্রি বাংলা ফন্ট রেজিস্টার করা
Font.register({
  family: 'SolaimanLipi',
  src: 'https://cdn.jsdelivr.net/gh/sh4hids/bangla-web-fonts@solaimanlipi/subset-SolaimanLipiNormal.ttf',
});

// কারেন্সি কমা সেপারেটর হেল্পার ফাংশন
const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  return isNaN(num) ? '0' : num.toLocaleString('en-US');
};

// ২. স্ট্যান্ডার্ড A4 পেজের শীর্ষে ভাউচার স্থাপন ও বড় টেক্সট উপযোগী স্টাইলশিট
const styles = StyleSheet.create({
  page: {
    fontFamily: 'SolaimanLipi',
    padding: 18,
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  // পাতার ওপরে ভাউচার বক্স ডিজাইন
  voucherContainer: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#ffffff',
    height: 275, 
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B0000',
    paddingBottom: 6,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#8B0000',
  },
  slipTitle: {
    fontSize: 12, 
    fontWeight: 'bold',
    color: '#555555',
    textAlign: 'right',
  },
  gridThreeColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  column: {
    width: '32%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fafafa',
  },
  columnTitle: {
    fontSize: 11, 
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#8B0000',
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
    borderRadius: 3,
    textAlign: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
  },
  fieldLabel: {
    color: '#555555',
    fontSize: 10, 
  },
  fieldValue: {
    fontWeight: 'bold',
    fontSize: 10, 
  },
  netSalaryRow: {
    marginTop: 6,
    padding: 6,
    backgroundColor: '#F4C430',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netSalaryLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  netSalaryValue: {
    fontSize: 13, 
    fontWeight: 'bold',
    color: '#8B0000',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingHorizontal: 20,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    width: '35%',
    textAlign: 'center',
    paddingTop: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
    textAlign: 'center',
    fontSize: 8.5,
    color: '#777777',
  },
  cutLineContainer: {
    marginTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutLineText: {
    fontSize: 9,
    color: '#9ca3af',
    letterSpacing: 2,
  }
});

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
  };
}

// পিডিএফ ডকুমেন্টের টাইপ ইন্টারফেস
interface SalarySlipDocProps extends SalarySlipProps {
  printDate: string;
}

// ৩. রিঅ্যাক্ট-পিডিএফ কমপ্যাক্ট ডকুমেন্ট ভাউচার (A4 পেজের শীর্ষে এবং ডাইনামিক তারিখ সহ)
const SalarySlipDocument = ({ data, printDate }: SalarySlipDocProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.voucherContainer}>
        {/* হেডার */}
        <View style={styles.headerContainer}>
          <Text style={styles.companyName}>{"বিসমিল্লাহ"}</Text>
          <Text style={styles.slipTitle}>{"বেতন পরিশোধের রসিদ (ভাউচার)"}</Text>
        </View>

        {/* ৩-কলাম গ্রিড লেআউট */}
        <View style={styles.gridThreeColumn}>
          {/* কলাম ১: কর্মচারীর বিবরণ (শাখা অপশন বাতিল করা হয়েছে) */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{"কর্মচারির বিবরণ"}</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"কোড:"}</Text>
              <Text style={styles.fieldValue}>{data.employeeCode}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"নাম:"}</Text>
              <Text style={styles.fieldValue}>{data.employeeName}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"ক্যাটাগরি:"}</Text>
              <Text style={styles.fieldValue}>{data.categoryName}</Text>
            </View>
          </View>

          {/* কলাম ২: হাজিরা বিবরণী */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{"হাজিরা বিবরণী"}</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"বেতন মাস:"}</Text>
              <Text style={styles.fieldValue}>{`${data.month}-${data.year}`}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"উপস্থিত দিন:"}</Text>
              <Text style={styles.fieldValue}>{`${data.dutyDays} দিন`}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"অনুপস্থিত দিন:"}</Text>
              <Text style={styles.fieldValue}>{`${data.absentDays} দিন`}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"বোনাস দিন:"}</Text>
              <Text style={styles.fieldValue}>{`+${data.bonusDays} দিন`}</Text>
            </View>
          </View>

          {/* কলাম ৩: বেতন ও সমন্বয় */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{"বেতন ও সমন্বয়"}</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"মূল বেতন:"}</Text>
              <Text style={styles.fieldValue}>{`${formatCurrency(data.monthlySalary)} টাকা`}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"প্রাপ্য বেতন:"}</Text>
              <Text style={styles.fieldValue}>{`${formatCurrency(data.grossSalary)} টাকা`}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"অগ্রিম (-):"}</Text>
              <Text style={styles.fieldValue}>{`-${formatCurrency(data.advanceAmount)} টাকা`}</Text>
            </View>
            <View style={styles.netSalaryRow}>
              <Text style={styles.netSalaryLabel}>{"নিট বেতন:"}</Text>
              <Text style={styles.netSalaryValue}>{`${formatCurrency(data.netSalary)} টাকা`}</Text>
            </View>
          </View>
        </View>

        {/* স্বাক্ষর লাইন */}
        <View style={styles.signatureRow}>
          <Text style={styles.signatureLine}>{"কর্মচারীর স্বাক্ষর"}</Text>
          <Text style={styles.signatureLine}>{"কর্তৃপক্ষের স্বাক্ষর"}</Text>
        </View>

        {/* ফুটার (ডাইনামিক মুদ্রণ তারিখ সহ) */}
        <View style={styles.footer}>
          <Text>{"* এই স্লিপটি বিসমিল্লাহ প্রতিষ্ঠানের অভ্যন্তরীণ ব্যবহারের জন্য তৈরি।"}</Text>
          <Text>{"মুদ্রণের তারিখ: " + printDate}</Text>
        </View>
      </View>

      {/* কাটিং কাঁচি ডটেড লাইন */}
      <View style={styles.cutLineContainer}>
        <Text style={styles.cutLineText}>
          {"✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"}
        </Text>
      </View>
    </Page>
  </Document>
);

// ৪. ওয়ান-ক্লিক লাইভ প্রিভিউ এবং ডাউনলোড বাটন কম্পোনেন্ট
export function SalarySlipDownloadButton({ data }: SalarySlipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [printDate, setPrintDate] = useState('24-06-2026'); // Hydration সেফ ফলব্যাক
  const [instance, updateInstance] = usePDF({ 
    document: <SalarySlipDocument data={data} printDate={printDate} /> 
  });

  // রিয়াল-টাইম আজকের তারিখ ডাইনামিক সেটআপ (Next.js 15-এর কড়া Rule #1 মেনে মাইক্রো-টাস্ক ডিফারেল সহ)
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve(); // 🌟 রেন্ডার ক্যাস্কেডিং ও বিল্ড ফেল প্রতিরোধক মাইক্রো-টাস্ক টিক
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

  // ডাটা পরিবর্তন হলে পিডিএফ আপডেট করা হবে (অ্যাসিনক্রোনাস মাইক্রো-টাস্ক টিক)
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (active) {
        updateInstance(<SalarySlipDocument data={data} printDate={printDate} />);
      }
    })();
    return () => {
      active = false;
    };
  }, [data, printDate, updateInstance]);

  const fileName = `Salary-Slip-${data.employeeCode}-${data.month}-${data.year}.pdf`;

  if (instance.loading) {
    return (
      <button className="inline-flex items-center gap-1.5 rounded-lg bg-gray-200 text-gray-500 px-3.5 py-2 text-sm font-black cursor-not-allowed">
        <Printer className="h-4 w-4 animate-pulse" />
        <span>{"রসিদ লোড..."}</span>
      </button>
    );
  }

  return (
    <>
      {/* মেইন টেবিলের বাটন */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-3.5 py-2 text-sm font-black transition-colors cursor-pointer"
      >
        <Printer className="h-4 w-4 text-[#F4C430]" />
        <span>{"রসিদ প্রিন্ট"}</span>
      </button>

      {/* লাইভ প্রিন্ট প্রিভিউ উইন্ডো (Modal) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* মডাল হেডার */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">{"বেতন রসিদ প্রিভিউ (ভাউচার সাইজ)"}</h3>
                <p className="text-xs font-bold text-gray-500">{"রসিদ সঠিক আছে কিনা দেখে নিন। স্ক্রিনশট নিয়ে হোয়াটসঅ্যাপেও পাঠাতে পারেন।"}</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* মোবাইল ফ্রেন্ডলি ও রেসপন্সিভ রিঅ্যাক্ট এইচটিএমএল প্রিভিউ */}
            <div className="bg-gray-50 rounded-lg border p-4 shadow-inner overflow-x-auto max-w-full font-sans select-none">
              <div className="min-w-[640px] border border-gray-200 rounded-xl p-4 bg-white relative space-y-4 shadow-sm">
                
                {/* প্রিভিউ হেডার */}
                <div className="flex justify-between items-center border-b-2 border-[#8B0000] pb-2">
                  <span className="text-xl font-bold text-[#8B0000]">{"বিসমিল্লাহ"}</span>
                  <span className="text-sm font-bold text-gray-500">{"বেতন পরিশোধের রসিদ (ভাউচার)"}</span>
                </div>

                {/* ৩-কলাম গ্রিড লেআউট */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {/* কলাম ১: কর্মচারীর বিবরণ (শাখা বাদ দেওয়া হয়েছে) */}
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
                    </div>
                  </div>
                </div>

                {/* স্বাক্ষর লাইন */}
                <div className="flex justify-between pt-6 px-6 text-xs text-center font-bold">
                  <div className="w-[35%] border-t border-black pt-1">{"কর্মচারীর স্বাক্ষর"}</div>
                  <div className="w-[35%] border-t border-black pt-1">{"কর্তৃপক্ষের স্বাক্ষর"}</div>
                </div>

                {/* ফুটার (ডাইনামিক মুদ্রণ তারিখ সহ) */}
                <div className="text-[10px] text-gray-400 text-center border-t border-gray-100 pt-2 font-semibold">
                  <p>{"* এই স্লিপটি বিসমিল্লাহ প্রতিষ্ঠানের অভ্যন্তরীণ ব্যবহারের জন্য তৈরি।"}</p>
                  <p>{"মুদ্রণের তারিখ: "}{printDate}</p>
                </div>

              </div>
            </div>

            {/* অ্যাকশন বাটনসমূহ */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
              <button 
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg border py-3 text-sm font-black text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-center"
              >
                {"বাতিল করুন"}
              </button>
              
              {instance.url && (
                <a
                  href={instance.url}
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
      )}
    </>
  );
}