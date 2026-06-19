import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAppStore,
  type CommunicationAudience,
  type CommunicationCampaign,
  type CommunicationMessageType,
} from '../../store';
import { theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import {
  MessageSendFeedbackModal,
  type MessageSendFeedbackState,
} from '../../components/library/MessageSendFeedbackModal';
import { deriveCommunicationTitle } from '../../utils/communicationMessage';

const AUDIENCE_OPTIONS: { key: CommunicationAudience; label: string; sub: string }[] = [
  { key: 'all', label: 'All Students', sub: 'Everyone in your library' },
  { key: 'active', label: 'Active', sub: 'Paid & not expired' },
  { key: 'expired', label: 'Expired', sub: 'Membership ended' },
  { key: 'shift', label: 'By Shift', sub: 'Students on a shift' },
  { key: 'selected', label: 'Select Students', sub: 'Pick one or more' },
];

const MESSAGE_TYPES: { key: CommunicationMessageType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'image', label: 'Image' },
  { key: 'text_image', label: 'Text + Image' },
];

export default function SendMessageScreen() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(mode), [mode]);

  const users = useAppStore((s) => s.users);
  const shifts = useAppStore((s) => s.shifts);
  const fetchStudents = useAppStore((s) => s.fetchStudents);
  const fetchShifts = useAppStore((s) => s.fetchShifts);
  const sendCommunicationMessage = useAppStore((s) => s.sendCommunicationMessage);
  const fetchCommunicationHistory = useAppStore((s) => s.fetchCommunicationHistory);
  const previewCommunicationRecipientCount = useAppStore((s) => s.previewCommunicationRecipientCount);

  const [audience, setAudience] = useState<CommunicationAudience>('all');
  const [messageType, setMessageType] = useState<CommunicationMessageType>('text');
  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<CommunicationCampaign[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sendFeedback, setSendFeedback] = useState<MessageSendFeedbackState | null>(null);

  const showFeedback = (state: MessageSendFeedbackState) => setSendFeedback(state);

  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const rows = await fetchCommunicationHistory();
      setHistory(rows);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchCommunicationHistory]);

  useEffect(() => {
    void fetchStudents();
    void fetchShifts();
    void loadHistory();
  }, [fetchStudents, fetchShifts, loadHistory]);

  useEffect(() => {
    let cancelled = false;

    if (audience === 'selected' && selectedStudentIds.length === 0) {
      setRecipientCount(0);
      setCountLoading(false);
      return;
    }
    if (audience === 'shift' && !shiftId) {
      setRecipientCount(0);
      setCountLoading(false);
      return;
    }

    setCountLoading(true);
    void previewCommunicationRecipientCount({
      audience,
      studentIds: audience === 'selected' ? selectedStudentIds : [],
      shiftId: audience === 'shift' ? shiftId : null,
    })
      .then((count) => {
        if (!cancelled) setRecipientCount(count);
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience, selectedStudentIds, shiftId, previewCommunicationRecipientCount]);

  const needsStudentSelection = audience === 'selected';
  const canPreviewOrSend =
    (audience !== 'selected' || selectedStudentIds.length > 0) &&
    (audience !== 'shift' || Boolean(shiftId));

  const refreshRecipientCount = useCallback(async () => {
    if (audience === 'selected' && selectedStudentIds.length === 0) {
      setRecipientCount(0);
      return;
    }
    if (audience === 'shift' && !shiftId) {
      setRecipientCount(0);
      return;
    }
    setCountLoading(true);
    try {
      const count = await previewCommunicationRecipientCount({
        audience,
        studentIds: audience === 'selected' ? selectedStudentIds : [],
        shiftId: audience === 'shift' ? shiftId : null,
      });
      setRecipientCount(count);
    } finally {
      setCountLoading(false);
    }
  }, [audience, selectedStudentIds, shiftId, previewCommunicationRecipientCount]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    const m = message.trim();
    const t = deriveCommunicationTitle(m, Boolean(imageUri));
    if (messageType === 'text' && !m) {
      showFeedback({ variant: 'warning', title: 'Missing message', subtitle: 'Please enter message content.' });
      return;
    }
    if (messageType === 'image' && !imageUri) {
      showFeedback({ variant: 'warning', title: 'Missing image', subtitle: 'Please upload an image to send.' });
      return;
    }
    if (messageType === 'text_image' && (!m || !imageUri)) {
      showFeedback({ variant: 'warning', title: 'Incomplete message', subtitle: 'Please add both text and an image.' });
      return;
    }
    if (audience === 'selected' && selectedStudentIds.length === 0) {
      showFeedback({ variant: 'warning', title: 'Select students', subtitle: 'Choose at least one student.' });
      return;
    }
    if (audience === 'shift' && !shiftId) {
      showFeedback({ variant: 'warning', title: 'Select shift', subtitle: 'Choose a shift to message.' });
      return;
    }
    if (recipientCount === 0) {
      showFeedback({ variant: 'warning', title: 'No recipients', subtitle: 'No students match the selected filter.' });
      return;
    }

    setSending(true);
    const sentImageUri = imageUri;
    try {
      const result = await sendCommunicationMessage({
        title: t,
        message: m,
        messageType,
        audience,
        studentIds: audience === 'selected' ? selectedStudentIds : [],
        shiftId: audience === 'shift' ? shiftId : null,
        imageUri,
      });
      if (!result.ok) {
        showFeedback({
          variant: 'error',
          title: 'Could not send',
          subtitle: result.message || 'Please try again.',
        });
        return;
      }
      const count = result.recipientCount ?? recipientCount;
      setImageUri(null);
      setSelectedStudentIds([]);
      await loadHistory();
      showFeedback({
        variant: 'success',
        title: 'Message sent!',
        subtitle: `Notification delivered to ${count} student${count === 1 ? '' : 's'}.`,
        recipientCount: count,
        messageBody: m || (sentImageUri ? 'Photo sent' : undefined),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Send Message</Text>
            <View style={styles.iconBtn} />
          </View>

          <Text style={styles.sectionLabel}>Recipients</Text>
          <View style={styles.chipWrap}>
            {AUDIENCE_OPTIONS.map((opt) => {
              const active = audience === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setAudience(opt.key)}
                >
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{opt.label}</Text>
                  <Text style={[styles.chipSub, active && styles.chipSubActive]}>{opt.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {audience === 'shift' ? (
            <View style={styles.block}>
              <Text style={styles.fieldLabel}>Shift</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {shifts.map((sh) => {
                  const active = shiftId === sh.id;
                  return (
                    <TouchableOpacity
                      key={sh.id}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => setShiftId(sh.id)}
                    >
                      <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{sh.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {audience === 'selected' ? (
            <TouchableOpacity style={styles.selectBtn} onPress={() => setStudentPickerOpen(true)}>
              <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.selectBtnTxt}>
                {selectedStudentIds.length
                  ? `${selectedStudentIds.length} student(s) selected`
                  : 'Tap to select students'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {needsStudentSelection ? (
            <View style={[styles.selectionCard, !canPreviewOrSend && styles.selectionCardWarn]}>
              <View style={styles.selectionCardTop}>
                <Text style={styles.selectionCardTitle}>
                  Selected Students: {selectedStudentIds.length}
                </Text>
                {canPreviewOrSend && !countLoading ? (
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
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={canPreviewOrSend ? theme.colors.primary : theme.colors.mutedTextText}
                />
                <Text style={[styles.previewBtnTxt, !canPreviewOrSend && styles.previewBtnTxtDisabled]}>
                  Preview Recipients
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.countRow}>
              <Ionicons name="mail-outline" size={16} color={theme.colors.mutedText} />
              {countLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.countTxt}>{recipientCount} recipient(s)</Text>
              )}
            </View>
          )}

          <Text style={styles.sectionLabel}>Message Type</Text>
          <View style={styles.typeRow}>
            {MESSAGE_TYPES.map((t) => {
              const active = messageType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}
                  onPress={() => setMessageType(t.key)}
                >
                  <Text style={[styles.typeBtnTxt, active && styles.typeBtnTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Message</Text>
          {messageType !== 'image' ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type your message..."
              placeholderTextColor={theme.colors.mutedText}
              value={message}
              onChangeText={setMessage}
              multiline
            />
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Optional caption with your image"
              placeholderTextColor={theme.colors.mutedText}
              value={message}
              onChangeText={setMessage}
            />
          )}

          {messageType !== 'text' ? (
            <View style={styles.block}>
              <Text style={styles.fieldLabel}>Image</Text>
              {imageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImage} onPress={() => setImageUri(null)}>
                    <Ionicons name="close-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                  <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
                  <Text style={styles.uploadBtnTxt}>Upload Image</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.sendBtn, (sending || !canPreviewOrSend) && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={sending || !canPreviewOrSend}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendBtnTxt}>Send Now</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Message History</Text>
          {historyLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyHist}>No messages sent yet.</Text>
          ) : (
            history.slice(0, 20).map((row) => (
              <View key={row.id} style={styles.histCard}>
                <View style={styles.histTop}>
                  <Text style={styles.histTitle} numberOfLines={1}>
                    {row.title}
                  </Text>
                  <Text style={styles.histType}>{row.messageType.replace('_', ' + ')}</Text>
                </View>
                {row.message ? (
                  <Text style={styles.histMsg} numberOfLines={2}>
                    {row.message}
                  </Text>
                ) : null}
                <View style={styles.histMeta}>
                  <Text style={styles.histMetaTxt}>{row.audienceLabel}</Text>
                  <Text style={styles.histMetaTxt}>
                    {row.sentAt ? format(new Date(row.sentAt), 'dd MMM yyyy · h:mm a') : '—'}
                  </Text>
                </View>
                <Text style={styles.histDelivery}>
                  Delivered to {row.recipientCount} · Push {row.pushSentCount}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={studentPickerOpen} animationType="slide" onRequestClose={() => setStudentPickerOpen(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Students</Text>
            <TouchableOpacity onPress={() => setStudentPickerOpen(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const checked = selectedStudentIds.includes(item.id);
              return (
                <TouchableOpacity style={styles.studentRow} onPress={() => toggleStudent(item.id)}>
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={checked ? theme.colors.primary : theme.colors.mutedText}
                  />
                  <Text style={styles.studentName}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

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

function makeStyles(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  const card = theme.colors.surface;
  const border = theme.colors.border;
  const inputBg = isDark ? '#162032' : theme.colors.surface;
  const activeBg = isDark ? 'rgba(13,148,136,0.22)' : 'rgba(15,118,110,0.1)';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    topTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: theme.colors.text },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.mutedText,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 8,
    },
    chipWrap: { gap: 8, marginBottom: 12 },
    chip: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      borderRadius: 12,
      padding: 12,
    },
    chipActive: { borderColor: theme.colors.primary, backgroundColor: activeBg },
    chipTxt: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    chipTxtActive: { color: isDark ? '#5EEAD4' : theme.colors.primary },
    chipSub: { fontSize: 12, color: theme.colors.mutedText, marginTop: 2 },
    chipSubActive: { color: isDark ? '#5EEAD4' : theme.colors.primary },
    block: { marginBottom: 12 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 12,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    typeBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    typeBtnActive: { borderColor: theme.colors.primary, backgroundColor: activeBg },
    typeBtnTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.mutedText },
    typeBtnTxtActive: { color: isDark ? '#5EEAD4' : theme.colors.primary },
    pill: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginRight: 8,
    },
    pillActive: { borderColor: theme.colors.primary, backgroundColor: activeBg },
    pillTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.mutedText },
    pillTxtActive: { color: isDark ? '#5EEAD4' : theme.colors.primary },
    selectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    selectBtnTxt: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
    selectionCard: {
      marginBottom: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: card,
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
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    countTxt: { fontSize: 13, color: theme.colors.mutedText },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.primary,
      borderRadius: 12,
      padding: 18,
      backgroundColor: card,
    },
    uploadBtnTxt: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
    imagePreviewWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
    imagePreview: { width: '100%', height: 180, borderRadius: 12 },
    removeImage: { position: 'absolute', top: 8, right: 8 },
    sendBtn: {
      marginTop: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    sendBtnDisabled: { opacity: 0.45, backgroundColor: isDark ? '#334155' : theme.colors.primary },
    sendBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
    emptyHist: { color: theme.colors.mutedText, fontSize: 14, marginTop: 8 },
    histCard: {
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    histTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    histTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text },
    histType: { fontSize: 11, color: theme.colors.mutedText, textTransform: 'capitalize' },
    histMsg: { fontSize: 13, color: theme.colors.mutedText, marginTop: 4 },
    histMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    histMetaTxt: { fontSize: 11, color: theme.colors.mutedText },
    histDelivery: { fontSize: 11, color: theme.colors.primary, marginTop: 4, fontWeight: '600' },
    modalRoot: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
    modalDone: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
    studentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
    },
    studentName: { fontSize: 15, color: theme.colors.text },
  });
}
