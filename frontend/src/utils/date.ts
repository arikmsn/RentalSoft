export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function formatDateFull(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  plannedRemovalDate: Date | string | null | undefined,
  now: Date = new Date()
): { statusColor: WorkOrderStatusColor; daysUntilRemoval: number | null } {
  if (!plannedRemovalDate) return { statusColor: 'green', daysUntilRemoval: null };

  const targetDate = typeof plannedRemovalDate === 'string' ? new Date(plannedRemovalDate) : plannedRemovalDate;
  
  const today = toLocalMidnight(now);
  const target = toLocalMidnight(targetDate);
  const daysUntilRemoval = diffInDays(target, today);

  if (daysUntilRemoval < 0) return { statusColor: 'black', daysUntilRemoval };
  if (daysUntilRemoval >= 0 && daysUntilRemoval <= 3) return { statusColor: 'red', daysUntilRemoval };
  if (daysUntilRemoval >= 4 && daysUntilRemoval <= 7) return { statusColor: 'orange', daysUntilRemoval };
  return { statusColor: 'green', daysUntilRemoval };
}
