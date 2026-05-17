import React from 'react';
import { ConfirmModal, type ConfirmTone } from './ConfirmModal';

export type SignOutPreset = 'default' | 'superAdmin' | 'libraryAdmin';

type Props = {
  visible: boolean;
  loading?: boolean;
  preset?: SignOutPreset;
  title?: string;
  description?: string;
  hint?: string;
  label?: string;
  tone?: ConfirmTone;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const PRESETS: Record<
  SignOutPreset,
  { tone: ConfirmTone; label: string; title: string; description: string; hint: string; confirmText: string }
> = {
  default: {
    tone: 'primary',
    label: 'CONFIRM',
    title: 'Sign out?',
    description: 'You will need to sign in again to access your account.',
    hint: 'You can sign in again anytime.',
    confirmText: 'Sign out',
  },
  superAdmin: {
    tone: 'danger',
    label: 'PLATFORM ADMIN',
    title: 'Leave Operations Console?',
    description:
      'You will sign out of the Super Admin dashboard. Active session tokens on this device will be cleared.',
    hint: 'Use your ADMIN_USERNAME and ADMIN_PIN from backend/.env to sign back in.',
    confirmText: 'Sign out',
  },
  libraryAdmin: {
    tone: 'danger',
    label: 'LIBRARY ADMIN',
    title: 'Sign out of library panel?',
    description:
      'You will return to the login screen. Students and staff on this device will need credentials to sign in again.',
    hint: 'You can sign in again anytime.',
    confirmText: 'Sign out',
  },
};

export function SignOutConfirmModal(props: Props) {
  const preset = PRESETS[props.preset ?? 'default'];
  const description = [props.description ?? preset.description, props.hint ?? preset.hint]
    .filter(Boolean)
    .join('\n\n');

  return (
    <ConfirmModal
      visible={props.visible}
      tone={props.tone ?? preset.tone}
      label={props.label ?? preset.label}
      title={props.title ?? preset.title}
      description={description}
      loading={props.loading}
      cancelText={props.cancelText ?? 'Stay signed in'}
      confirmText={props.confirmText ?? preset.confirmText}
      confirmIcon="log-out-outline"
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
    />
  );
}
