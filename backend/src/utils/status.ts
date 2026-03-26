export type WorkOrderStatusColor = 'black' | 'red' | 'orange' | 'green';

function toLocalMidnight(date: Date): Date {
  const str = date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [month, day, year] = str.split('/').map(Number);
  return new Date(year, month - 1, day);
}

function diffInDays(dateA: Date, dateB: Date): number {
  const a = toLocalMidnight(dateA);
  const b = toLocalMidnight(dateB);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerDay);
}

export function computeWorkOrderStatus(
  plannedRemovalDate: Date | null,
  now: Date = new Date()
): { statusColor: WorkOrderStatusColor; daysUntilRemoval: number | null } {
  if (!plannedRemovalDate) return { statusColor: 'green', daysUntilRemoval: null };

  const today = toLocalMidnight(now);
  const target = toLocalMidnight(plannedRemovalDate);
  const daysUntilRemoval = diffInDays(target, today);

  console.log('[computeWorkOrderStatus] input date:', plannedRemovalDate.toISOString());
  console.log('[computeWorkOrderStatus] today (normalized):', today.toISOString(), 'local:', today.toString());
  console.log('[computeWorkOrderStatus] target (normalized):', target.toISOString(), 'local:', target.toString());
  console.log('[computeWorkOrderStatus] daysUntilRemoval:', daysUntilRemoval);

  if (daysUntilRemoval < 0) return { statusColor: 'black', daysUntilRemoval };
  if (daysUntilRemoval >= 0 && daysUntilRemoval <= 3) return { statusColor: 'red', daysUntilRemoval };
  if (daysUntilRemoval >= 4 && daysUntilRemoval <= 7) return { statusColor: 'orange', daysUntilRemoval };
  return { statusColor: 'green', daysUntilRemoval };
}
