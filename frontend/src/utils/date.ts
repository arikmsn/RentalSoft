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

export function computeWorkOrderStatus(
  plannedRemovalDate: Date | string | null | undefined,
  now: Date = new Date()
): { statusColor: WorkOrderStatusColor; daysUntilRemoval: number | null } {
  if (!plannedRemovalDate) return { statusColor: 'green', daysUntilRemoval: null };

  const targetDate = typeof plannedRemovalDate === 'string' ? new Date(plannedRemovalDate) : plannedRemovalDate;
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  const daysUntilRemoval = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilRemoval < 0) return { statusColor: 'black', daysUntilRemoval };
  if (daysUntilRemoval >= 0 && daysUntilRemoval <= 3) return { statusColor: 'red', daysUntilRemoval };
  if (daysUntilRemoval >= 4 && daysUntilRemoval <= 7) return { statusColor: 'orange', daysUntilRemoval };
  return { statusColor: 'green', daysUntilRemoval };
}
