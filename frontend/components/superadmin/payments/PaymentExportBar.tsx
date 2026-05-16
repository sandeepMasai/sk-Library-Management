import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react-native';
import { theme } from '../../../theme';
import type { PaymentRow } from './types';
import { exportPaymentsCsv, exportPaymentsExcel, exportPaymentsPdf, printPaymentsTable } from './exportPayments';

type Props = {
  rows: PaymentRow[];
  borderColor: string;
  surfaceColor: string;
  textColor: string;
};

function ExportBtn({
  label,
  icon,
  onPress,
  borderColor,
  textColor,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  borderColor: string;
  textColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, { borderColor }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={[styles.btnTxt, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PaymentExportBar({ rows, borderColor, surfaceColor, textColor }: Props) {
  return (
    <View style={[styles.wrap, { borderColor, backgroundColor: surfaceColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Export & print</Text>
      <View style={styles.row}>
        <ExportBtn
          label="CSV"
          icon={<Download size={16} color={theme.colors.primary} />}
          onPress={() => void exportPaymentsCsv(rows)}
          borderColor={borderColor}
          textColor={textColor}
        />
        <ExportBtn
          label="Excel"
          icon={<FileSpreadsheet size={16} color={theme.colors.primary} />}
          onPress={() => void exportPaymentsExcel(rows)}
          borderColor={borderColor}
          textColor={textColor}
        />
        <ExportBtn
          label="PDF"
          icon={<FileText size={16} color={theme.colors.primary} />}
          onPress={() => void exportPaymentsPdf(rows)}
          borderColor={borderColor}
          textColor={textColor}
        />
        {Platform.OS === 'web' ? (
          <ExportBtn
            label="Print"
            icon={<Printer size={16} color={theme.colors.primary} />}
            onPress={() => void printPaymentsTable(rows)}
            borderColor={borderColor}
            textColor={textColor}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  title: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(79,70,229,0.04)',
  },
  btnTxt: { fontSize: 12, fontWeight: '800' },
});
