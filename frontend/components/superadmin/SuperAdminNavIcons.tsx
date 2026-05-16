import React from 'react';
import type { LucideProps } from 'lucide-react-native';
import {
  LayoutDashboard,
  LibraryBig,
  CreditCard,
  GraduationCap,
  Tags,
  Wallet,
  Bell,
  Settings2,
} from 'lucide-react-native';
import type { SuperAdminNavIconName } from './superAdminNavConfig';

export function SuperAdminNavIcon({
  name,
  color,
  size = 20,
  strokeWidth = 2,
}: {
  name: SuperAdminNavIconName;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const p: LucideProps = { color, size, strokeWidth };
  switch (name) {
    case 'LayoutDashboard':
      return <LayoutDashboard {...p} />;
    case 'LibraryBig':
      return <LibraryBig {...p} />;
    case 'CreditCard':
      return <CreditCard {...p} />;
    case 'GraduationCap':
      return <GraduationCap {...p} />;
    case 'Tags':
      return <Tags {...p} />;
    case 'Wallet':
      return <Wallet {...p} />;
    case 'Bell':
      return <Bell {...p} />;
    case 'Settings2':
      return <Settings2 {...p} />;
    default:
      return <LayoutDashboard {...p} />;
  }
}
