import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NotificationCategory } from '../../store';
import { CATEGORY_META } from '../../constants/notificationCategoryUi';
import { theme } from '../../theme';

export type StudentNotificationRowData = {
  id: string;
  title: string;
  message: string;
  imageUrl?: string | null;
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
  onImagePress?: (imageUrl: string, title: string) => void;
};

function StudentNotificationRowComponent({ item, isOpen, styles: s, onPress, onImagePress }: Props) {
  const meta = CATEGORY_META[item.category];
  const hasLongMessage = item.message.length > 80;
  const showReadMore = hasLongMessage || Boolean(item.imageUrl);

  return (
    <View style={[s.card, item.isUnread && s.cardUnread]}>
      {item.isUnread ? <View style={s.unreadStripe} /> : null}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(item.id, item.isUnread)}
        style={s.cardInner}
      >
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

          {item.message ? (
            <Text style={[s.message, item.isUnread && s.messageUnread]} numberOfLines={isOpen ? undefined : 2}>
              {item.message}
            </Text>
          ) : null}

          {showReadMore ? (
            <Text style={[s.readMore, { color: item.isUnread ? theme.colors.danger : meta.color }]}>
              {isOpen ? 'Show less ↑' : 'Read more ↓'}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {item.imageUrl ? (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onImagePress?.(item.imageUrl!, item.title)}
          style={localStyles.imageWrap}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={[localStyles.imagePreview, isOpen && localStyles.imagePreviewOpen]}
            contentFit="contain"
            transition={200}
          />
          <View style={localStyles.imageBadge}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
            <Text style={localStyles.imageBadgeTxt}>Tap to view full · Download</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const localStyles = StyleSheet.create({
  imageWrap: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#F1F5F9',
  },
  imagePreviewOpen: {
    height: 280,
  },
  imageBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  imageBadgeTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

function propsAreEqual(prev: Props, next: Props) {
  return (
    prev.isOpen === next.isOpen &&
    prev.styles === next.styles &&
    prev.item.id === next.item.id &&
    prev.item.isUnread === next.item.isUnread &&
    prev.item.title === next.item.title &&
    prev.item.message === next.item.message &&
    prev.item.imageUrl === next.item.imageUrl &&
    prev.item.timeLabel === next.item.timeLabel &&
    prev.onImagePress === next.onImagePress
  );
}

export const StudentNotificationRow = memo(StudentNotificationRowComponent, propsAreEqual);
