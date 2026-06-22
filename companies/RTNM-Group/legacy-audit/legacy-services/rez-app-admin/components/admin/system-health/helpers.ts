export const formatTimestamp = (ts: Date | string) => new Date(ts).toLocaleString();
export const getStatusColor = (status: string) =>
  status === 'healthy' ? '#22c55e' : status === 'degraded' ? '#f59e0b' : '#ef4444';
