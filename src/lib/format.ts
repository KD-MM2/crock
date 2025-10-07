export function formatBytes(bytes?: number) {
  if (bytes === undefined || Number.isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function formatDuration(ms?: number) {
  if (!ms) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
}

export function formatDateTime(timestamp?: number) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(timestamp));
}

export function maskCode(code?: string) {
  if (!code) return '—';
  if (code.length <= 4) return code;
  const parts = code.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-**-${parts[2]}`;
  }
  return `${code.slice(0, 4)}****${code.slice(-2)}`;
}
