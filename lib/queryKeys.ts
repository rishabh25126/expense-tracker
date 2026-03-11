export const queryKeys = {
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  expenses: (groupId: string) => ['expenses', groupId] as const,
  categories: (groupId: string) => ['categories', groupId] as const,
  insights: (groupId: string) => ['insights', groupId] as const,
  digest: (groupId: string) => ['digest', groupId] as const,
};
