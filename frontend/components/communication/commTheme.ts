/** Communication Center — purple palette from design mockup */
export const commColors = {
  purple: '#5B2B8C',
  purpleLight: '#7C4DAB',
  purpleSoft: '#F3EEFA',
  purpleMuted: '#E8D9F5',
  purpleDark: '#3D1D5C',
  purpleDarkBg: '#140D1F',
  purpleCardDark: '#1E1429',
  success: '#10B981',
  successSoft: '#D1FAE5',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
