import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { attendanceQrRef } from '../../utils/attendanceQr';
import { theme } from '../../theme';

export type AttendanceListHeaderStyles = Record<string, ViewStyle | TextStyle>;

type Props = {
  styles: AttendanceListHeaderStyles;
  attendancesCount: number;
  studentsCount: number;
  attendanceRatio: number;
  dailyQrToken: string | null;
  printing: boolean;
  selectedDateObj: Date;
  isToday: boolean;
  showDatePicker: boolean;
  onRotateQr: () => void;
  onPrint: () => void;
  onOpenDatePicker: () => void;
  onCloseDatePicker: () => void;
  onDateChange: (event: { type?: string }, date?: Date) => void;
};

function AttendanceListHeaderComponent({
  styles: s,
  attendancesCount,
  studentsCount,
  attendanceRatio,
  dailyQrToken,
  printing,
  selectedDateObj,
  isToday,
  showDatePicker,
  onRotateQr,
  onPrint,
  onOpenDatePicker,
  onCloseDatePicker,
  onDateChange,
}: Props) {
  const handleRotatePress = () => {
    Alert.alert('Confirm QR change', 'Are you sure you want to change QR code?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, change', onPress: onRotateQr },
    ]);
  };

  return (
    <>
      <View style={s.statsStrip as ViewStyle}>
        <View style={s.statChip as ViewStyle}>
          <Text style={s.statChipVal as TextStyle}>{attendancesCount}</Text>
          <Text style={s.statChipLab as TextStyle}>Present</Text>
        </View>
        <View style={s.statChipDivider as ViewStyle} />
        <View style={s.statChip as ViewStyle}>
          <Text style={s.statChipVal as TextStyle}>{studentsCount}</Text>
          <Text style={s.statChipLab as TextStyle}>Members</Text>
        </View>
        <View style={s.statChipDivider as ViewStyle} />
        <View style={s.statChipWide as ViewStyle}>
          <Text style={s.statChipValSmall as TextStyle}>{attendanceRatio}%</Text>
          <Text style={s.statChipLab as TextStyle}>of members</Text>
        </View>
      </View>

      <View style={s.qrPanel as ViewStyle}>
        <View style={s.qrInner as ViewStyle}>
          {dailyQrToken ? (
            <QRCode value={dailyQrToken} size={168} color={theme.colors.text} backgroundColor={theme.colors.surface} />
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          )}
        </View>

        <View style={s.actionRow as ViewStyle}>
          <TouchableOpacity style={s.btnOutline as ViewStyle} onPress={handleRotatePress} activeOpacity={0.85}>
            <Ionicons name="sync-outline" size={19} color={theme.colors.primary} />
            <Text style={s.btnOutlineTxt as TextStyle}>New code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btnSolid as ViewStyle, (!dailyQrToken || printing) && (s.btnSolidDim as ViewStyle)]}
            onPress={onPrint}
            disabled={!dailyQrToken || printing}
            activeOpacity={0.9}
          >
            {printing ? (
              <ActivityIndicator color={theme.colors.dark} size="small" />
            ) : (
              <>
                <Ionicons name="print-outline" size={19} color={theme.colors.dark} />
                <Text style={s.btnSolidTxt as TextStyle}>Print</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {dailyQrToken ? (
          <Text style={s.qrRefTxt as TextStyle}>
            Code ref: {attendanceQrRef(dailyQrToken)} — match website Attendance QR
          </Text>
        ) : null}
      </View>

      <TouchableOpacity style={s.dateCard as ViewStyle} onPress={onOpenDatePicker} activeOpacity={0.88}>
        <View style={s.dateIconWrap as ViewStyle}>
          <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
        </View>
        <View style={s.dateTextWrap as ViewStyle}>
          <Text style={s.dateLabel as TextStyle}>{isToday ? 'Today' : 'Selected day'}</Text>
          <Text style={s.dateHuman as TextStyle}>{format(selectedDateObj, 'EEEE, d MMMM yyyy')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedText} />
      </TouchableOpacity>

      {showDatePicker && Platform.OS === 'ios' ? (
        <TouchableOpacity style={s.dateDoneIos as ViewStyle} onPress={onCloseDatePicker}>
          <Text style={s.dateDoneTxt as TextStyle}>Done</Text>
        </TouchableOpacity>
      ) : null}

      {showDatePicker ? (
        <DateTimePicker
          value={selectedDateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      ) : null}

      <View style={s.checkHeader as ViewStyle}>
        <View style={s.checkHeaderLeft as ViewStyle}>
          <Ionicons name="checkmark-done-circle" size={18} color={theme.colors.primary} />
          <Text style={s.listTitle as TextStyle}>Check-ins</Text>
        </View>
        {attendancesCount > 0 ? (
          <View style={s.checkCount as ViewStyle}>
            <Text style={s.checkCountTxt as TextStyle}>{attendancesCount} entries</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

export const AttendanceListHeader = memo(AttendanceListHeaderComponent);
