import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Camera, Clapperboard, Crown, TrendingUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import RequireSession from '@/components/RequireSession';
import Avatar from '@/components/Avatar';
import { formatBytes, formatUploader } from '@/lib/format';

function StatsInner() {
  const { media, mediaLoading, refreshMedia } = useApp();

  useEffect(() => {
    if (!media && !mediaLoading) void refreshMedia();
  }, [media, mediaLoading, refreshMedia]);

  const items = media ?? [];
  const photos = items.filter((m) => m.type === 'photo');
  const videos = items.filter((m) => m.type === 'video');
  const totalBytes = items.reduce((s, m) => s + (m.size ?? 0), 0);

  // Leaderboard pro Uploader (appProperties.uploader)
  const leaderboard = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number; photos: number; videos: number }>();
    for (const m of items) {
      const key = m.uploader ?? 'nieznany';
      const cur = map.get(key) ?? { count: 0, bytes: 0, photos: 0, videos: 0 };
      cur.count += 1;
      cur.bytes += m.size ?? 0;
      if (m.type === 'photo') cur.photos += 1;
      else cur.videos += 1;
      map.set(key, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [items]);

  // Aktivität letzte 14 Tage (createdTime)
  const days = useMemo(() => {
    const out: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = items.filter((m) => m.createdTime?.slice(0, 10) === key).length;
      out.push({
        label: d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
        count,
      });
    }
    return out;
  }, [items]);
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const photoFrac = items.length ? photos.length / items.length : 0;

  return (
    <div className="py-8">
      <h1 className="font-display text-[28px] font-bold md:text-4xl">
        Statystyki <span className="text-gradient">grupy</span>
      </h1>
      <p className="font-hand mt-1 text-xl text-muted-foreground">kto dodaje najwięcej wspomnień? 📊</p>

      {/* Kennzahlen */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Wspomnienia', value: items.length, icon: TrendingUp },
          { label: 'Zdjęcia', value: photos.length, icon: Camera },
          { label: 'Filmy', value: videos.length, icon: Clapperboard },
          { label: 'Rozmiar razem', value: formatBytes(totalBytes), icon: Camera },
        ].map((s, i) => (
          <motion.div
            key={s.label + i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-4"
          >
            <s.icon size={16} className="text-[#A78BFA]" />
            <p className="font-display mt-2 text-2xl font-bold">{s.value}</p>
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <section className="glass rounded-2xl p-5">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold">
            <Crown size={18} className="text-[#FF5C7A]" /> Ranking ekipy
          </h2>
          {leaderboard.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Brak danych — folder jest jeszcze pusty.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {leaderboard.map(([user, s], i) => (
                <motion.div
                  key={user}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <span className="font-display w-6 text-sm font-bold text-muted-foreground">
                    {i + 1}.
                  </span>
                  <Avatar username={user === 'nieznany' ? undefined : user} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {formatUploader(user === 'nieznany' ? undefined : user)}
                      </span>
                      <span className="font-display text-sm font-bold">{s.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.round((s.count / leaderboard[0]![1].count) * 100)}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg,#FF5C7A,#A78BFA)' }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {s.photos} zdjęć · {s.videos} filmów · {formatBytes(s.bytes)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          {/* Donut Foto/Video (SVG) */}
          <section className="glass rounded-2xl p-5">
            <h2 className="font-display text-lg font-bold">Zdjęcia vs filmy</h2>
            <div className="mt-4 flex items-center justify-center gap-8">
              <Donut fraction={photoFrac} />
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#FF5C7A]" /> Zdjęcia:{' '}
                  <strong>{photos.length}</strong>
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#A78BFA]" /> Filmy:{' '}
                  <strong>{videos.length}</strong>
                </p>
              </div>
            </div>
          </section>

          {/* Aktivität 14 Tage */}
          <section className="glass rounded-2xl p-5">
            <h2 className="font-display text-lg font-bold">Aktywność — ostatnie 14 dni</h2>
            <div className="mt-4 flex h-28 items-end gap-1.5">
              {days.map((d, i) => (
                <div key={i} className="group relative flex-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.count / maxDay) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                    className="min-h-[3px] w-full rounded-t"
                    style={{
                      background:
                        d.count > 0 ? 'linear-gradient(180deg,#FF5C7A,#A78BFA)' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                  <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/90 px-2 py-1 text-[10px] opacity-0 transition group-hover:opacity-100">
                    {d.label}: {d.count}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{days[0]?.label}</span>
              <span>{days[days.length - 1]?.label}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** SVG-Donut: Anteil Zdjęcia (coral) vs Filmy (violet). */
function Donut({ fraction }: { fraction: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
      {/* Filmy-Anteil (violet, voller Kreis als Basis bei >0) */}
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#A78BFA"
        strokeWidth="14"
        strokeDasharray={c}
        strokeDashoffset={0}
      />
      {/* Zdjęcia-Anteil (coral) */}
      <motion.circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#FF5C7A"
        strokeWidth="14"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - fraction) }}
        transition={{ duration: 1, ease: 'easeOut' }}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Stats() {
  return (
    <RequireSession>
      <StatsInner />
    </RequireSession>
  );
}
