export const CATEGORY_ICONS = [
  { id: 'food', label: 'Food' },
  { id: 'travel', label: 'Travel' },
  { id: 'home', label: 'Home' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'bills', label: 'Bills' },
  { id: 'health', label: 'Health' },
  { id: 'entertainment', label: 'Fun' },
  { id: 'education', label: 'Study' },
  { id: 'gift', label: 'Gift' },
  { id: 'other', label: 'Other' },
] as const;

export type CategoryIconId = typeof CATEGORY_ICONS[number]['id'];

export function isCategoryIconId(value: unknown): value is CategoryIconId {
  return typeof value === 'string' && CATEGORY_ICONS.some(icon => icon.id === value);
}

export function iconForCategory(name: string, icon?: string | null): CategoryIconId | null {
  if (isCategoryIconId(icon)) return icon;
  const defaults: Record<string, CategoryIconId> = {
    food: 'food', travel: 'travel', rent: 'home', shopping: 'shopping', bills: 'bills', other: 'other',
  };
  return defaults[name.toLowerCase()] ?? null;
}
