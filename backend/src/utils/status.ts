export type WorkOrderStatusColor = 'black' | 'red' | 'orange' | 'green';

function toLocalDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffInDays(dateA: Date, dateB: Date): number {
  const a = toLocalDate(dateA);
  const b = toLocalDate(dateB);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerDay);
}

export function computeWorkOrderStatus(
  plannedRemovalDate: Date | null,
  now: Date = new Date()
): { statusColor: WorkOrderStatusColor; daysUntilRemoval: number | null } {
  if (!plannedRemovalDate) return { statusColor: 'green', daysUntilRemoval: null };

  const today = toLocalDate(now);
  const target = toLocalDate(plannedRemovalDate);
  const daysUntilRemoval = diffInDays(target, today);

  console.log('[computeWorkOrderStatus] input date:', plannedRemovalDate.toISOString());
  console.log('[computeWorkOrderStatus] today (normalized):', today.toISOString());
  console.log('[computeWorkOrderStatus] target (normalized):', target.toISOString());
  console.log('[computeWorkOrderStatus] daysUntilRemoval:', daysUntilRemoval);

  if (daysUntilRemoval < 0) return { statusColor: 'black', daysUntilRemoval };
  if (daysUntilRemoval >= 0 && daysUntilRemoval <= 3) return { statusColor: 'red', daysUntilRemoval };
  if (daysUntilRemoval >= 4 && daysUntilRemoval <= 7) return { statusColor: 'orange', daysUntilRemoval };
  return { statusColor: 'green', daysUntilRemoval };
}
