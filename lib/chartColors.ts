export const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16',
];

export function colorFor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return CHART_COLORS[hash % CHART_COLORS.length];
}

export const RECHARTS_THEME = {
  axisStroke: '#6b7280',
  gridStroke: '#374151',
  tooltipBg: '#111827',
  tooltipBorder: '#374151',
  textFill: '#9ca3af',
};
