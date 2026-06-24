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

// ২. ৩-কলামের কমপ্যাক্ট ভাউচার স্টাইলশিট (উচ্চতা মাত্র ২৪০ পয়েন্ট যা ৩টি ভাউচার ১টি A4-এ প্রিন্ট উপযোগী)
const styles = StyleSheet.create({
  page: {
    fontFamily: 'SolaimanLipi',
    padding: 12,
    fontSize: 9,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#8B0000',
    paddingBottom: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  slipTitle: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'right',
  },
  gridThreeColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  column: {
    width: '32%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#fafafa',
  },
  columnTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#8B0000',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 4,
    borderRadius: 2,
    textAlign: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 3,
  },
  fieldLabel: {
    color: '#555555',
    fontSize: 8,
  },
  fieldValue: {
    fontWeight: 'bold',
    fontSize: 8,
  },
  netSalaryRow: {
    marginTop: 4,
    padding: 4,
    backgroundColor: '#F4C430',
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netSalaryLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
  },
  netSalaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 20,
  },
  signatureLine: {
    borderTopWidth: 0.75,
    borderTopColor: '#000000',
    width: '35%',
    textAlign: 'center',
    paddingTop: 3,
    fontSize: 8,
  },
  footer: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 7,
    color: '#888888',
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

// ৩. রিঅ্যাক্ট-পিডিএফ কমপ্যাক্ট ডকুমেন্ট ভাউচার
const SalarySlipDocument = ({ data }: SalarySlipProps) => (
  <Document>
    {/* Page Size: Width A4 (595.28pt), Height Compact Voucher (240pt) */}
    <Page size={[595.28, 240]} style={styles.page}>
      {/* হেডার */}
      <View style={styles.headerContainer}>
        <Text style={styles.companyName}>{"বিসমিল্লাহ"}</Text>
        <Text style={styles.slipTitle}>{"বেতন পরিশোধের রসিদ (ভাউচার)"}</Text>
      </View>

      {/* ৩-কলাম গ্রিড লেআউট */}
      <View style={styles.gridThreeColumn}>
        {/* কলাম ১: কর্মচারীর বিবরণ */}
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
            <Text style={styles.fieldLabel}>{"শাখা:"}</Text>
            <Text style={styles.fieldValue}>{data.branchName || "N/A"}</Text>
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
            <Text style={styles.fieldValue}>{`${data.monthlySalary} টাকা`}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{"প্রাপ্য বেতন:"}</Text>
            <Text style={styles.fieldValue}>{`${data.grossSalary} টাকা`}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{"অগ্রিম (-):"}</Text>
            <Text style={styles.fieldValue}>{`-${data.advanceAmount} টাকা`}</Text>
          </View>
          <View style={styles.netSalaryRow}>
            <Text style={styles.netSalaryLabel}>{"নিট বেতন:"}</Text>
            <Text style={styles.netSalaryValue}>{`${data.netSalary} টাকা`}</Text>
          </View>
        </View>
      </View>

      {/* স্বাক্ষর লাইন */}
      <View style={styles.signatureRow}>
        <Text style={styles.signatureLine}>{"কর্মচারীর স্বাক্ষর"}</Text>
        <Text style={styles.signatureLine}>{"কর্তৃপক্ষের স্বাক্ষর"}</Text>
      </View>

      {/* ফুটার */}
      <View style={styles.footer}>
        <Text>{"* এই স্লিপটি বিসমিল্লাহ প্রতিষ্ঠানের অভ্যন্তরীণ ব্যবহারের জন্য তৈরি।"}</Text>
        <Text>{"মুদ্রণের তারিখ: 24-06-2026"}</Text>
      </View>
    </Page>
  </Document>
);

// ৪. ওয়ান-ক্লিক লাইভ প্রিভিউ এবং ডাউনলোড বাটন কম্পোনেন্ট
export function SalarySlipDownloadButton({ data }: SalarySlipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [instance, updateInstance] = usePDF({ 
    document: <SalarySlipDocument data={data} /> 
  });

  // ডাটা পরিবর্তন হলে পিডিএফ আপডেট করা হবে (Next.js 15 কমপ্লায়েন্ট অ্যাসিনক্রোনাস মাইক্রো-টাস্ক টিক)
  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (active) {
        updateInstance(<SalarySlipDocument data={data} />);
      }
    })();
    return () => {
      active = false;
    };
  }, [data, updateInstance]);

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

            {/* পিডিএফ আইফ্রেম প্রিভিউ */}
            <div className="relative bg-gray-50 rounded-lg border overflow-hidden h-[240px] md:h-[280px]">
              {instance.url ? (
                <iframe 
                  src={`${instance.url}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border-0"
                  title="Salary Slip Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm font-bold text-gray-500">
                  {"পিডিএফ প্রিভিউ লোড হচ্ছে..."}
                </div>
              )}
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