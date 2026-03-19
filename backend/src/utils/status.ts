export type WorkOrderStatusColor = 'black' | 'red' | 'orange' | 'green';

export function computeWorkOrderStatus(
  plannedRemovalDate: Date | null,
  now: Date = new Date()
): { statusColor: WorkOrderStatusColor; daysUntilRemoval: number | null } {
  if (!plannedRemovalDate) return { statusColor: 'green', daysUntilRemoval: null };

  const daysUntilRemoval = Math.ceil(
    (plannedRemovalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilRemoval < 0) return { statusColor: 'black', daysUntilRemoval };
  if (daysUntilRemoval <= 2) return { statusColor: 'red', daysUntilRemoval };
  if (daysUntilRemoval <= 7) return { statusColor: 'orange', daysUntilRemoval };
  return { statusColor: 'green', daysUntilRemoval };
}
