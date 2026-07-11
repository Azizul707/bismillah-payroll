'use client';

import React, { useEffect } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  usePDF,
} from '@react-pdf/renderer';

// ১. অত্যন্ত স্থিতিশীল ও ক্র্যাশ-ফ্রি বাংলা ফন্ট রেজিস্টার করা
Font.register({
  family: 'SolaimanLipi',
  src: 'https://cdn.jsdelivr.net/gh/sh4hids/bangla-web-fonts@solaimanlipi/subset-SolaimanLipiNormal.ttf',
});

// বাঙলা সংখ্যায় রূপান্তর (০১২৩৪৫৬৭৮৯)
const toBengaliNumerals = (str: string | number): string => {
  const bd = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/[0-9]/g, (d) => bd[parseInt(d)]);
};

// কারেন্সি কমা সেপারেটর হেল্পার ফাংশন — বাঙলা সংখ্যায়
const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  return isNaN(num) ? '০' : toBengaliNumerals(num.toLocaleString('en-US'));
};

// Timezone-safe payment date formatter (Pure String Split — no Date constructor)
function formatPaymentDate(isoString: string | null): string {
  if (!isoString) return '';
  const datePart = isoString.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const yearTwoDigits = parts[0].slice(-2);
    return toBengaliNumerals(`${parts[2]}-${parts[1]}-${yearTwoDigits}`);
  }
  return toBengaliNumerals(isoString);
}

// ২. স্ট্যান্ডার্ড A4 পেজের শীর্ষে ভাউচার স্থাপন ও বড় টেক্সট উপযোগী স্টাইলশিট
const styles = StyleSheet.create({
  page: {
    fontFamily: 'SolaimanLipi',
    padding: 18,
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
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
    padding: 10,
    backgroundColor: '#8B0000',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netSalaryLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  netSalaryValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
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

interface SalarySlipData {
  employeeName: string;
  employeeCode: string;
  employeePhone: string;
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
}

// ৩. রিঅ্যাক্ট-পিডিএফ কমপ্যাক্ট ডকুমেন্ট ভাউচার
const SalarySlipDocument = ({ data, printDate }: { data: SalarySlipData; printDate: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.voucherContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.companyName}>{"বিসমিল্লাহ"}</Text>
          <Text style={styles.slipTitle}>{"বেতন পরিশোধের রসিদ (ভাউচার)"}</Text>
        </View>

        <View style={styles.gridThreeColumn}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{"কর্মচারির বিবরণ"}</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"কোড:"}</Text>
              <Text style={styles.fieldValue}>{toBengaliNumerals(data.employeeCode)}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"নাম:"}</Text>
              <Text style={styles.fieldValue}>{data.employeeName}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"ক্যাটাগরি:"}</Text>
              <Text style={styles.fieldValue}>{data.categoryName}</Text>
            </View>
            {data.employeePhone && (
              <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>{"মোবাইল:"}</Text>
                <Text style={styles.fieldValue}>{toBengaliNumerals(data.employeePhone)}</Text>
              </View>
            )}
          </View>

          <View style={styles.column}>
            <Text style={styles.columnTitle}>{"হাজিরা বিবরণী"}</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"বেতন মাস:"}</Text>
              <Text style={styles.fieldValue}>{toBengaliNumerals(`${data.month}-${data.year}`)}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"উপস্থিত দিন:"}</Text>
              <Text style={styles.fieldValue}>{toBengaliNumerals(`${data.dutyDays} দিন`)}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"অনুপস্থিত দিন:"}</Text>
              <Text style={styles.fieldValue}>{toBengaliNumerals(`${data.absentDays} দিন`)}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{"বোনাস দিন:"}</Text>
              <Text style={styles.fieldValue}>{toBengaliNumerals(`+${data.bonusDays} দিন`)}</Text>
            </View>
          </View>

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

            {data.is_paid && (
              <View style={[styles.fieldRow, { backgroundColor: '#dcfce7', borderRadius: 3, paddingHorizontal: 6, marginTop: 4 }]}>
                <Text style={[styles.fieldLabel, { color: '#166534', fontWeight: 'bold' }]}>
                  {"পরিশোধ:"}
                </Text>
                <Text style={[styles.fieldValue, { color: '#166534', fontSize: 9 }]}>
                  {"পরিশোধিত" + (data.paid_at ? ' (' + formatPaymentDate(data.paid_at) + ')' : '')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureLine}>{"কর্মচারীর স্বাক্ষর"}</Text>
          <Text style={styles.signatureLine}>{"কর্তৃপক্ষের স্বাক্ষর"}</Text>
        </View>

        <View style={styles.footer}>
          <Text>{"* এই স্লিপটি বিসমিল্লাহ প্রতিষ্ঠানের অভ্যন্তরীণ ব্যবহারের জন্য তৈরি।"}</Text>
          <Text>{"মুদ্রণের তারিখ: " + toBengaliNumerals(printDate)}</Text>
        </View>
      </View>

      <View style={styles.cutLineContainer}>
        <Text style={styles.cutLineText}>
          {"✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"}
        </Text>
      </View>
    </Page>
  </Document>
);

// ৪. Lazy PDF wrapper – usePDF only mounts inside the modal
interface LazyPDFWrapperProps {
  data: SalarySlipData;
  printDate: string;
  onReady: (url: string | null) => void;
}

function LazyPDFWrapper({ data, printDate, onReady }: LazyPDFWrapperProps) {
  const [instance, updateInstance] = usePDF({
    document: <SalarySlipDocument data={data} printDate={printDate} />,
  });

  useEffect(() => {
    if (!instance.loading && instance.url) {
      onReady(instance.url);
    }
  }, [instance.loading, instance.url, onReady]);

  return null;
}

export type { SalarySlipData };
export { formatCurrency, formatPaymentDate, SalarySlipDocument, LazyPDFWrapper };
