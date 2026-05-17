import React, { memo } from 'react';
import { View, Text, TouchableOpacity, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NotificationCategory } from '../../store';
import { CATEGORY_META } from '../../constants/notificationCategoryUi';
import { theme } from '../../theme';

export type StudentNotificationRowData = {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  isSystem: boolean;
  category: NotificationCategory;
  isUnread: boolean;
};

export type StudentNotificationRowStyles = {
  card: ViewStyle;
  cardUnread: ViewStyle;
  unreadStripe: ViewStyle;
  cardInner: ViewStyle;
  iconBox: ViewStyle;
  body: ViewStyle;
  bodyTop: ViewStyle;
  bodyTopLeft: ViewStyle;
  catTag: ViewStyle;
  catTagTxt: TextStyle;
  unreadPill: ViewStyle;
  unreadPillTxt: TextStyle;
  redDot: ViewStyle;
  time: TextStyle;
  timeUnread: TextStyle;
  title: TextStyle;
  titleUnread: TextStyle;
  message: TextStyle;
  messageUnread: TextStyle;
  readMore: TextStyle;
};

type Props = {
  item: StudentNotificationRowData;
  isOpen: boolean;
  styles: StudentNotificationRowStyles;
  onPress: (id: string, isUnread: boolean) => void;
};

function StudentNotificationRowComponent({ item, isOpen, styles: s, onPress }: Props) {
  const meta = CATEGORY_META[item.category];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item.id, item.isUnread)}
      style={[s.card, item.isUnread && s.cardUnread]}
    >
      {item.isUnread ? <View style={s.unreadStripe} /> : null}

      <View style={s.cardInner}>
        <View style={[s.iconBox, { backgroundColor: item.isUnread ? '#FEE2E2' : meta.bg }]}>
          <Ionicons
            name={item.isSystem ? 'alert-circle' : meta.icon}
            size={22}
            color={item.isSystem ? theme.colors.warning : item.isUnread ? theme.colors.danger : meta.color}
          />
        </View>

        <View style={s.body}>
          <View style={s.bodyTop}>
            <View style={s.bodyTopLeft}>
              <View style={[s.catTag, { backgroundColor: item.isUnread ? '#FEE2E2' : meta.bg }]}>
                <Text style={[s.catTagTxt, { color: item.isUnread ? theme.colors.danger : meta.color }]}>
                  {item.isSystem ? 'Alert' : meta.short}
                </Text>
              </View>
              {item.isUnread ? (
                <View style={s.unreadPill}>
                  <Text style={s.unreadPillTxt}>NEW</Text>
                </View>
              ) : null}
              {item.isUnread ? <View style={s.redDot} /> : null}
            </View>
            <Text style={[s.time, item.isUnread && s.timeUnread]}>{item.timeLabel}</Text>
          </View>

          <Text style={[s.title, item.isUnread && s.titleUnread]} numberOfLines={isOpen ? undefined : 1}>
            {item.title}
          </Text>

          <Text style={[s.message, item.isUnread && s.messageUnread]} numberOfLines={isOpen ? undefined : 2}>
            {item.message}
          </Text>

          {item.message.length > 80 ? (
            <Text style={[s.readMore, { color: item.isUnread ? theme.colors.danger : meta.color }]}>
              {isOpen ? 'Show less ↑' : 'Read more ↓'}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function propsAreEqual(prev: Props, next: Props) {
  return (
    prev.isOpen === next.isOpen &&
    prev.styles === next.styles &&
    prev.item.id === next.item.id &&
    prev.item.isUnread === next.item.isUnread &&
    prev.item.title === next.item.title &&
    prev.item.message === next.item.message &&
    prev.item.timeLabel === next.item.timeLabel
  );
}

export const StudentNotificationRow = memo(StudentNotificationRowComponent, propsAreEqual);
