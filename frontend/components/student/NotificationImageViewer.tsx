import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { downloadNotificationImage } from '../../utils/downloadNotificationImage';

type Props = {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
};

export function NotificationImageViewer({ imageUrl, title, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const visible = Boolean(imageUrl);

  useEffect(() => {
    if (imageUrl) setImageLoading(true);
  }, [imageUrl]);

  const handleDownload = async () => {
    if (!imageUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadNotificationImage(imageUrl);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={onClose} style={styles.topBtn} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {title || 'Image'}
          </Text>
          <TouchableOpacity
            onPress={() => void handleDownload()}
            style={styles.topBtn}
            hitSlop={12}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.imageStage}>
          {imageLoading ? (
            <ActivityIndicator size="large" color="#fff" style={styles.loader} />
          ) : null}
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.fullImage}
              contentFit="contain"
              onLoadEnd={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          ) : null}
        </View>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => void handleDownload()}
            disabled={downloading}
            activeOpacity={0.9}
          >
            {downloading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#0F172A" />
                <Text style={styles.downloadBtnTxt}>Save / Share Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  imageStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  loader: {
    position: 'absolute',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  downloadBtnTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
});
