export const queryKeys = {
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  expenses: (groupId: string) => ['expenses', groupId] as const,
  categories: (groupId: string) => ['categories', groupId] as const,
};
