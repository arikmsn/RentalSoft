export type WorkOrderStatusColor = 'black' | 'red' | 'orange' | 'green';

export function computeWorkOrderStatus(
  plannedRemovalDate: Date | null,
  now: Date = new Date()
): { statusColor: WorkOrderStatusColor; daysUntilRemoval: number | null } {
  if (!plannedRemovalDate) return { statusColor: 'green', daysUntilRemoval: null };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(
    plannedRemovalDate.getFullYear(),
    plannedRemovalDate.getMonth(),
    plannedRemovalDate.getDate()
  );

  const daysUntilRemoval = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilRemoval < 0) return { statusColor: 'black', daysUntilRemoval };
  if (daysUntilRemoval >= 0 && daysUntilRemoval <= 3) return { statusColor: 'red', daysUntilRemoval };
  if (daysUntilRemoval >= 4 && daysUntilRemoval <= 7) return { statusColor: 'orange', daysUntilRemoval };
  return { statusColor: 'green', daysUntilRemoval };
}
