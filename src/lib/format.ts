// Kleine Formatierungs-Helfer (polnische Lokalisierung).

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toLocaleString('pl-PL', { maximumFractionDigits: v >= 100 ? 0 : 1 })} ${units[i]}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatUploader(username?: string): string {
  if (!username) return 'Nieznany';
  const map: Record<string, string> = {
    kasia: 'Kasia',
    bogusia: 'Bogusia',
    ania_p: 'Ania',
    rober_p: 'Robert',
    hubert_p: 'Hubert',
    maria: 'Maria',
    staszek: 'Staszek',
    klaudia: 'Klaudia',
    admin: 'Admin',
  };
  return map[username] ?? username;
}
