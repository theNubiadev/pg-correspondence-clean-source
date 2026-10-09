/** Recipients who have not already received this notification recently. */
export function recipientsWithoutRecent<T extends { id: string }>(
  users: T[],
  recentUserIds: string[],
): T[] {
  const already = new Set(recentUserIds);
  return users.filter((user) => !already.has(user.id));
}
