export function formatRupees(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function timeAgoShort(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  } catch {
    return iso;
  }
}

export function healthToDot(status: string): 'green' | 'amber' | 'red' | 'gray' {
  if (['healthy', 'connected', 'ok', 'active'].includes(status)) return 'green';
  if (['degraded', 'warning', 'idle', 'unknown'].includes(status)) return 'amber';
  if (['unhealthy', 'disconnected', 'breach', 'down', 'failing'].includes(status)) return 'red';
  return 'gray';
}
