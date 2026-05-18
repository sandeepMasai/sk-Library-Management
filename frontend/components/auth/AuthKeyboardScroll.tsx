import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthKeyboardScrollContextValue = {
  onFieldFocus: (fieldRef: View | null) => void;
};

const AuthKeyboardScrollContext = createContext<AuthKeyboardScrollContextValue | null>(null);

export function useAuthKeyboardScroll() {
  const ctx = useContext(AuthKeyboardScrollContext);
  if (!ctx) {
    throw new Error('useAuthKeyboardScroll must be used inside AuthKeyboardScroll');
  }
  return ctx;
}

/** Optional — safe inside PremiumField when provider may be absent. */
export function useAuthKeyboardScrollOptional() {
  return useContext(AuthKeyboardScrollContext);
}

/** Attach to a field wrapper `View` + call from TextInput `onFocus`. */
export function useAuthFieldFocus() {
  const wrapRef = useRef<View>(null);
  const kb = useAuthKeyboardScrollOptional();
  const onInputFocus = useCallback(() => {
    kb?.onFieldFocus(wrapRef.current);
  }, [kb]);
  return { wrapRef, onInputFocus };
}

type AuthKeyboardScrollProps = {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraBottomPadding?: number;
  keyboardVerticalOffset?: number;
} & Pick<ScrollViewProps, 'showsVerticalScrollIndicator' | 'keyboardDismissMode'>;

/**
 * Scrollable auth form area that keeps focused inputs visible above the keyboard.
 */
export default function AuthKeyboardScroll({
  children,
  contentContainerStyle,
  extraBottomPadding = 0,
  keyboardVerticalOffset,
  showsVerticalScrollIndicator = false,
  keyboardDismissMode = 'on-drag',
}: AuthKeyboardScrollProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const lastFocusedRef = useRef<View | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const offset =
    keyboardVerticalOffset ?? (Platform.OS === 'ios' ? insets.top + 8 : 0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollFocusedIntoView = useCallback(
    (fieldRef: View | null, kbHeight: number) => {
      if (!fieldRef || !scrollRef.current) return;

      const kb = kbHeight > 0 ? kbHeight : 280;
      const windowH = Dimensions.get('window').height;
      const visibleBottom = windowH - kb - insets.bottom - 20;

      requestAnimationFrame(() => {
        fieldRef.measureInWindow((_x, y, _w, h) => {
          const fieldBottom = y + h;
          if (fieldBottom <= visibleBottom) return;
          const delta = fieldBottom - visibleBottom + 16;
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + delta,
            animated: true,
          });
        });
      });
    },
    [insets.bottom]
  );

  const onFieldFocus = useCallback(
    (fieldRef: View | null) => {
      if (!fieldRef) return;
      lastFocusedRef.current = fieldRef;
      scrollFocusedIntoView(fieldRef, keyboardHeight);
    },
    [keyboardHeight, scrollFocusedIntoView]
  );

  useEffect(() => {
    if (keyboardHeight > 0 && lastFocusedRef.current) {
      const t = setTimeout(() => {
        scrollFocusedIntoView(lastFocusedRef.current, keyboardHeight);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [keyboardHeight, scrollFocusedIntoView]);

  const ctx = useMemo(() => ({ onFieldFocus }), [onFieldFocus]);

  const bottomPad =
    Math.max(insets.bottom, 12) + keyboardHeight + extraBottomPadding + 24;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}
    >
      <AuthKeyboardScrollContext.Provider value={ctx}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={keyboardDismissMode}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          nestedScrollEnabled
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={[{ flexGrow: 1, paddingBottom: bottomPad }, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </AuthKeyboardScrollContext.Provider>
    </KeyboardAvoidingView>
  );
}
