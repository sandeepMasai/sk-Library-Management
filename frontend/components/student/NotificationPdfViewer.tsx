import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { downloadNotificationPdf, openNotificationPdf } from '../../utils/downloadNotificationPdf';

type Props = {
  pdfUrl: string | null;
  title?: string;
  onClose: () => void;
};

export function NotificationPdfViewer({ pdfUrl, title, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);

  const visible = Boolean(pdfUrl);

  const handleOpen = async () => {
    if (!pdfUrl || opening) return;
    setOpening(true);
    try {
      await openNotificationPdf(pdfUrl, title);
    } finally {
      setOpening(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadNotificationPdf(pdfUrl, title);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.topBtn} hitSlop={12}>
            <Ionicons name="close" size={26} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {title || 'PDF Document'}
          </Text>
          <View style={styles.topBtn} />
        </View>

        <View style={styles.body}>
          <View style={styles.iconRing}>
            <Ionicons name="document-text" size={56} color="#DC2626" />
          </View>
          <Text style={styles.heading}>PDF ready to open</Text>
          <Text style={styles.sub}>
            Tap Open PDF to view in your PDF reader app, or download to save on your device.
          </Text>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => void handleOpen()}
            disabled={opening}
            activeOpacity={0.9}
          >
            {opening ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnTxt}>Open PDF</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => void handleDownload()}
            disabled={downloading}
            activeOpacity={0.9}
          >
            {downloading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#0F172A" />
                <Text style={styles.secondaryBtnTxt}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#DC2626',
  },
  primaryBtnTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
