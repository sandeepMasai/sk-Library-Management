import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle, type TextStyle, type ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export type AttendanceEntryRowData = {
  id: string;
  studentName: string;
  displayInitial: string;
  photoUrl?: string | null;
  formattedTime: string;
};

export type AttendanceEntryRowStyles = {
  entryCard: ViewStyle;
  entryAvatar: ViewStyle;
  entryAvatarImg: ImageStyle;
  entryAvatarTxt: TextStyle;
  entryUsername: TextStyle;
  entryTime: TextStyle;
  presentBadge: ViewStyle;
  presentTxt: TextStyle;
};

type Props = {
  item: AttendanceEntryRowData;
  styles: AttendanceEntryRowStyles;
};

function AttendanceEntryRowComponent({ item, styles }: Props) {
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryAvatar}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.entryAvatarImg} />
        ) : (
          <Text style={styles.entryAvatarTxt}>{item.displayInitial}</Text>
        )}
      </View>

      <Text style={styles.entryUsername} numberOfLines={1}>
        {item.studentName}
      </Text>

      <View style={rowStyles.spacer} />

      <Text style={styles.entryTime}>{item.formattedTime}</Text>

      <View style={styles.presentBadge}>
        <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
        <Text style={styles.presentTxt}>Present</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  spacer: { flex: 1 },
});

function propsAreEqual(prev: Props, next: Props) {
  const a = prev.item;
  const b = next.item;
  return (
    a.id === b.id &&
    a.studentName === b.studentName &&
    a.displayInitial === b.displayInitial &&
    a.photoUrl === b.photoUrl &&
    a.formattedTime === b.formattedTime &&
    prev.styles === next.styles
  );
}

export const AttendanceEntryRow = memo(AttendanceEntryRowComponent, propsAreEqual);
