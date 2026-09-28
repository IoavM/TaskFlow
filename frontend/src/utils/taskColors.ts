export interface TaskColorTheme {
  id: string;
  name: string;
  hex: string;
  gradient: string;
  cardBg: string;
  border: string;
  glow: string;
  accent: string;
  text: string;
  badgeBg: string;
}

export const TASK_COLORS: Record<string, TaskColorTheme> = {
  blue: {
    id: 'blue',
    name: 'Azul Eléctrico',
    hex: '#0052FF',
    gradient: 'linear-gradient(135deg, rgba(0, 82, 255, 0.90) 0%, rgba(59, 130, 246, 0.84) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(239, 246, 255, 0.90) 0%, rgba(255, 255, 255, 0.95) 100%)',
    border: 'rgba(59, 130, 246, 0.40)',
    glow: 'rgba(0, 82, 255, 0.20)',
    accent: '#0052FF',
    text: '#1E40AF',
    badgeBg: 'rgba(219, 234, 254, 0.85)',
  },
  purple: {
    id: 'purple',
    name: 'Violeta Real',
    hex: '#9333EA',
    gradient: 'linear-gradient(135deg, rgba(147, 51, 234, 0.90) 0%, rgba(168, 85, 247, 0.84) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(250, 245, 255, 0.90) 0%, rgba(255, 255, 255, 0.95) 100%)',
    border: 'rgba(168, 85, 247, 0.40)',
    glow: 'rgba(147, 51, 234, 0.20)',
    accent: '#9333EA',
    text: '#6B21A8',
    badgeBg: 'rgba(243, 232, 255, 0.85)',
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda Neón',
    hex: '#059669',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.90) 0%, rgba(5, 150, 105, 0.84) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(236, 253, 245, 0.90) 0%, rgba(255, 255, 255, 0.95) 100%)',
    border: 'rgba(16, 185, 129, 0.40)',
    glow: 'rgba(16, 185, 129, 0.20)',
    accent: '#059669',
    text: '#065F46',
    badgeBg: 'rgba(209, 250, 229, 0.85)',
  },
  rose: {
    id: 'rose',
    name: 'Rosa Neón',
    hex: '#E11D48',
    gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.90) 0%, rgba(251, 113, 133, 0.84) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(255, 241, 242, 0.90) 0%, rgba(255, 255, 255, 0.95) 100%)',
    border: 'rgba(244, 63, 94, 0.40)',
    glow: 'rgba(244, 63, 94, 0.20)',
    accent: '#E11D48',
    text: '#9F1239',
    badgeBg: 'rgba(255, 228, 230, 0.85)',
  },
  amber: {
    id: 'amber',
    name: 'Ámbar Solar',
    hex: '#D97706',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.90) 0%, rgba(217, 119, 6, 0.84) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(254, 243, 199, 0.90) 0%, rgba(255, 255, 255, 0.95) 100%)',
    border: 'rgba(245, 158, 11, 0.40)',
    glow: 'rgba(245, 158, 11, 0.20)',
    accent: '#D97706',
    text: '#92400E',
    badgeBg: 'rgba(254, 240, 138, 0.85)',
  },
  cyan: {
    id: 'cyan',
    name: 'Cian Glaciar',
    hex: '#0891B2',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.90) 0%, rgba(14, 165, 233, 0.84) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(236, 254, 255, 0.90) 0%, rgba(255, 255, 255, 0.95) 100%)',
    border: 'rgba(6, 182, 212, 0.40)',
    glow: 'rgba(6, 182, 212, 0.20)',
    accent: '#0891B2',
    text: '#155E75',
    badgeBg: 'rgba(207, 250, 254, 0.85)',
  },
  indigo: {
    id: 'indigo',
    name: 'Índigo Galáctico',
    hex: '#4F46E5',
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.90) 0%, rgba(79, 70, 229, 0.84) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(238, 242, 255, 0.90) 0%, rgba(255, 255, 255, 0.95) 100%)',
    border: 'rgba(99, 102, 241, 0.40)',
    glow: 'rgba(99, 102, 241, 0.20)',
    accent: '#4F46E5',
    text: '#3730A3',
    badgeBg: 'rgba(224, 231, 255, 0.85)',
  },
};

export const DEFAULT_COLOR = 'blue';

export const getTaskColorTheme = (colorKey?: string): TaskColorTheme => {
  if (!colorKey) return TASK_COLORS[DEFAULT_COLOR];
  const normalized = colorKey.toLowerCase().trim();
  return TASK_COLORS[normalized] || TASK_COLORS[DEFAULT_COLOR];
};
