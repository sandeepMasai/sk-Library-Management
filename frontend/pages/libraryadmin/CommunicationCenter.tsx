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
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
import { ConfirmModal } from '../../components/ConfirmModal';
import { deriveCommunicationTitle } from '../../utils/communicationMessage';
import { replaceVariables } from '../../utils/templates';
import {
  type BulkMode,
  resolveMessageType,
  resolveSendAudience,
  canSendToAudience,
  audiencePreviewParams,
} from '../../utils/communicationSend';
import { shiftTypeLabel } from '../../utils/shiftUi';
import {
  resolveNotificationDocumentUrl,
  resolveNotificationDisplayMessage,
} from '../../utils/notificationDocument';
import { commColors, pct } from '../../components/communication/commTheme';
import {
  OverviewStatCard,
  RecentActivityRow,
  SwipeableSentRow,
  EmptySentState,
  SendSuccessView,
  ContactsBulkBar,
  RecipientChip,
  MessageAudiencePicker,
  SentTimeFilterBar,
  filterSentByTime,
} from '../../components/communication/CommunicationUIKit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type MainTab = 'inbox' | 'sent' | 'contacts';
type StudentFilter = 'all' | 'active' | 'expired';
type DeliveryPhase = 'idle' | 'sending' | 'sent';
type SentTimeFilter = 'all' | 'today' | 'week' | 'month';
type MobileView = 'tabs' | 'compose' | 'read' | 'success';

type TemplateRow = { id: string; name: string; message: string };

const QUICK_ACTIONS = [
  { id: 'fee', emoji: '📢', label: 'Fee Reminder', title: 'Fee Renewal Reminder', message: 'Dear student, please renew your library membership fee at the earliest to continue uninterrupted access.' },
  { id: 'expiry', emoji: '📅', label: 'Expiry Alert', title: 'Membership Expiry Alert', message: 'Your library membership is expiring soon. Please visit the library desk or renew through the app.' },
  { id: 'festival', emoji: '🎉', label: 'Festival', title: 'Festival Wishes', message: 'Warm wishes from your library family! Stay focused and keep learning.' },
  { id: 'exam', emoji: '📚', label: 'Exam Notice', title: 'Exam Preparation Notice', message: 'Best of luck for your upcoming exams. Library timings and rules are updated — please check notices.' },
  { id: 'closed', emoji: '🚫', label: 'Holiday', title: 'Library Closed', message: 'Please note: the library will remain closed on the mentioned date. Plan your study schedule accordingly.' },
  { id: 'general', emoji: '📋', label: 'General Notice', title: 'Library Notice', message: 'Please check the latest library notice and follow updated rules and timings.' },
] as const;

const EMOJIS = ['😊', '👍', '🙏', '📢', '✅', '❗', '📚', '🎉', '⏰', '💳'];

export default function CommunicationCenterScreen() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = useMemo(() => makeStyles(mode, isWide), [mode, isWide]);

  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);
  const fetchStudents = useAppStore((s) => s.fetchStudents);
  const fetchShifts = useAppStore((s) => s.fetchShifts);
  const shifts = useAppStore((s) => s.shifts);
  const sendCommunicationMessage = useAppStore((s) => s.sendCommunicationMessage);
  const fetchCommunicationHistory = useAppStore((s) => s.fetchCommunicationHistory);
  const fetchCommunicationStats = useAppStore((s) => s.fetchCommunicationStats);
  const updateCommunicationMessage = useAppStore((s) => s.updateCommunicationMessage);
  const deleteCommunicationMessage = useAppStore((s) => s.deleteCommunicationMessage);
  const previewCommunicationRecipientCount = useAppStore((s) => s.previewCommunicationRecipientCount);

  const [mainTab, setMainTab] = useState<MainTab>('inbox');
  const [sentTimeFilter, setSentTimeFilter] = useState<SentTimeFilter>('all');
  const [mobileView, setMobileView] = useState<MobileView>('tabs');
  const [lastSentCount, setLastSentCount] = useState(0);
  const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState<BulkMode>('one');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CommunicationCampaign | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [message, setMessage] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
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

  const [editingCampaign, setEditingCampaign] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunicationCampaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const selectedStudentCount =
    bulkMode === 'one' ? (selectedStudentId ? 1 : 0) : bulkMode === 'multiple' ? multiIds.length : 0;

  const needsStudentSelection = bulkMode === 'one' || bulkMode === 'multiple';
  const canPreviewOrSend = canSendToAudience(bulkMode, selectedStudentId, multiIds, selectedShiftId);

  const refreshRecipientCount = useCallback(async () => {
    if (bulkMode === 'one') {
      setRecipientCount(selectedStudentId ? 1 : 0);
      return;
    }
    if (bulkMode === 'multiple' && multiIds.length === 0) {
      setRecipientCount(0);
      return;
    }
    if (bulkMode === 'shift' && !selectedShiftId) {
      setRecipientCount(0);
      return;
    }
    setCountLoading(true);
    try {
      const count = await previewCommunicationRecipientCount(
        audiencePreviewParams(bulkMode, selectedStudentId, multiIds, selectedShiftId)
      );
      setRecipientCount(count);
    } finally {
      setCountLoading(false);
    }
  }, [bulkMode, selectedStudentId, multiIds, selectedShiftId, previewCommunicationRecipientCount]);

  useEffect(() => {
    if (needsStudentSelection && selectedStudentCount === 0) {
      setRecipientCount(0);
      setCountLoading(false);
      return;
    }
    if (bulkMode === 'shift' && !selectedShiftId) {
      setRecipientCount(0);
      return;
    }
    void refreshRecipientCount();
  }, [needsStudentSelection, selectedStudentCount, bulkMode, selectedShiftId, refreshRecipientCount]);

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
    void fetchShifts();
    void refresh();
    apiGet<{ ok: boolean; templates: TemplateRow[] }>(`/api/templates`)
      .then((r) => setTemplates(r.templates || []))
      .catch(() => setTemplates([]));
  }, [fetchStudents, fetchShifts, refresh]);

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
    let items = history;
    if (q) {
      items = items.filter(
        (h) => h.title.toLowerCase().includes(q) || h.message.toLowerCase().includes(q)
      );
    }
    return filterSentByTime(items, sentTimeFilter);
  }, [history, search, sentTimeFilter]);

  const recentActivity = useMemo(() => history.slice(0, 5), [history]);

  const deliveredPct = pct(stats?.delivered ?? 0, stats?.totalSent ?? 0);
  const readPct = pct(stats?.read ?? 0, stats?.totalSent ?? 0);
  const pendingPct = pct(stats?.pending ?? 0, stats?.totalSent ?? 0);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const toggleMulti = (id: string) => {
    setMultiIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setBulkMode('multiple');
  };

  const selectStudent = (id: string) => {
    if (mainTab === 'contacts') {
      toggleMulti(id);
      return;
    }
    setSelectedStudentId(id);
    setSelectedCampaign(null);
    setBulkMode('one');
    setMobileView('compose');
    if (!isWide) setShowMobileDetail(true);
  };

  const selectCampaign = (c: CommunicationCampaign) => {
    setEditingCampaign(false);
    setSelectedCampaign(c);
    setSelectedStudentId(null);
    setMainTab('sent');
    setMobileView('read');
    if (!isWide) setShowMobileDetail(true);
  };

  const startCompose = () => {
    setSelectedCampaign(null);
    setEditingCampaign(false);
    setBulkMode('multiple');
    setSelectedStudentId(null);
    setSelectedShiftId(null);
    setMultiIds([]);
    setPickerSearch('');
    setMobileView('compose');
    setShowRecipientPicker(true);
    if (!isWide) setShowMobileDetail(true);
  };

  const applyAudiencePick = (mode: BulkMode, shiftId?: string) => {
    setBulkMode(mode);
    setMultiIds([]);
    setSelectedStudentId(null);
    if (mode === 'shift' && shiftId) setSelectedShiftId(shiftId);
    else setSelectedShiftId(null);
    setShowRecipientPicker(false);
    setPickerSearch('');
  };

  const pickAudienceForCompose = (mode: BulkMode, shiftId?: string) => {
    applyAudiencePick(mode, shiftId);
    setMobileView('compose');
    if (!isWide) setShowMobileDetail(true);
  };

  const togglePickerStudent = (id: string) => {
    setBulkMode('multiple');
    setSelectedShiftId(null);
    setSelectedStudentId(null);
    setMultiIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const pickerStudents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.mobile.includes(q) ||
        s.username.toLowerCase().includes(q)
      );
    });
  }, [students, pickerSearch]);

  const closeReadView = () => {
    setShowMobileDetail(false);
    setEditingCampaign(false);
    setMobileView('tabs');
  };

  const forwardCampaign = (campaign: CommunicationCampaign) => {
    setComposeSubject(campaign.title);
    setMessage(campaign.message || '');
    setSelectedCampaign(null);
    setEditingCampaign(false);
    setBulkMode('one');
    setMobileView('compose');
    if (!isWide) setShowMobileDetail(true);
  };

  const openBulkCompose = () => {
    if (multiIds.length === 0) return;
    setBulkMode(multiIds.length === 1 ? 'one' : 'multiple');
    if (multiIds.length === 1) setSelectedStudentId(multiIds[0]);
    setSelectedCampaign(null);
    setMobileView('compose');
    setShowRecipientPicker(false);
    if (!isWide) setShowMobileDetail(true);
  };

  const isReadingMail = Boolean(selectedCampaign);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
      setDocumentUri(null);
      setDocumentName(null);
    }
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setDocumentUri(result.assets[0].uri);
      setDocumentName(result.assets[0].name || 'document.pdf');
      setImageUri(null);
    }
  };

  const openDocumentUrl = async (url: string) => {
    const cleaned = url.trim();
    if (!cleaned) return;
    try {
      const ok = await Linking.canOpenURL(cleaned);
      if (!ok) {
        Alert.alert('Cannot open PDF', 'No app available to open this document.');
        return;
      }
      await Linking.openURL(cleaned);
    } catch {
      Alert.alert('Cannot open PDF', 'Try again or check your connection.');
    }
  };

  const applyQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    setComposeSubject(action.title);
    setMessage(action.message);
    setSelectedCampaign(null);
    setMobileView('compose');
    if (!isWide) setShowMobileDetail(true);
  };

  const startEditCampaign = () => {
    if (!selectedCampaign) return;
    setEditTitle(selectedCampaign.title);
    setEditMessage(selectedCampaign.message || '');
    setEditingCampaign(true);
  };

  const cancelEditCampaign = () => {
    setEditingCampaign(false);
    setEditTitle('');
    setEditMessage('');
  };

  const handleSaveEditCampaign = async () => {
    if (!selectedCampaign) return;
    const title = editTitle.trim();
    const body = editMessage.trim();
    if (!title) {
      Alert.alert('Title required', 'Please enter a message title.');
      return;
    }
    if (!body && !selectedCampaign.imageUrl && !selectedCampaign.documentUrl) {
      Alert.alert('Message required', 'Please enter message text.');
      return;
    }
    setSavingEdit(true);
    try {
      const result = await updateCommunicationMessage(selectedCampaign.id, { title, message: body });
      if (!result.ok) {
        Alert.alert('Could not save', result.message || 'Try again.');
        return;
      }
      setEditingCampaign(false);
      await refresh();
      if (result.campaign) {
        setSelectedCampaign(result.campaign);
      } else {
        setSelectedCampaign((prev) => (prev ? { ...prev, title, message: body } : prev));
      }
      showFeedback({ variant: 'success', title: 'Message updated' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeleteCampaign = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteCommunicationMessage(deleteTarget.id);
      if (!result.ok) {
        Alert.alert('Could not delete', result.message || 'Try again.');
        return;
      }
      if (selectedCampaign?.id === deleteTarget.id) {
        setSelectedCampaign(null);
        setEditingCampaign(false);
        setMobileView('tabs');
        setShowMobileDetail(false);
      }
      setDeleteTarget(null);
      await refresh();
      showFeedback({ variant: 'success', title: 'Message deleted' });
    } finally {
      setDeleting(false);
    }
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
    const hasImage = Boolean(imageUri);
    const hasPdf = Boolean(documentUri);
    if (!m && !hasImage && !hasPdf) {
      showFeedback({
        variant: 'warning',
        title: 'Message required',
        subtitle: 'Add message text or attach an image/PDF.',
      });
      return;
    }
    const t = composeSubject.trim() || deriveCommunicationTitle(m, hasImage || hasPdf);

    if (!canSendToAudience(bulkMode, selectedStudentId, multiIds, selectedShiftId)) {
      setShowRecipientPicker(true);
      if (bulkMode === 'shift') {
        showFeedback({ variant: 'warning', title: 'Select a shift', subtitle: 'Choose a shift to message its students.' });
      } else if (bulkMode === 'multiple') {
        showFeedback({ variant: 'warning', title: 'Select students', subtitle: 'Pick at least one student from Contacts.' });
      } else {
        showFeedback({ variant: 'warning', title: 'Select a student', subtitle: 'Choose a recipient before sending.' });
      }
      return;
    }

    const { audience, studentIds, shiftId } = resolveSendAudience(
      bulkMode,
      selectedStudentId,
      multiIds,
      selectedShiftId
    );

    setDeliveryPhase('sending');
    const sentImageUri = imageUri;
    const sentDocumentUri = documentUri;
    try {
      const messageType = resolveMessageType(m, hasImage, hasPdf);
      const result = await sendCommunicationMessage({
        title: t,
        message: m,
        messageType,
        audience,
        studentIds: audience === 'selected' ? studentIds : [],
        shiftId,
        imageUri: hasImage ? imageUri : null,
        documentUri: hasPdf ? documentUri : null,
        documentName: hasPdf ? documentName : null,
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
      setDocumentUri(null);
      setDocumentName(null);
      setComposeSubject('');
      setMultiIds([]);
      setLastSentCount(count);
      const [hist, st] = await Promise.all([fetchCommunicationHistory(), fetchCommunicationStats()]);
      setHistory(hist);
      setStats(st);
      if (hist.length > 0) {
        setSelectedCampaign(hist[0]);
        setMainTab('sent');
        setSelectedStudentId(null);
      }
      setMobileView('success');
      if (!isWide) setShowMobileDetail(true);
      setTimeout(() => setDeliveryPhase('idle'), 2000);
      showFeedback({
        variant: 'success',
        title: 'Message sent!',
        subtitle: `Delivered to ${count} student${count === 1 ? '' : 's'} successfully.`,
        recipientCount: count,
        messageBody: m || (sentImageUri ? 'Photo sent' : sentDocumentUri ? 'PDF sent' : undefined),
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

  const showList = isWide || mobileView === 'tabs';
  const showPreview = isWide ? true : mobileView !== 'tabs';

  const recipientChips = useMemo(() => {
    if (bulkMode === 'all') return [{ id: 'all', label: 'All students' }];
    if (bulkMode === 'active') return [{ id: 'active', label: 'Active students' }];
    if (bulkMode === 'expired') return [{ id: 'expired', label: 'Expired students' }];
    if (bulkMode === 'shift') {
      const shift = shifts.find((s) => s.id === selectedShiftId);
      return [{ id: 'shift', label: shift ? shiftTypeLabel(shift.type) : 'Select shift' }];
    }
    if (bulkMode === 'multiple' && multiIds.length > 0) {
      return multiIds
        .slice(0, 4)
        .map((id) => {
          const s = students.find((x) => x.id === id);
          return { id, label: s?.name || 'Student' };
        })
        .concat(multiIds.length > 4 ? [{ id: 'more', label: `+${multiIds.length - 4}` }] : []);
    }
    if (bulkMode === 'one' && selectedStudent) return [{ id: selectedStudent.id, label: selectedStudent.name }];
    return [];
  }, [bulkMode, multiIds, selectedStudent, students, shifts, selectedShiftId]);

  const recipientSummary =
    bulkMode === 'all'
      ? 'All students'
      : bulkMode === 'active'
        ? 'Active students'
        : bulkMode === 'expired'
          ? 'Expired students'
          : bulkMode === 'shift'
            ? (() => {
                const shift = shifts.find((s) => s.id === selectedShiftId);
                return shift ? shiftTypeLabel(shift.type) : 'Select shift';
              })()
            : multiIds.length > 0
              ? `${multiIds.length} selected`
              : selectedStudent
                ? selectedStudent.name
                : '';

  const mainTabsBar = (
    <View style={styles.mainTabBar}>
      {(['inbox', 'sent', 'contacts'] as const).map((tab) => {
        const active = mainTab === tab;
        const labels = { inbox: 'Inbox', sent: 'Sent', contacts: 'Contacts' };
        const icons: Record<MainTab, keyof typeof Ionicons.glyphMap> = {
          inbox: 'mail-unread-outline',
          sent: 'send-outline',
          contacts: 'people-outline',
        };
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.mainTab, active && styles.mainTabActive]}
            onPress={() => setMainTab(tab)}
          >
            <Ionicons name={icons[tab]} size={16} color={active ? commColors.purple : theme.colors.mutedText} />
            <Text style={[styles.mainTabTxt, active && styles.mainTabTxtActive]}>{labels[tab]}</Text>
            {tab === 'sent' && history.length > 0 ? (
              <View style={styles.mainTabBadge}>
                <Text style={styles.mainTabBadgeTxt}>{history.length > 99 ? '99+' : history.length}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const listPanel = (
    <View style={styles.listPanel}>
      {mainTabsBar}

      {mainTab !== 'inbox' ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.mutedText} />
          <TextInput
            style={styles.searchInput}
            placeholder={mainTab === 'contacts' ? 'Search students…' : 'Search sent messages…'}
            placeholderTextColor={theme.colors.mutedText}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.mutedText} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {mainTab === 'inbox' ? (
        <ScrollView style={styles.listBody} contentContainerStyle={styles.inboxScroll}>
          <View style={styles.syncRow}>
            <View style={styles.syncDot} />
            <Text style={styles.syncTxt}>Last synced just now</Text>
            {stats && (stats.pending ?? 0) > 0 ? (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillTxt}>{stats.pending} pending</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sectionTitle}>Overview · This Month</Text>
          <View style={styles.overviewGrid}>
            <OverviewStatCard
              label="Sent"
              value={stats?.totalSent ?? 0}
              subLabel="Total messages"
              icon="send-outline"
              tint={commColors.purple}
              isDark={isDark}
            />
            <OverviewStatCard
              label="Delivered"
              value={stats?.delivered ?? 0}
              subLabel={`${deliveredPct}%`}
              icon="checkmark-done-outline"
              tint={commColors.info}
              isDark={isDark}
            />
            <OverviewStatCard
              label="Read"
              value={stats?.read ?? 0}
              subLabel={`${readPct}%`}
              icon="eye-outline"
              tint={commColors.success}
              isDark={isDark}
            />
            <OverviewStatCard
              label="Pending"
              value={stats?.pending ?? 0}
              subLabel={`${pendingPct}%`}
              icon="time-outline"
              tint={commColors.warning}
              isDark={isDark}
            />
          </View>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={commColors.purple} />
          ) : recentActivity.length === 0 ? (
            <EmptySentState onCompose={startCompose} isDark={isDark} />
          ) : (
            recentActivity.map((item) => (
              <RecentActivityRow
                key={item.id}
                campaign={item}
                onPress={() => selectCampaign(item)}
                isDark={isDark}
              />
            ))
          )}
        </ScrollView>
      ) : mainTab === 'sent' ? (
        <>
          <SentTimeFilterBar value={sentTimeFilter} onChange={setSentTimeFilter} isDark={isDark} />
          <View style={styles.listBody}>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={commColors.purple} />
            ) : (
              <FlashList
                data={filteredHistory}
                estimatedItemSize={110}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <SwipeableSentRow
                    campaign={item}
                    selected={selectedCampaign?.id === item.id}
                    onPress={() => selectCampaign(item)}
                    onDelete={() => setDeleteTarget(item)}
                    isDark={isDark}
                  />
                )}
                ListEmptyComponent={<EmptySentState onCompose={startCompose} isDark={isDark} />}
              />
            )}
          </View>
        </>
      ) : (
        <>
          <View style={styles.contactsAudienceWrap}>
            <Text style={styles.listHint}>Filter students</Text>
            <View style={styles.studentFilterRow}>
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
            </View>
            <MessageAudiencePicker
              bulkMode={bulkMode}
              selectedShiftId={selectedShiftId}
              shifts={shifts}
              isDark={isDark}
              onPickAll={() => pickAudienceForCompose('all')}
              onPickActive={() => pickAudienceForCompose('active')}
              onPickExpired={() => pickAudienceForCompose('expired')}
              onPickShift={(shiftId) => pickAudienceForCompose('shift', shiftId)}
            />
          </View>
          <View style={styles.listBody}>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={commColors.purple} />
            ) : (
              <FlashList
                data={filteredStudents}
                estimatedItemSize={76}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <StudentListRow
                    student={item}
                    selected={selectedStudentId === item.id}
                    multi
                    checked={multiIds.includes(item.id)}
                    onPress={() => selectStudent(item.id)}
                    styles={styles}
                  />
                )}
                ListEmptyComponent={<Text style={styles.emptyTxt}>No students match your search.</Text>}
              />
            )}
          </View>
          {multiIds.length > 0 ? (
            <ContactsBulkBar
              count={multiIds.length}
              onMessage={openBulkCompose}
              onClear={() => setMultiIds([])}
            />
          ) : null}
        </>
      )}

      {mainTab !== 'contacts' || multiIds.length === 0 ? (
        <TouchableOpacity style={styles.composeFab} onPress={startCompose} activeOpacity={0.9}>
          <Ionicons name="create" size={26} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const libraryInitial = libraryName.charAt(0).toUpperCase();

  const readMessagePanel = selectedCampaign ? (
    <KeyboardAvoidingView
      style={[styles.previewPanel, styles.readPanel]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.readToolbar}>
        {!isWide ? (
          <TouchableOpacity style={styles.readToolbarBtn} onPress={closeReadView}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.readToolbarBtn} />
        )}
        <Text style={styles.readToolbarSubject} numberOfLines={1}>
          {editingCampaign ? 'Edit message' : selectedCampaign.title}
        </Text>
        {editingCampaign ? (
          <TouchableOpacity style={styles.readToolbarBtn} onPress={cancelEditCampaign} disabled={savingEdit}>
            <Ionicons name="close" size={22} color={theme.colors.mutedText} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.readToolbarBtn} onPress={startEditCampaign}>
              <Ionicons name="create-outline" size={21} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.readToolbarBtn} onPress={() => setDeleteTarget(selectedCampaign)}>
              <Ionicons name="trash-outline" size={21} color={theme.colors.danger} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        style={styles.previewScrollWrap}
        contentContainerStyle={styles.readScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {editingCampaign ? (
          <View style={styles.mailReadBody}>
            <View style={styles.composeFieldRow}>
              <Text style={styles.composeFieldLabel}>Subject</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Subject"
                placeholderTextColor={theme.colors.mutedText}
                style={styles.composeFieldInput}
              />
            </View>
            <View style={[styles.composeFieldRow, styles.composeFieldRowLast]}>
              <Text style={styles.composeFieldLabel}>Message</Text>
              <TextInput
                value={editMessage}
                onChangeText={setEditMessage}
                placeholder="Message text"
                placeholderTextColor={theme.colors.mutedText}
                style={[styles.composeFieldInput, styles.composeBodyInput]}
                multiline
              />
            </View>
            {selectedCampaign.imageUrl ? (
              <Image source={{ uri: selectedCampaign.imageUrl }} style={styles.previewImage} resizeMode="contain" />
            ) : null}
            {selectedCampaign.documentUrl ? (
              <View style={styles.attachmentChip}>
                <Ionicons name="document-attach-outline" size={16} color="#1A73E8" />
                <Text style={styles.attachmentChipTxt}>PDF attached (text only can be edited)</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.mailSenderRow}>
              <View style={styles.mailSenderAvatar}>
                <Text style={styles.mailSenderAvatarTxt}>{libraryInitial}</Text>
              </View>
              <View style={styles.mailSenderInfo}>
                <View style={styles.mailSenderTop}>
                  <Text style={styles.mailSenderName}>{libraryName}</Text>
                  <Text style={styles.mailSenderTime}>
                    {selectedCampaign.sentAt
                      ? format(new Date(selectedCampaign.sentAt), 'h:mm a')
                      : ''}
                  </Text>
                </View>
                <Text style={styles.mailSenderTo} numberOfLines={2}>
                  to {selectedCampaign.audienceLabel}
                </Text>
                <Text style={styles.mailSenderDate}>
                  {selectedCampaign.sentAt
                    ? format(new Date(selectedCampaign.sentAt), 'EEE, d MMM yyyy')
                    : '—'}
                </Text>
              </View>
            </View>

            <Text style={styles.mailReadSubject}>{selectedCampaign.title}</Text>

            <View style={styles.mailReadBody}>
              <Text style={styles.previewMessage}>
                {resolveNotificationDisplayMessage({
                  message: selectedCampaign.message,
                  documentUrl: selectedCampaign.documentUrl,
                  title: selectedCampaign.title,
                }) || 'No message text'}
              </Text>
              {selectedCampaign.imageUrl ? (
                <Image source={{ uri: selectedCampaign.imageUrl }} style={styles.previewImage} resizeMode="contain" />
              ) : null}
              {resolveNotificationDocumentUrl({
                documentUrl: selectedCampaign.documentUrl,
                message: selectedCampaign.message,
                title: selectedCampaign.title,
                messageType: selectedCampaign.messageType,
              }) ? (
                <TouchableOpacity
                  style={styles.attachmentCard}
                  onPress={() =>
                    void openDocumentUrl(
                      resolveNotificationDocumentUrl({
                        documentUrl: selectedCampaign.documentUrl,
                        message: selectedCampaign.message,
                        title: selectedCampaign.title,
                        messageType: selectedCampaign.messageType,
                      }) || ''
                    )
                  }
                  activeOpacity={0.88}
                >
                  <View style={styles.attachmentCardIcon}>
                    <Ionicons name="document-text-outline" size={22} color={commColors.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachmentCardTitle}>PDF attachment</Text>
                    <Text style={styles.attachmentCardSub}>Tap to open</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={commColors.purple} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.deliveryCard}>
              <Text style={styles.deliveryCardTitle}>Delivery status</Text>
              <View style={styles.deliveryStatsRow}>
                <DeliveryStat label="Recipients" value={selectedCampaign.recipientCount} />
                <DeliveryStat label="Delivered" value={selectedCampaign.pushSentCount || 0} accent="#1A73E8" />
                <DeliveryStat label="Read" value={selectedCampaign.readCount || 0} accent="#059669" />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {editingCampaign ? (
        <View style={styles.readBottomBar}>
          <TouchableOpacity
            style={[styles.readBottomBtn, styles.readBottomBtnPrimary]}
            onPress={() => void handleSaveEditCampaign()}
            disabled={savingEdit}
          >
            {savingEdit ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.readBottomBtnPrimaryTxt}>Save changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readBottomBar}>
          <TouchableOpacity style={styles.readBottomBtn} onPress={startCompose}>
            <Ionicons name="create-outline" size={20} color={commColors.purple} />
            <Text style={styles.readBottomBtnTxt}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.readBottomBtn} onPress={startEditCampaign}>
            <Ionicons name="pencil" size={18} color={theme.colors.text} />
            <Text style={styles.readBottomBtnTxt}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.readBottomBtn} onPress={() => forwardCampaign(selectedCampaign)}>
            <Ionicons name="arrow-redo-outline" size={18} color={theme.colors.text} />
            <Text style={styles.readBottomBtnTxt}>Forward</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.readBottomBtn, styles.readBottomBtnDanger]}
            onPress={() => setDeleteTarget(selectedCampaign)}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            <Text style={[styles.readBottomBtnTxt, { color: theme.colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  ) : null;

  const composePanel = (
    <KeyboardAvoidingView
      style={styles.previewPanel}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!isWide ? (
        <TouchableOpacity style={styles.mobileBack} onPress={() => { setShowMobileDetail(false); setMobileView('tabs'); }}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          <Text style={styles.mobileBackTxt}>Back</Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        style={styles.previewScrollWrap}
        contentContainerStyle={styles.previewScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.id} style={styles.quickChip} onPress={() => applyQuickAction(a)}>
              <Text style={styles.quickEmoji}>{a.emoji}</Text>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.composeCard}>
          <View style={styles.composeCardHeader}>
            <Ionicons name="mail-outline" size={18} color={commColors.purple} />
            <Text style={styles.composeCardTitle}>Compose message</Text>
          </View>

          <TouchableOpacity
            style={styles.recipientPickerRow}
            onPress={() => setShowRecipientPicker(true)}
            activeOpacity={0.88}
          >
            <Text style={styles.recipientPickerLabel}>To</Text>
            <View style={styles.recipientPickerBody}>
              {recipientChips.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.recipientChipRow}>
                    {recipientChips.map((c) => (
                      <RecipientChip
                        key={c.id}
                        label={c.label}
                        onRemove={
                          c.id !== 'all' &&
                          c.id !== 'more' &&
                          c.id !== 'active' &&
                          c.id !== 'expired' &&
                          c.id !== 'shift'
                            ? () => togglePickerStudent(c.id)
                            : undefined
                        }
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.recipientPlaceholder}>Select students</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color={commColors.purple} />
          </TouchableOpacity>

          {recipientSummary && canPreviewOrSend ? (
            <Text style={styles.recipientReadyHint}>Ready to send to {recipientSummary}</Text>
          ) : null}

          <View style={styles.composeFieldRow}>
            <Text style={styles.composeFieldLabel}>Subject</Text>
            <TextInput
              style={styles.composeFieldInput}
              placeholder="Subject (optional)"
              placeholderTextColor={theme.colors.mutedText}
              value={composeSubject}
              onChangeText={setComposeSubject}
            />
          </View>
          <View style={[styles.composeFieldRow, styles.composeFieldRowLast]}>
            <Text style={styles.composeFieldLabel}>Message</Text>
            <TextInput
              style={[styles.composeFieldInput, styles.composeBodyInput]}
              placeholder="Write your message…"
              placeholderTextColor={theme.colors.mutedText}
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          {documentUri ? (
            <View style={styles.attachPreview}>
              <View style={styles.pdfAttachChip}>
                <Ionicons name="document-text-outline" size={20} color={commColors.purple} />
                <Text style={styles.pdfAttachTxt} numberOfLines={1}>
                  {documentName || 'document.pdf'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDocumentUri(null);
                  setDocumentName(null);
                }}
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          ) : null}
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
                  onPress={() => {
                    setComposeSubject(tpl.name);
                    setMessage(fillTemplateMessage(tpl.message));
                  }}
                >
                  <Text style={styles.templateChipTxt} numberOfLines={1}>
                    {tpl.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.composeBottomBar}>
        <TouchableOpacity style={styles.composeToolBtn} onPress={pickImage}>
          <Ionicons name="image-outline" size={22} color={commColors.purple} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.composeToolBtn} onPress={() => void pickPdf()}>
          <Ionicons name="document-outline" size={22} color={commColors.purple} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.composeToolBtn} onPress={() => setShowEmoji((v) => !v)}>
          <Ionicons name="happy-outline" size={22} color={commColors.purple} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtnFull, (deliveryPhase === 'sending' || !canPreviewOrSend) && styles.sendBtnDisabled]}
          onPress={() => void handleSend()}
          disabled={deliveryPhase === 'sending' || !canPreviewOrSend}
        >
          {deliveryPhase === 'sending' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnFullTxt}>Send Message</Text>
          )}
        </TouchableOpacity>
      </View>
      {deliveryPhase !== 'idle' ? (
        <Text style={styles.deliveryHint}>
          {deliveryPhase === 'sending' ? 'Sending…' : 'Delivered to students'}
        </Text>
      ) : null}
    </KeyboardAvoidingView>
  );

  const successPanel = (
    <SendSuccessView
      count={lastSentCount}
      isDark={isDark}
      onViewMessage={() => {
        setMobileView('read');
        if (!isWide) setShowMobileDetail(true);
      }}
      onSendAnother={() => {
        setSelectedCampaign(null);
        setMessage('');
        setComposeSubject('');
        setBulkMode('multiple');
        setMultiIds([]);
        setSelectedStudentId(null);
        setSelectedShiftId(null);
        setMobileView('compose');
        setShowRecipientPicker(true);
      }}
    />
  );

  const previewPanel =
    mobileView === 'success' ? successPanel : isReadingMail ? readMessagePanel : composePanel;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {mobileView === 'tabs' || isWide ? (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Communication Center</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {libraryName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={startCompose}>
            <Ionicons name="create-outline" size={22} color={commColors.purple} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void refresh()} style={styles.headerBtn}>
            <Ionicons name="refresh" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      ) : null}

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

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        tone="danger"
        label="DELETE"
        title="Delete message?"
        description={
          deleteTarget
            ? `Remove "${deleteTarget.title}" from history? Student notifications linked to this message will also be removed.`
            : undefined
        }
        loading={deleting}
        confirmText="Delete"
        confirmIcon="trash-outline"
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleConfirmDeleteCampaign()}
      />

      <Modal
        visible={showRecipientPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecipientPicker(false)}
      >
        <SafeAreaView style={styles.pickerRoot} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select recipients</Text>
            <TouchableOpacity onPress={() => setShowRecipientPicker(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={theme.colors.mutedText} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students…"
              placeholderTextColor={theme.colors.mutedText}
              value={pickerSearch}
              onChangeText={setPickerSearch}
            />
          </View>

          <MessageAudiencePicker
            bulkMode={bulkMode}
            selectedShiftId={selectedShiftId}
            shifts={shifts}
            isDark={isDark}
            onPickAll={() => applyAudiencePick('all')}
            onPickActive={() => applyAudiencePick('active')}
            onPickExpired={() => applyAudiencePick('expired')}
            onPickShift={(shiftId) => applyAudiencePick('shift', shiftId)}
          />

          <View style={styles.pickerListWrap}>
            <FlashList
              data={pickerStudents}
              estimatedItemSize={64}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
              const checked = multiIds.includes(item.id);
              const active = isStudentMembershipActiveForAttendance(item);
              return (
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => togglePickerStudent(item.id)}
                  activeOpacity={0.88}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={checked ? commColors.purple : theme.colors.mutedText}
                  />
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.listAvatar} />
                  ) : (
                    <View style={styles.listAvatarFallback}>
                      <Text style={styles.listAvatarTxt}>{item.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.pickerRowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.pickerRowSub} numberOfLines={1}>
                      {item.mobile || item.username} · {active ? 'Active' : 'Expired'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyTxt}>No students found.</Text>}
            />
          </View>

          <View style={styles.pickerFooter}>
            <Text style={styles.pickerFooterCount}>
              {bulkMode === 'multiple'
                ? `${multiIds.length} student${multiIds.length === 1 ? '' : 's'} selected`
                : bulkMode === 'all'
                  ? 'All students'
                  : bulkMode === 'active'
                    ? 'Active students'
                    : bulkMode === 'expired'
                      ? 'Expired students'
                      : bulkMode === 'shift'
                        ? (() => {
                            const shift = shifts.find((s) => s.id === selectedShiftId);
                            return shift ? shiftTypeLabel(shift.type) : 'Select shift';
                          })()
                        : 'Select recipients'}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerDoneBtn,
                !canPreviewOrSend && bulkMode === 'multiple' && multiIds.length === 0 && styles.pickerDoneBtnDisabled,
              ]}
              onPress={() => setShowRecipientPicker(false)}
            >
              <Text style={styles.pickerDoneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function DeliveryStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: accent || theme.colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.mutedText, marginTop: 2 }}>{label}</Text>
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
      style={[s.mailRow, selected && s.mailRowSelected]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {multi ? (
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={20}
          color={checked ? commColors.purple : theme.colors.mutedText}
          style={s.mailRowCheck}
        />
      ) : null}
      {student.photoUrl ? (
        <Image source={{ uri: student.photoUrl }} style={s.listAvatar} />
      ) : (
        <View style={s.listAvatarFallback}>
          <Text style={s.listAvatarTxt}>{student.name.charAt(0)}</Text>
        </View>
      )}
      <View style={s.mailRowContent}>
        <View style={s.mailRowTop}>
          <Text style={[s.mailRowFrom, selected && s.mailRowFromSelected]} numberOfLines={1}>
            {student.name}
          </Text>
          <View style={[s.contactStatusBadge, active ? s.contactActive : s.contactExpired]}>
            <Text style={[s.contactStatusTxt, active ? s.contactActiveTxt : s.contactExpiredTxt]}>
              {active ? 'Active' : 'Expired'}
            </Text>
          </View>
        </View>
        <Text style={s.mailRowPreview} numberOfLines={1}>
          {student.mobile || `@${student.username}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(mode: 'light' | 'dark', isWide: boolean) {
  const isDark = mode === 'dark';
  const panelBg = isDark ? '#0B1220' : '#F6F8FC';
  const listBg = isDark ? '#111827' : '#FFFFFF';
  const border = isDark ? '#1F2937' : '#E8EAED';
  const mailBlue = commColors.purple;
  const purpleSoft = isDark ? 'rgba(91,43,140,0.22)' : commColors.purpleSoft;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#0B1220' : '#FFFFFF' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      backgroundColor: listBg,
    },
    headerBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
    headerTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text, letterSpacing: 0.1 },
    headerSubtitle: { fontSize: 11, fontWeight: '600', color: theme.colors.mutedText, marginTop: 1 },
    statsRow: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: panelBg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
    },
    statCard: {
      flex: 1,
      backgroundColor: listBg,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    statValue: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    statLabel: { fontSize: 9, fontWeight: '600', color: theme.colors.mutedText, marginTop: 2, textAlign: 'center' },
    split: { flex: 1, flexDirection: isWide ? 'row' : 'column' },
    listPanel: {
      flex: isWide ? 0.4 : 1,
      backgroundColor: panelBg,
      borderRightWidth: isWide ? StyleSheet.hairlineWidth : 0,
      borderRightColor: border,
      position: 'relative',
    },
    previewPanel: {
      flex: isWide ? 0.6 : 1,
      backgroundColor: isDark ? '#0B1220' : '#FFFFFF',
    },
    readPanel: { backgroundColor: isDark ? '#0B1220' : '#FFFFFF' },
    readToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      backgroundColor: listBg,
    },
    readToolbarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    readToolbarSubject: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      paddingHorizontal: 4,
    },
    readScrollContent: { paddingBottom: 16 },
    mailSenderRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    mailSenderAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(26,115,232,0.2)' : '#E8F0FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mailSenderAvatarTxt: { fontSize: 18, fontWeight: '800', color: mailBlue },
    mailSenderInfo: { flex: 1, minWidth: 0 },
    mailSenderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    mailSenderName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
    mailSenderTime: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText },
    mailSenderTo: { fontSize: 13, fontWeight: '500', color: theme.colors.mutedText, marginTop: 2 },
    mailSenderDate: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 4 },
    mailReadSubject: {
      fontSize: 22,
      fontWeight: '500',
      color: theme.colors.text,
      lineHeight: 28,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    mailReadBody: {
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: isDark ? '#111827' : '#F8F9FA',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    previewMessageEmpty: { fontSize: 14, color: theme.colors.mutedText, fontStyle: 'italic' },
    attachmentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 14,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    attachmentCardIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#E8F0FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachmentCardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    attachmentCardSub: { fontSize: 12, fontWeight: '500', color: theme.colors.mutedText, marginTop: 2 },
    deliveryCard: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    deliveryCardTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.mutedText, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    deliveryStatsRow: { flexDirection: 'row', gap: 8 },
    readBottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: border,
      backgroundColor: listBg,
    },
    readBottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
    },
    readBottomBtnDanger: {},
    readBottomBtnTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
    readBottomBtnPrimary: {
      flex: 1,
      backgroundColor: mailBlue,
      borderRadius: 24,
      paddingVertical: 12,
      marginHorizontal: 8,
    },
    readBottomBtnPrimaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    composeBottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: border,
      backgroundColor: listBg,
    },
    composeToolBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1F2937' : '#F1F3F4',
    },
    composeFab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: mailBlue,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    folderBar: {
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 6,
    },
    folderItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    folderItemActive: {
      backgroundColor: isDark ? 'rgba(26,115,232,0.18)' : '#E8F0FE',
      borderColor: isDark ? '#4285F4' : '#D2E3FC',
    },
    folderLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.mutedText },
    folderLabelActive: { color: mailBlue, fontWeight: '700' },
    folderBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: mailBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
    mainTabBar: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 6,
      gap: 6,
    },
    mainTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      borderRadius: 14,
    },
    mainTabActive: { backgroundColor: purpleSoft },
    mainTabTxt: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText },
    mainTabTxtActive: { color: mailBlue, fontWeight: '800' },
    mainTabBadge: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      backgroundColor: mailBlue,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 2,
    },
    mainTabBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
    inboxScroll: { paddingHorizontal: 16, paddingBottom: 88 },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: 12,
      marginTop: 10,
    },
    overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingTop: 4 },
    syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: commColors.success },
    syncTxt: { fontSize: 12, fontWeight: '500', color: theme.colors.mutedText, flex: 1 },
    unreadPill: {
      backgroundColor: purpleSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    unreadPillTxt: { fontSize: 11, fontWeight: '700', color: mailBlue },
    recipientChipScroll: { marginBottom: 10, maxHeight: 44 },
    recipientPickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      marginBottom: 4,
    },
    recipientPickerLabel: {
      width: 56,
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.mutedText,
    },
    recipientPickerBody: { flex: 1, minHeight: 32, justifyContent: 'center' },
    recipientChipRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    recipientPlaceholder: { fontSize: 14, fontWeight: '600', color: commColors.purple },
    recipientReadyHint: {
      fontSize: 12,
      fontWeight: '600',
      color: commColors.success,
      marginBottom: 8,
      marginTop: -4,
    },
    pickerRoot: { flex: 1, backgroundColor: isDark ? commColors.purpleDarkBg : '#FFFFFF' },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
    },
    pickerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
    pickerListWrap: { flex: 1 },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
    },
    pickerRowName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    pickerRowSub: { fontSize: 12, fontWeight: '500', color: theme.colors.mutedText, marginTop: 2 },
    pickerFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: border,
      backgroundColor: listBg,
    },
    pickerFooterCount: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
    pickerDoneBtn: {
      backgroundColor: mailBlue,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    pickerDoneBtnDisabled: { opacity: 0.5 },
    pickerDoneTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
    sendBtnFull: {
      flex: 1,
      backgroundColor: mailBlue,
      paddingVertical: 14,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnFullTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 10,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 24,
      backgroundColor: isDark ? '#1F2937' : '#EAF1FB',
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0 },
    listHint: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.mutedText,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 6,
    },
    contactsAudienceWrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      paddingBottom: 4,
    },
    studentFilterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    filterChipOn: { backgroundColor: purpleSoft, borderColor: mailBlue },
    filterChipTxt: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText },
    filterChipTxtOn: { color: mailBlue, fontWeight: '700' },
    bulkRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, marginBottom: 6 },
    bulkBtn: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    bulkBtnOn: { borderColor: mailBlue, backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#E8F0FE' },
    bulkBtnTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.mutedText },
    bulkBtnTxtOn: { color: mailBlue },
    listBody: { flex: 1, minHeight: 120 },
    mailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      backgroundColor: listBg,
    },
    mailRowSelected: { backgroundColor: purpleSoft },
    mailRowCheck: { marginRight: -4 },
    mailRowContent: { flex: 1, minWidth: 0 },
    mailRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    mailRowFrom: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
    mailRowFromUnread: { fontWeight: '800' },
    mailRowFromSelected: { color: mailBlue },
    mailRowTime: { fontSize: 11, fontWeight: '600', color: theme.colors.mutedText },
    mailRowPreview: { fontSize: 12, fontWeight: '500', color: theme.colors.mutedText, marginTop: 3 },
    mailRowPreviewUnread: { color: isDark ? '#CBD5E1' : '#5F6368', fontWeight: '600' },
    contactStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    contactActive: { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : commColors.successSoft },
    contactExpired: { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : commColors.dangerSoft },
    contactStatusTxt: { fontSize: 10, fontWeight: '800' },
    contactActiveTxt: { color: commColors.success },
    contactExpiredTxt: { color: commColors.danger },
    mailUnreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: mailBlue },
    mailUnreadSpacer: { width: 8 },
    listAvatar: { width: 40, height: 40, borderRadius: 20 },
    listAvatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? '#1F2937' : '#E8EAED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listAvatarTxt: { fontSize: 15, fontWeight: '800', color: mailBlue },
    campaignIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#E8F0FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTxt: { textAlign: 'center', color: theme.colors.mutedText, marginTop: 32, fontSize: 13, paddingHorizontal: 24 },
    mobileBack: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      backgroundColor: listBg,
    },
    mobileBackTxt: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    previewScrollWrap: { flex: 1 },
    previewScrollContent: { paddingBottom: 24 },
    mailReadCard: {
      margin: 12,
      padding: 16,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    mailSubject: { fontSize: 22, fontWeight: '500', color: theme.colors.text, lineHeight: 28 },
    mailMetaBlock: { marginTop: 12, gap: 4 },
    mailMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    mailMetaLabel: { width: 42, fontSize: 12, fontWeight: '700', color: theme.colors.mutedText },
    mailMetaValue: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
    mailDate: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 6 },
    mailDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: border,
      marginVertical: 14,
    },
    previewMeta: { fontSize: 12, color: theme.colors.mutedText, marginTop: 8, fontWeight: '600' },
    previewMessage: { fontSize: 15, color: theme.colors.text, lineHeight: 23 },
    previewImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginTop: 12,
      backgroundColor: isDark ? '#1F2937' : '#E8EAED',
    },
    attachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#E8F0FE',
    },
    attachmentChipTxt: { fontSize: 12, fontWeight: '700', color: mailBlue },
    statusRow: { flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' },
    previewStats: { marginTop: 12, fontSize: 12, fontWeight: '600', color: theme.colors.mutedText },
    campaignActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    campaignActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
    },
    campaignEditBtn: { borderColor: mailBlue, backgroundColor: isDark ? 'rgba(26,115,232,0.12)' : '#E8F0FE' },
    campaignEditTxt: { fontSize: 14, fontWeight: '700', color: mailBlue },
    campaignDeleteBtn: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.08)' },
    campaignDeleteTxt: { fontSize: 14, fontWeight: '700', color: theme.colors.danger },
    campaignSaveBtn: { borderColor: mailBlue, backgroundColor: mailBlue },
    campaignSaveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
    campaignCancelBtn: { borderColor: border, backgroundColor: isDark ? '#1F2937' : '#F6F8FC' },
    campaignCancelTxt: { fontSize: 14, fontWeight: '700', color: theme.colors.mutedText },
    recipientCard: {
      marginHorizontal: 12,
      marginTop: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    studentCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    studentAvatar: { width: 48, height: 48, borderRadius: 24 },
    studentAvatarFallback: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#1F2937' : '#E8EAED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    studentAvatarTxt: { fontSize: 18, fontWeight: '800', color: mailBlue },
    studentName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    studentSub: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 2 },
    studentMeta: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, marginTop: 10 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    bulkInfo: { alignItems: 'center', padding: 28, gap: 8 },
    bulkInfoIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark ? 'rgba(26,115,232,0.12)' : '#E8F0FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bulkInfoTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    bulkInfoSub: { fontSize: 13, color: theme.colors.mutedText, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16 },
    quickScroll: { maxHeight: 72, paddingHorizontal: 12, marginTop: 4, marginBottom: 4 },
    quickChip: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
      minWidth: 72,
    },
    quickEmoji: { fontSize: 18 },
    quickLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.mutedText, marginTop: 2 },
    selectionCard: {
      marginHorizontal: 12,
      marginBottom: 8,
      padding: 14,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
    },
    selectionCardWarn: {
      borderColor: isDark ? 'rgba(251,191,36,0.55)' : '#FCD34D',
      backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB',
    },
    selectionCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    selectionCardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    selectionCardCount: { fontSize: 13, fontWeight: '700', color: mailBlue },
    selectionCardHint: { marginTop: 8, fontSize: 12, fontWeight: '600', color: isDark ? '#FCD34D' : '#D97706' },
    previewBtn: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: mailBlue,
      backgroundColor: isDark ? 'rgba(26,115,232,0.1)' : '#E8F0FE',
    },
    previewBtnDisabled: {
      borderColor: border,
      backgroundColor: isDark ? '#162032' : '#F6F8FC',
      opacity: 0.85,
    },
    previewBtnTxt: { fontSize: 13, fontWeight: '700', color: mailBlue },
    previewBtnTxtDisabled: { color: theme.colors.mutedText },
    composeCard: {
      marginHorizontal: 12,
      marginTop: 4,
      padding: 14,
      borderRadius: 12,
      backgroundColor: listBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    composeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    composeCardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    composeFieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
    },
    composeFieldRowLast: { borderBottomWidth: 0 },
    composeFieldLabel: {
      width: 56,
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.mutedText,
      paddingTop: 2,
    },
    composeFieldValue: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text, lineHeight: 18 },
    composeFieldInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0, minHeight: 22 },
    composeBodyInput: { minHeight: 100, textAlignVertical: 'top', lineHeight: 21 },
    attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    attachImg: { width: 72, height: 72, borderRadius: 8 },
    pdfAttachChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: purpleSoft,
    },
    pdfAttachTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: mailBlue },
    emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    emojiBtn: { fontSize: 22 },
    templateScroll: { maxHeight: 36, marginTop: 8 },
    templateChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDark ? '#1F2937' : '#E8F0FE',
      marginRight: 8,
      maxWidth: 120,
    },
    templateChipTxt: { fontSize: 11, fontWeight: '700', color: mailBlue },
    composerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    toolBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1F2937' : '#F6F8FC',
    },
    sendBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: mailBlue,
      borderRadius: 20,
      paddingVertical: 11,
    },
    sendBtnDisabled: { opacity: 0.55 },
    sendBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
    deliveryHint: { marginTop: 8, fontSize: 12, fontWeight: '600', color: theme.colors.mutedText, textAlign: 'center' },
    futureBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    futureTxt: { fontSize: 10, fontWeight: '600', color: theme.colors.mutedText, textAlign: 'center' },
  });
}
