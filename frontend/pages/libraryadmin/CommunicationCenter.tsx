import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  useAppStore,
  type CommunicationCampaign,
  type CommunicationStats,
  type User,
} from '../../store';
import { apiGet } from '../../services/api';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import {
  isStudentMembershipActiveForAttendance,
  membershipExpiryLabel,
} from '../../utils/studentMembership';
import {
  MessageSendFeedbackModal,
  type MessageSendFeedbackState,
} from '../../components/library/MessageSendFeedbackModal';
import { deriveCommunicationTitle } from '../../utils/communicationMessage';
import { replaceVariables } from '../../utils/templates';

type ListTab = 'students' | 'sent';
type StudentFilter = 'all' | 'active' | 'expired';
type BulkMode = 'one' | 'multiple' | 'all';
type DeliveryPhase = 'idle' | 'sending' | 'sent';

type TemplateRow = { id: string; name: string; message: string };

const QUICK_ACTIONS = [
  { id: 'fee', emoji: '📢', label: 'Fee Reminder', title: 'Fee Renewal Reminder', message: 'Dear student, please renew your library membership fee at the earliest to continue uninterrupted access.' },
  { id: 'expiry', emoji: '📅', label: 'Expiry Alert', title: 'Membership Expiry Alert', message: 'Your library membership is expiring soon. Please visit the library desk or renew through the app.' },
  { id: 'festival', emoji: '🎉', label: 'Festival', title: 'Festival Wishes', message: 'Warm wishes from your library family! Stay focused and keep learning.' },
  { id: 'exam', emoji: '📚', label: 'Exam Notice', title: 'Exam Preparation Notice', message: 'Best of luck for your upcoming exams. Library timings and rules are updated — please check notices.' },
  { id: 'closed', emoji: '🚫', label: 'Closed', title: 'Library Closed', message: 'Please note: the library will remain closed on the mentioned date. Plan your study schedule accordingly.' },
] as const;

const EMOJIS = ['😊', '👍', '🙏', '📢', '✅', '❗', '📚', '🎉', '⏰', '💳'];

function deliveryLabel(campaign: CommunicationCampaign): { icon: string; text: string; tone: string } {
  const read = campaign.readCount || 0;
  const delivered = campaign.pushSentCount || 0;
  if (read > 0) return { icon: '👁', text: `Read ${read}`, tone: '#059669' };
  if (delivered > 0) return { icon: '✓✓', text: 'Delivered', tone: '#2563EB' };
  return { icon: '✓', text: 'Sent', tone: '#64748B' };
}

export default function CommunicationCenterScreen() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const statAccents = isDark
    ? { delivered: '#60A5FA', read: '#34D399', pending: '#FBBF24' }
    : { delivered: '#2563EB', read: '#059669', pending: '#D97706' };
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = useMemo(() => makeStyles(mode, isWide), [mode, isWide]);

  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);
  const fetchStudents = useAppStore((s) => s.fetchStudents);
  const sendCommunicationMessage = useAppStore((s) => s.sendCommunicationMessage);
  const fetchCommunicationHistory = useAppStore((s) => s.fetchCommunicationHistory);
  const fetchCommunicationStats = useAppStore((s) => s.fetchCommunicationStats);
  const previewCommunicationRecipientCount = useAppStore((s) => s.previewCommunicationRecipientCount);

  const [listTab, setListTab] = useState<ListTab>('students');
  const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState<BulkMode>('one');
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CommunicationCampaign | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [deliveryPhase, setDeliveryPhase] = useState<DeliveryPhase>('idle');
  const [sendFeedback, setSendFeedback] = useState<MessageSendFeedbackState | null>(null);

  const showFeedback = (state: MessageSendFeedbackState) => setSendFeedback(state);

  const [history, setHistory] = useState<CommunicationCampaign[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipientCount, setRecipientCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);

  const selectedStudentCount =
    bulkMode === 'one' ? (selectedStudentId ? 1 : 0) : bulkMode === 'multiple' ? multiIds.length : 0;

  const needsStudentSelection = bulkMode === 'one' || bulkMode === 'multiple';
  const canPreviewOrSend =
    bulkMode === 'all' ||
    (bulkMode === 'one' && Boolean(selectedStudentId)) ||
    (bulkMode === 'multiple' && multiIds.length > 0);

  const refreshRecipientCount = useCallback(async () => {
    if (bulkMode === 'one') {
      setRecipientCount(selectedStudentId ? 1 : 0);
      return;
    }
    if (bulkMode === 'multiple' && multiIds.length === 0) {
      setRecipientCount(0);
      return;
    }
    setCountLoading(true);
    try {
      const count = await previewCommunicationRecipientCount({
        audience: bulkMode === 'all' ? 'all' : 'selected',
        studentIds: bulkMode === 'multiple' ? multiIds : selectedStudentId ? [selectedStudentId] : [],
      });
      setRecipientCount(count);
    } finally {
      setCountLoading(false);
    }
  }, [bulkMode, selectedStudentId, multiIds, previewCommunicationRecipientCount]);

  useEffect(() => {
    if (needsStudentSelection && selectedStudentCount === 0) {
      setRecipientCount(0);
      setCountLoading(false);
      return;
    }
    void refreshRecipientCount();
  }, [needsStudentSelection, selectedStudentCount, refreshRecipientCount]);

  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);
  const libraryName = String(
    (currentUser as { libraryName?: string })?.libraryName || currentUser?.name || 'Your Library'
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [hist, st] = await Promise.all([fetchCommunicationHistory(), fetchCommunicationStats()]);
      setHistory(hist);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }, [fetchCommunicationHistory, fetchCommunicationStats]);

  useEffect(() => {
    void fetchStudents();
    void refresh();
    apiGet<{ ok: boolean; templates: TemplateRow[] }>(`/api/templates`)
      .then((r) => setTemplates(r.templates || []))
      .catch(() => setTemplates([]));
  }, [fetchStudents, refresh]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (studentFilter === 'active' && !isStudentMembershipActiveForAttendance(s)) return false;
      if (studentFilter === 'expired' && isStudentMembershipActiveForAttendance(s)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.mobile.includes(q) ||
        s.username.toLowerCase().includes(q)
      );
    });
  }, [students, studentFilter, search]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) => h.title.toLowerCase().includes(q) || h.message.toLowerCase().includes(q)
    );
  }, [history, search]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const selectStudent = (id: string) => {
    setSelectedStudentId(id);
    setSelectedCampaign(null);
    setBulkMode('one');
    if (!isWide) setShowMobileDetail(true);
  };

  const selectCampaign = (c: CommunicationCampaign) => {
    setSelectedCampaign(c);
    setSelectedStudentId(null);
    if (!isWide) setShowMobileDetail(true);
  };

  const toggleMulti = (id: string) => {
    setMultiIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setBulkMode('multiple');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
  };

  const applyQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    setMessage(action.message);
    setSelectedCampaign(null);
    if (!isWide) setShowMobileDetail(true);
  };

  const fillTemplateMessage = useCallback(
    (raw: string) => {
      if (bulkMode === 'one' && selectedStudent) {
        return replaceVariables(raw, {
          student_name: selectedStudent.name,
          library_name: libraryName,
          due_date: membershipExpiryLabel(selectedStudent),
          amount: selectedStudent.feeAmount ?? '',
        });
      }
      return raw;
    },
    [bulkMode, selectedStudent, libraryName]
  );

  const handleSend = async () => {
    const m = message.trim();
    if (!m && !imageUri) {
      showFeedback({ variant: 'warning', title: 'Message required', subtitle: 'Add message text or attach an image.' });
      return;
    }
    const t = deriveCommunicationTitle(m, Boolean(imageUri));

    let audience: 'all' | 'selected' = 'selected';
    let studentIds: string[] = [];

    if (bulkMode === 'all') {
      audience = 'all';
    } else if (bulkMode === 'multiple') {
      studentIds = multiIds;
      if (!studentIds.length) {
        showFeedback({ variant: 'warning', title: 'Select students', subtitle: 'Pick at least one student from the list.' });
        return;
      }
    } else {
      if (!selectedStudentId) {
        showFeedback({ variant: 'warning', title: 'Select a student', subtitle: 'Choose a student from the left panel.' });
        return;
      }
      studentIds = [selectedStudentId];
    }

    setDeliveryPhase('sending');
    const sentImageUri = imageUri;
    try {
      const messageType = imageUri && m ? 'text_image' : imageUri ? 'image' : 'text';
      const result = await sendCommunicationMessage({
        title: t,
        message: m,
        messageType,
        audience,
        studentIds: audience === 'all' ? [] : studentIds,
        imageUri,
      });
      if (!result.ok) {
        setDeliveryPhase('idle');
        showFeedback({
          variant: 'error',
          title: 'Could not send',
          subtitle: result.message || 'Please check your connection and try again.',
        });
        return;
      }
      const count = result.recipientCount ?? 0;
      setDeliveryPhase('sent');
      setImageUri(null);
      setMultiIds([]);
      await refresh();
      setTimeout(() => setDeliveryPhase('idle'), 2000);
      showFeedback({
        variant: 'success',
        title: 'Message sent!',
        subtitle: `Delivered to ${count} student${count === 1 ? '' : 's'} successfully.`,
        recipientCount: count,
        messageBody: m || (sentImageUri ? 'Photo sent' : undefined),
      });
    } catch {
      setDeliveryPhase('idle');
      showFeedback({
        variant: 'error',
        title: 'Send failed',
        subtitle: 'Something went wrong. Please try again.',
      });
    }
  };

  const showList = isWide || !showMobileDetail;
  const showPreview = isWide || showMobileDetail;

  const listPanel = (
    <View style={styles.listPanel}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.mutedText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students or messages…"
          placeholderTextColor={theme.colors.mutedText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabRow}>
        {(['students', 'sent'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, listTab === tab && styles.tabBtnOn]}
            onPress={() => setListTab(tab)}
          >
            <Text style={[styles.tabBtnTxt, listTab === tab && styles.tabBtnTxtOn]}>
              {tab === 'students' ? 'Students' : 'Sent'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {listTab === 'students' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['all', 'active', 'expired'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, studentFilter === f && styles.filterChipOn]}
              onPress={() => setStudentFilter(f)}
            >
              <Text style={[styles.filterChipTxt, studentFilter === f && styles.filterChipTxtOn]}>
                {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Expired'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.bulkRow}>
        {(['one', 'multiple', 'all'] as const).map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.bulkBtn, bulkMode === b && styles.bulkBtnOn]}
            onPress={() => {
              setBulkMode(b);
              if (b === 'all') {
                setSelectedStudentId(null);
                setShowMobileDetail(true);
              }
            }}
          >
            <Text style={[styles.bulkBtnTxt, bulkMode === b && styles.bulkBtnTxtOn]}>
              {b === 'one' ? 'One' : b === 'multiple' ? 'Multiple' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listBody}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />
        ) : listTab === 'students' ? (
          <FlashList
            data={filteredStudents}
            estimatedItemSize={72}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StudentListRow
                student={item}
                selected={selectedStudentId === item.id}
                multi={bulkMode === 'multiple'}
                checked={multiIds.includes(item.id)}
                onPress={() => (bulkMode === 'multiple' ? toggleMulti(item.id) : selectStudent(item.id))}
                styles={styles}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyTxt}>No students found.</Text>}
          />
        ) : (
          <FlashList
            data={filteredHistory}
            estimatedItemSize={80}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CampaignListRow
                campaign={item}
                selected={selectedCampaign?.id === item.id}
                onPress={() => selectCampaign(item)}
                styles={styles}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyTxt}>No messages sent yet.</Text>}
          />
        )}
      </View>
    </View>
  );

  const previewPanel = (
    <KeyboardAvoidingView
      style={styles.previewPanel}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!isWide ? (
        <TouchableOpacity style={styles.mobileBack} onPress={() => setShowMobileDetail(false)}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
          <Text style={styles.mobileBackTxt}>Back to list</Text>
        </TouchableOpacity>
      ) : null}

      {selectedCampaign ? (
        <ScrollView contentContainerStyle={styles.previewScroll}>
          <Text style={styles.previewHeading}>{selectedCampaign.title}</Text>
          <Text style={styles.previewMeta}>{selectedCampaign.audienceLabel}</Text>
          <Text style={styles.previewMeta}>
            {selectedCampaign.sentAt ? format(new Date(selectedCampaign.sentAt), 'dd MMM yyyy · h:mm a') : '—'}
          </Text>
          {selectedCampaign.message ? (
            <Text style={styles.previewMessage}>{selectedCampaign.message}</Text>
          ) : null}
          {selectedCampaign.imageUrl ? (
            <Image source={{ uri: selectedCampaign.imageUrl }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
          <View style={styles.statusRow}>
            <StatusPill icon="✓" label="Sent" active />
            <StatusPill icon="✓✓" label="Delivered" active={(selectedCampaign.pushSentCount || 0) > 0} />
            <StatusPill icon="👁" label={`Read ${selectedCampaign.readCount || 0}`} active={(selectedCampaign.readCount || 0) > 0} />
          </View>
          <Text style={styles.previewStats}>
            Recipients: {selectedCampaign.recipientCount} · Push: {selectedCampaign.pushSentCount}
          </Text>
        </ScrollView>
      ) : selectedStudent ? (
        <View style={styles.studentCard}>
          <View style={styles.studentCardTop}>
            {selectedStudent.photoUrl ? (
              <Image source={{ uri: selectedStudent.photoUrl }} style={styles.studentAvatar} />
            ) : (
              <View style={styles.studentAvatarFallback}>
                <Text style={styles.studentAvatarTxt}>{selectedStudent.name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{selectedStudent.name}</Text>
              <Text style={styles.studentSub}>@{selectedStudent.username}</Text>
              <Text style={styles.studentSub}>{selectedStudent.mobile}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isStudentMembershipActiveForAttendance(selectedStudent)
                    ? 'rgba(5,150,105,0.12)'
                    : 'rgba(220,38,38,0.12)',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: isStudentMembershipActiveForAttendance(selectedStudent) ? '#059669' : '#DC2626',
                }}
              >
                {isStudentMembershipActiveForAttendance(selectedStudent) ? 'Active' : 'Expired'}
              </Text>
            </View>
          </View>
          <Text style={styles.studentMeta}>Expiry: {membershipExpiryLabel(selectedStudent)}</Text>
          <Text style={styles.studentMeta}>Library: {libraryName}</Text>
        </View>
      ) : bulkMode === 'all' ? (
        <View style={styles.bulkInfo}>
          <Ionicons name="people" size={28} color={theme.colors.primary} />
          <Text style={styles.bulkInfoTitle}>Send to all students</Text>
          <Text style={styles.bulkInfoSub}>Your message will reach every student in {libraryName}.</Text>
        </View>
      ) : bulkMode === 'multiple' ? (
        <View style={styles.bulkInfo}>
          <Ionicons name="checkbox-outline" size={28} color={theme.colors.primary} />
          <Text style={styles.bulkInfoTitle}>{multiIds.length} students selected</Text>
          <Text style={styles.bulkInfoSub}>Select students from the left list, then compose below.</Text>
        </View>
      ) : (
        <View style={styles.bulkInfo}>
          <Ionicons name="chatbubbles-outline" size={28} color={theme.colors.mutedText} />
          <Text style={styles.bulkInfoTitle}>Select a student</Text>
          <Text style={styles.bulkInfoSub}>Choose from the list to view details and send a message.</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity key={a.id} style={styles.quickChip} onPress={() => applyQuickAction(a)}>
            <Text style={styles.quickEmoji}>{a.emoji}</Text>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {needsStudentSelection ? (
        <View style={[styles.selectionCard, !canPreviewOrSend && styles.selectionCardWarn]}>
          <View style={styles.selectionCardTop}>
            <Text style={styles.selectionCardTitle}>
              Selected Students: {selectedStudentCount}
            </Text>
            {countLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : canPreviewOrSend ? (
              <Text style={styles.selectionCardCount}>Recipients: {recipientCount}</Text>
            ) : null}
          </View>
          {!canPreviewOrSend ? (
            <Text style={styles.selectionCardHint}>⚠ Please select at least one student.</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.previewBtn, !canPreviewOrSend && styles.previewBtnDisabled]}
            onPress={() => void refreshRecipientCount()}
            disabled={!canPreviewOrSend || countLoading}
            activeOpacity={0.88}
          >
            <Ionicons name="people-outline" size={16} color={canPreviewOrSend ? theme.colors.primary : theme.colors.mutedText} />
            <Text style={[styles.previewBtnTxt, !canPreviewOrSend && styles.previewBtnTxtDisabled]}>
              Preview Recipients
            </Text>
          </TouchableOpacity>
        </View>
      ) : bulkMode === 'all' ? (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionCardTitle}>All Students</Text>
          <Text style={styles.selectionCardCount}>
            {countLoading ? 'Loading…' : `Recipients: ${recipientCount}`}
          </Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type your message…"
          placeholderTextColor={theme.colors.mutedText}
          value={message}
          onChangeText={setMessage}
          multiline
        />
        {imageUri ? (
          <View style={styles.attachPreview}>
            <Image source={{ uri: imageUri }} style={styles.attachImg} />
            <TouchableOpacity onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={24} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        ) : null}
        {showEmoji ? (
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setMessage((m) => m + e)}>
                <Text style={styles.emojiBtn}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {templates.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
            {templates.slice(0, 8).map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                style={styles.templateChip}
                onPress={() => setMessage(fillTemplateMessage(tpl.message))}
              >
                <Text style={styles.templateChipTxt} numberOfLines={1}>
                  {tpl.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.composerBar}>
          <TouchableOpacity style={styles.toolBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => Alert.alert('Coming soon', 'PDF attachments will be available in a future update.')}>
            <Ionicons name="document-outline" size={22} color={theme.colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowEmoji((v) => !v)}>
            <Ionicons name="happy-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (deliveryPhase === 'sending' || !canPreviewOrSend) && styles.sendBtnDisabled,
            ]}
            onPress={() => void handleSend()}
            disabled={deliveryPhase === 'sending' || !canPreviewOrSend}
          >
            {deliveryPhase === 'sending' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendBtnTxt}>
                  {deliveryPhase === 'sent' ? 'Sent ✓' : 'Send'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {deliveryPhase !== 'idle' ? (
          <Text style={styles.deliveryHint}>
            {deliveryPhase === 'sending' ? '🕒 Sending…' : '✓ Sent to students'}
          </Text>
        ) : null}
      </View>

      <View style={styles.futureBar}>
        <Text style={styles.futureTxt}>Premium (coming soon): WhatsApp · SMS · Voice · Scheduled sends</Text>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Communication Center</Text>
        <TouchableOpacity onPress={() => void refresh()} style={styles.headerBtn}>
          <Ionicons name="refresh" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Total Sent" value={stats?.totalSent ?? 0} styles={styles} />
        <StatCard label="Delivered" value={stats?.delivered ?? 0} styles={styles} accent={statAccents.delivered} />
        <StatCard label="Read" value={stats?.read ?? 0} styles={styles} accent={statAccents.read} />
        <StatCard label="Pending" value={stats?.pending ?? 0} styles={styles} accent={statAccents.pending} />
      </View>

      <View style={styles.split}>
        {showList ? listPanel : null}
        {showPreview ? previewPanel : null}
      </View>

      <MessageSendFeedbackModal
        feedback={sendFeedback}
        onClose={() => setSendFeedback(null)}
        onRetry={() => {
          setSendFeedback(null);
          void handleSend();
        }}
      />
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  accent,
  styles: s,
}: {
  label: string;
  value: number;
  accent?: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({ icon, label, active }: { icon: string; label: string; active: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: active ? 1 : 0.4 }}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.mutedText }}>{label}</Text>
    </View>
  );
}

function StudentListRow({
  student,
  selected,
  multi,
  checked,
  onPress,
  styles: s,
}: {
  student: User;
  selected: boolean;
  multi: boolean;
  checked: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const active = isStudentMembershipActiveForAttendance(student);
  return (
    <TouchableOpacity
      style={[s.listRow, selected && s.listRowSelected]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {multi ? (
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={20}
          color={checked ? theme.colors.primary : theme.colors.mutedText}
        />
      ) : null}
      {student.photoUrl ? (
        <Image source={{ uri: student.photoUrl }} style={s.listAvatar} />
      ) : (
        <View style={s.listAvatarFallback}>
          <Text style={s.listAvatarTxt}>{student.name.charAt(0)}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.listTitle} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={s.listSub} numberOfLines={1}>
          {student.mobile} · {active ? 'Active' : 'Expired'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
    </TouchableOpacity>
  );
}

function CampaignListRow({
  campaign,
  selected,
  onPress,
  styles: s,
}: {
  campaign: CommunicationCampaign;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const d = deliveryLabel(campaign);
  return (
    <TouchableOpacity
      style={[s.listRow, selected && s.listRowSelected]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={s.campaignIcon}>
        <Text style={{ fontSize: 18 }}>📢</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.listTitle} numberOfLines={1}>
          {campaign.title}
        </Text>
        <Text style={s.listSub} numberOfLines={1}>
          {campaign.audienceLabel} · {d.text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(mode: 'light' | 'dark', isWide: boolean) {
  const isDark = mode === 'dark';
  const panelBg = isDark ? '#0F172A' : '#F8FAFC';
  const listBg = theme.colors.surface;
  const border = theme.colors.border;
  const accent = '#25D366';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: theme.colors.text },
    statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
    statCard: {
      flex: 1,
      backgroundColor: listBg,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    statValue: { fontSize: 16, fontWeight: '900', color: theme.colors.text },
    statLabel: { fontSize: 9, fontWeight: '700', color: theme.colors.mutedText, marginTop: 2, textAlign: 'center' },
    split: { flex: 1, flexDirection: isWide ? 'row' : 'column' },
    listPanel: {
      flex: isWide ? 0.38 : 1,
      backgroundColor: panelBg,
      borderRightWidth: isWide ? 1 : 0,
      borderRightColor: border,
    },
    previewPanel: {
      flex: isWide ? 0.62 : 1,
      backgroundColor: theme.colors.background,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      margin: 12,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0 },
    tabRow: { flexDirection: 'row', marginHorizontal: 12, gap: 8, marginBottom: 8 },
    tabBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
    },
    tabBtnOn: { backgroundColor: isDark ? 'rgba(37,99,235,0.22)' : '#EFF6FF', borderColor: isDark ? '#60A5FA' : '#2563EB' },
    tabBtnTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.mutedText },
    tabBtnTxtOn: { color: isDark ? '#93C5FD' : '#2563EB' },
    filterScroll: { maxHeight: 40, marginBottom: 8, paddingHorizontal: 12 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      marginRight: 8,
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
    },
    filterChipOn: { backgroundColor: isDark ? 'rgba(5,150,105,0.22)' : '#ECFDF5', borderColor: isDark ? '#34D399' : accent },
    filterChipTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
    filterChipTxtOn: { color: isDark ? '#6EE7B7' : accent },
    bulkRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 8 },
    bulkBtn: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
    },
    bulkBtnOn: { borderColor: theme.colors.primary, backgroundColor: isDark ? 'rgba(13,148,136,0.2)' : '#F0FDFA' },
    bulkBtnTxt: { fontSize: 11, fontWeight: '800', color: theme.colors.mutedText },
    bulkBtnTxtOn: { color: isDark ? '#5EEAD4' : theme.colors.primary },
    listBody: { flex: 1, minHeight: 120 },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      backgroundColor: listBg,
    },
    listRowSelected: { backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF' },
    listAvatar: { width: 44, height: 44, borderRadius: 22 },
    listAvatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listAvatarTxt: { fontSize: 16, fontWeight: '900', color: theme.colors.primary },
    listTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
    listSub: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 2 },
    campaignIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTxt: { textAlign: 'center', color: theme.colors.mutedText, marginTop: 24, fontSize: 13 },
    mobileBack: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 12 },
    mobileBackTxt: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
    previewScroll: { padding: 16 },
    previewHeading: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
    previewMeta: { fontSize: 12, color: theme.colors.mutedText, marginTop: 4, fontWeight: '600' },
    previewMessage: { fontSize: 14, color: theme.colors.text, marginTop: 12, lineHeight: 21 },
    previewImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 12, backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
    statusRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
    previewStats: { marginTop: 12, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
    studentCard: {
      margin: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
    },
    studentCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    studentAvatar: { width: 52, height: 52, borderRadius: 26 },
    studentAvatarFallback: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    studentAvatarTxt: { fontSize: 20, fontWeight: '900', color: theme.colors.primary },
    studentName: { fontSize: 17, fontWeight: '900', color: theme.colors.text },
    studentSub: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 2 },
    studentMeta: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    bulkInfo: { alignItems: 'center', padding: 24, gap: 8 },
    bulkInfoTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    bulkInfoSub: { fontSize: 13, color: theme.colors.mutedText, textAlign: 'center', lineHeight: 19 },
    quickScroll: { maxHeight: 72, paddingHorizontal: 12, marginBottom: 4 },
    quickChip: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
      minWidth: 72,
    },
    quickEmoji: { fontSize: 18 },
    quickLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.mutedText, marginTop: 2 },
    selectionCard: {
      marginHorizontal: 12,
      marginBottom: 8,
      padding: 14,
      borderRadius: 14,
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
    },
    selectionCardWarn: {
      borderColor: isDark ? 'rgba(251,191,36,0.55)' : '#FCD34D',
      backgroundColor: isDark ? 'rgba(245,158,11,0.14)' : '#FFFBEB',
    },
    selectionCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    selectionCardTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
    selectionCardCount: { fontSize: 13, fontWeight: '700', color: isDark ? '#6EE7B7' : '#059669' },
    selectionCardHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: isDark ? '#FCD34D' : '#D97706' },
    previewBtn: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? 'rgba(13,148,136,0.18)' : '#F0FDFA',
    },
    previewBtnDisabled: {
      borderColor: border,
      backgroundColor: isDark ? '#162032' : '#F8FAFC',
      opacity: 0.85,
    },
    previewBtnTxt: { fontSize: 13, fontWeight: '800', color: isDark ? '#5EEAD4' : theme.colors.primary },
    previewBtnTxtDisabled: { color: theme.colors.mutedText },
    composer: {
      margin: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: listBg,
      borderWidth: 1,
      borderColor: border,
    },
    titleInput: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.text,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      paddingBottom: 8,
      marginBottom: 8,
    },
    messageInput: {
      minHeight: 80,
      fontSize: 14,
      color: theme.colors.text,
      textAlignVertical: 'top',
    },
    attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    attachImg: { width: 72, height: 72, borderRadius: 8 },
    emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    emojiBtn: { fontSize: 22 },
    templateScroll: { maxHeight: 36, marginTop: 8 },
    templateChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      marginRight: 8,
      maxWidth: 120,
    },
    templateChipTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
    composerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    toolBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    },
    sendBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: accent,
      borderRadius: 12,
      paddingVertical: 12,
    },
    sendBtnDisabled: { opacity: 0.7 },
    sendBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
    deliveryHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, textAlign: 'center' },
    futureBar: { paddingHorizontal: 16, paddingBottom: 12 },
    futureTxt: { fontSize: 10, fontWeight: '600', color: theme.colors.mutedText, textAlign: 'center' },
  });
}
