import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle, G } from 'react-native-svg';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import type { CommunicationCampaign } from '../../store';
import {
  audienceGroupTones,
  shiftIcon,
  shiftTimeRange,
  shiftTone,
  shiftTypeLabel,
} from '../../utils/shiftUi';
import { commColors, pct } from './commTheme';

export function ProgressRing({
  percent,
  size = 44,
  stroke = 4,
  color = commColors.purple,
  trackColor = '#E5E7EB',
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <Text style={[ringStyles.pct, { fontSize: size * 0.22 }]}>{percent}%</Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  pct: { position: 'absolute', fontWeight: '800', color: commColors.purple },
});

export function OverviewStatCard({
  label,
  value,
  subLabel,
  icon,
  tint,
  isDark,
}: {
  label: string;
  value: number | string;
  subLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  isDark: boolean;
}) {
  return (
    <View style={[overview.card, isDark && overview.cardDark]}>
      <View style={[overview.iconWrap, { backgroundColor: isDark ? `${tint}22` : `${tint}18` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[overview.value, isDark && overview.valueDark]}>{value}</Text>
      <Text style={overview.label}>{label}</Text>
      {subLabel ? <Text style={[overview.sub, { color: tint }]}>{subLabel}</Text> : null}
    </View>
  );
}

const overview = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E0F0',
  },
  cardDark: { backgroundColor: commColors.purpleCardDark, borderColor: '#2D1F3D' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: { fontSize: 22, fontWeight: '800', color: '#1F1230' },
  valueDark: { color: '#F8F4FC' },
  label: { fontSize: 12, fontWeight: '600', color: '#6B6280', marginTop: 2 },
  sub: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});

export function RecentActivityRow({
  campaign,
  onPress,
  isDark,
}: {
  campaign: CommunicationCampaign;
  onPress: () => void;
  isDark: boolean;
}) {
  const readPct = pct(campaign.readCount || 0, campaign.recipientCount || 0);
  const time = campaign.sentAt
    ? format(new Date(campaign.sentAt), 'dd MMM · h:mm a')
    : 'Recently';
  return (
    <TouchableOpacity style={[recent.row, isDark && recent.rowDark]} onPress={onPress} activeOpacity={0.88}>
      <View style={recent.icon}>
        <Ionicons name="mail-outline" size={18} color={commColors.purple} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[recent.title, isDark && recent.titleDark]} numberOfLines={1}>
          {campaign.title}
        </Text>
        <Text style={recent.meta} numberOfLines={1}>
          {time} · {readPct}% read
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const recent = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDE8F4',
  },
  rowDark: { borderBottomColor: '#2D1F3D' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: commColors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1F1230' },
  titleDark: { color: '#F3EEFA' },
  meta: { fontSize: 12, fontWeight: '500', color: '#8B8399', marginTop: 3 },
});

export function SentMessageRow({
  campaign,
  selected,
  onPress,
  isDark,
}: {
  campaign: CommunicationCampaign;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const recipients = campaign.recipientCount || 0;
  const delivered = campaign.pushSentCount || 0;
  const read = campaign.readCount || 0;
  const readPct = pct(read, recipients);
  const preview = (campaign.message || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const timeLabel = campaign.sentAt
    ? isToday(new Date(campaign.sentAt))
      ? `Today ${format(new Date(campaign.sentAt), 'h:mm a')}`
      : format(new Date(campaign.sentAt), 'dd MMM · h:mm a')
    : '';

  return (
    <TouchableOpacity
      style={[sent.row, selected && sent.rowSelected, isDark && sent.rowDark, selected && isDark && sent.rowSelectedDark]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={sent.top}>
          <Text style={[sent.title, isDark && sent.titleDark]} numberOfLines={1}>
            {campaign.title}
          </Text>
          <Text style={sent.time}>{timeLabel}</Text>
        </View>
        <Text style={sent.preview} numberOfLines={2}>
          {preview || campaign.audienceLabel}
        </Text>
        <View style={sent.stats}>
          <View style={sent.stat}>
            <Ionicons name="people-outline" size={13} color={commColors.purple} />
            <Text style={sent.statTxt}>{recipients}</Text>
          </View>
          <View style={sent.stat}>
            <Ionicons name="checkmark-done-outline" size={13} color={commColors.info} />
            <Text style={sent.statTxt}>{delivered}</Text>
          </View>
          <View style={sent.stat}>
            <Ionicons name="eye-outline" size={13} color={commColors.success} />
            <Text style={sent.statTxt}>{read}</Text>
          </View>
        </View>
      </View>
      <ProgressRing percent={readPct} color={commColors.purple} trackColor={isDark ? '#2D1F3D' : '#EDE8F4'} />
    </TouchableOpacity>
  );
}

const sent = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDE8F4',
  },
  rowDark: { backgroundColor: commColors.purpleDarkBg, borderBottomColor: '#2D1F3D' },
  rowSelected: { backgroundColor: commColors.purpleSoft },
  rowSelectedDark: { backgroundColor: '#251833' },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1F1230' },
  titleDark: { color: '#F8F4FC' },
  time: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  preview: { fontSize: 13, fontWeight: '500', color: '#6B6280', marginTop: 4, lineHeight: 18 },
  stats: { flexDirection: 'row', gap: 14, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTxt: { fontSize: 12, fontWeight: '700', color: '#6B6280' },
});

export function SwipeableSentRow({
  campaign,
  selected,
  onPress,
  onDelete,
  isDark,
}: {
  campaign: CommunicationCampaign;
  selected: boolean;
  onPress: () => void;
  onDelete: () => void;
  isDark: boolean;
}) {
  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <TouchableOpacity style={swipe.delete} onPress={onDelete} activeOpacity={0.9}>
          <Ionicons name="trash" size={22} color="#fff" />
          <Text style={swipe.deleteTxt}>Delete</Text>
        </TouchableOpacity>
      )}
    >
      <SentMessageRow campaign={campaign} selected={selected} onPress={onPress} isDark={isDark} />
    </Swipeable>
  );
}

const swipe = StyleSheet.create({
  delete: {
    width: 88,
    backgroundColor: commColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

export function EmptySentState({ onCompose, isDark }: { onCompose: () => void; isDark: boolean }) {
  return (
    <View style={empty.wrap}>
      <View style={[empty.icon, isDark && empty.iconDark]}>
        <Ionicons name="mail-open-outline" size={48} color={commColors.purple} />
      </View>
      <Text style={[empty.title, isDark && empty.titleDark]}>Start your first communication</Text>
      <Text style={empty.sub}>Send fee reminders, notices, and updates to your students.</Text>
      <TouchableOpacity style={empty.btn} onPress={onCompose} activeOpacity={0.9}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={empty.btnTxt}>New Message</Text>
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 48 },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: commColors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconDark: { backgroundColor: '#251833' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F1230', textAlign: 'center' },
  titleDark: { color: '#F8F4FC' },
  sub: { fontSize: 14, color: '#8B8399', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: commColors.purple,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export function SendSuccessView({
  count,
  onViewMessage,
  onSendAnother,
  isDark,
}: {
  count: number;
  onViewMessage: () => void;
  onSendAnother: () => void;
  isDark: boolean;
}) {
  return (
    <View style={[success.wrap, isDark && success.wrapDark]}>
      <View style={success.check}>
        <Ionicons name="checkmark" size={48} color="#fff" />
      </View>
      <Text style={[success.title, isDark && success.titleDark]}>Communication sent successfully!</Text>
      <Text style={success.sub}>
        Delivered to {count} student{count === 1 ? '' : 's'}
      </Text>
      <TouchableOpacity style={success.primary} onPress={onViewMessage} activeOpacity={0.9}>
        <Text style={success.primaryTxt}>View Message</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[success.secondary, isDark && success.secondaryDark]} onPress={onSendAnother} activeOpacity={0.9}>
        <Text style={[success.secondaryTxt, isDark && success.secondaryTxtDark]}>Send Another</Text>
      </TouchableOpacity>
    </View>
  );
}

const success = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFFFFF' },
  wrapDark: { backgroundColor: commColors.purpleDarkBg },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: commColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1F1230', textAlign: 'center' },
  titleDark: { color: '#F8F4FC' },
  sub: { fontSize: 14, color: '#8B8399', marginTop: 8, textAlign: 'center' },
  primary: {
    marginTop: 32,
    width: '100%',
    backgroundColor: commColors.purple,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: commColors.purple,
  },
  secondaryDark: { borderColor: commColors.purpleLight },
  secondaryTxt: { color: commColors.purple, fontSize: 16, fontWeight: '700' },
  secondaryTxtDark: { color: commColors.purpleLight },
});

export function ContactsBulkBar({
  count,
  onMessage,
  onClear,
}: {
  count: number;
  onMessage: () => void;
  onClear: () => void;
}) {
  return (
    <View style={bulk.bar}>
      <TouchableOpacity onPress={onClear} hitSlop={8}>
        <Text style={bulk.clear}>Clear</Text>
      </TouchableOpacity>
      <Text style={bulk.count}>{count} Selected</Text>
      <TouchableOpacity style={bulk.msgBtn} onPress={onMessage} activeOpacity={0.9}>
        <Ionicons name="mail-outline" size={18} color="#fff" />
        <Text style={bulk.msgTxt}>Message</Text>
      </TouchableOpacity>
    </View>
  );
}

const bulk = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: commColors.purpleDark,
    gap: 12,
  },
  clear: { color: '#C4B5D6', fontSize: 14, fontWeight: '600' },
  count: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '800' },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: commColors.purpleLight,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  msgTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

export function RecipientChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <View style={chip.wrap}>
      <Text style={chip.txt} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={6}>
          <Ionicons name="close-circle" size={16} color={commColors.purple} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: commColors.purpleSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 140,
  },
  txt: { fontSize: 12, fontWeight: '700', color: commColors.purple, flexShrink: 1 },
});

type AudienceTone = { fg: string; bg: string; border: string };

export function AudienceChip({
  label,
  sublabel,
  icon,
  tone,
  active,
  onPress,
  layout = 'half',
  isDark = false,
}: {
  label: string;
  sublabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: AudienceTone;
  active: boolean;
  onPress: () => void;
  layout?: 'third' | 'half';
  isDark?: boolean;
}) {
  const inactiveBg = isDark ? '#1F2937' : '#F9FAFB';
  const inactiveBorder = isDark ? '#374151' : '#E5E7EB';
  const muted = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <TouchableOpacity
      style={[
        audienceStyles.chip,
        layout === 'third' ? audienceStyles.chipThird : audienceStyles.chipHalf,
        {
          backgroundColor: active ? tone.bg : inactiveBg,
          borderColor: active ? tone.border : inactiveBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={17} color={active ? tone.fg : muted} />
      <View style={audienceStyles.chipTextCol}>
        <Text style={[audienceStyles.chipLabel, { color: active ? tone.fg : isDark ? '#F3F4F6' : '#111827' }]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[audienceStyles.chipSub, { color: active ? tone.fg : muted }]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function MessageAudiencePicker({
  bulkMode,
  selectedShiftId,
  shifts,
  onPickAll,
  onPickActive,
  onPickExpired,
  onPickShift,
  isDark = false,
}: {
  bulkMode: string;
  selectedShiftId: string | null;
  shifts: { id: string; name: string; type: string; startTime: number; endTime: number }[];
  onPickAll: () => void;
  onPickActive: () => void;
  onPickExpired: () => void;
  onPickShift: (shiftId: string) => void;
  isDark?: boolean;
}) {
  const sectionColor = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={audienceStyles.root}>
      <Text style={[audienceStyles.sectionLabel, { color: sectionColor }]}>Send to group</Text>
      <View style={audienceStyles.groupRow}>
        <AudienceChip
          label="All"
          icon="people-outline"
          tone={audienceGroupTones.all}
          active={bulkMode === 'all'}
          onPress={onPickAll}
          layout="third"
          isDark={isDark}
        />
        <AudienceChip
          label="Active"
          icon="checkmark-circle-outline"
          tone={audienceGroupTones.active}
          active={bulkMode === 'active'}
          onPress={onPickActive}
          layout="third"
          isDark={isDark}
        />
        <AudienceChip
          label="Expired"
          icon="alert-circle-outline"
          tone={audienceGroupTones.expired}
          active={bulkMode === 'expired'}
          onPress={onPickExpired}
          layout="third"
          isDark={isDark}
        />
      </View>

      {shifts.length > 0 ? (
        <>
          <Text style={[audienceStyles.sectionLabel, audienceStyles.sectionLabelSpaced, { color: sectionColor }]}>
            By shift
          </Text>
          <View style={audienceStyles.shiftGrid}>
            {shifts.map((shift) => {
              const typeLabel = shiftTypeLabel(shift.type);
              const sublabel =
                shift.type === 'custom'
                  ? shift.name.includes('Custom') ? shiftTimeRange(shift.startTime, shift.endTime) : shift.name
                  : shiftTimeRange(shift.startTime, shift.endTime);

              return (
                <AudienceChip
                  key={shift.id}
                  label={typeLabel}
                  sublabel={sublabel}
                  icon={shiftIcon(shift.type)}
                  tone={shiftTone(shift.type)}
                  active={bulkMode === 'shift' && selectedShiftId === shift.id}
                  onPress={() => onPickShift(shift.id)}
                  layout="half"
                  isDark={isDark}
                />
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const audienceStyles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  sectionLabelSpaced: { marginTop: 4 },
  groupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shiftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 48,
  },
  chipThird: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
  },
  chipHalf: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 148,
  },
  chipTextCol: { flex: 1, minWidth: 0 },
  chipLabel: { fontSize: 13, fontWeight: '800' },
  chipSub: { fontSize: 11, fontWeight: '600', marginTop: 2, opacity: 0.9 },
});

export type SentTimeFilter = 'all' | 'today' | 'week' | 'month';

const SENT_TIME_FILTERS: { id: SentTimeFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'layers-outline' },
  { id: 'today', label: 'Today', icon: 'today-outline' },
  { id: 'week', label: 'This Week', icon: 'calendar-outline' },
  { id: 'month', label: 'This Month', icon: 'calendar-number-outline' },
];

export function SentTimeFilterBar({
  value,
  onChange,
  isDark = false,
}: {
  value: SentTimeFilter;
  onChange: (filter: SentTimeFilter) => void;
  isDark?: boolean;
}) {
  const inactiveBg = isDark ? '#1F2937' : '#F9FAFB';
  const inactiveBorder = isDark ? '#374151' : '#E5E7EB';
  const muted = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View
      style={[
        sentFilterStyles.root,
        { borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
      ]}
    >
      <View style={sentFilterStyles.grid}>
        {SENT_TIME_FILTERS.map((item) => {
          const active = value === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                sentFilterStyles.chip,
                {
                  backgroundColor: active ? commColors.purpleSoft : inactiveBg,
                  borderColor: active ? commColors.purple : inactiveBorder,
                },
              ]}
              onPress={() => onChange(item.id)}
              activeOpacity={0.85}
            >
              <Ionicons name={item.icon} size={16} color={active ? commColors.purple : muted} />
              <Text
                style={[
                  sentFilterStyles.chipLabel,
                  { color: active ? commColors.purple : isDark ? '#F3F4F6' : '#111827' },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const sentFilterStyles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 148,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  chipLabel: { fontSize: 13, fontWeight: '800', flexShrink: 1 },
});

export function filterSentByTime(
  items: CommunicationCampaign[],
  filter: 'all' | 'today' | 'week' | 'month'
): CommunicationCampaign[] {
  if (filter === 'all') return items;
  return items.filter((c) => {
    if (!c.sentAt) return false;
    const d = new Date(c.sentAt);
    if (filter === 'today') return isToday(d);
    if (filter === 'week') return isThisWeek(d, { weekStartsOn: 1 });
    if (filter === 'month') return isThisMonth(d);
    return true;
  });
}
