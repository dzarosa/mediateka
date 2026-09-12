import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Camera, Clapperboard, Images, Loader2, Plus, RefreshCw, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import MediaTile from '@/components/MediaTile';
import Avatar from '@/components/Avatar';
import Seal from '@/components/Seal';
import { Skeleton } from '@/components/ui/skeleton';
import { USERS } from '@/lib/gate';
import { DEMO_IMAGES } from '@/lib/demo';
import { cn } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;
type Filter = 'all' | 'photo' | 'video' | 'mine' | `user:${string}`;

export default function Gallery() {
  const {
    gateUser,
    googleStatus,
    signInGoogle,
    enterDemo,
    demoMode,
    media,
    mediaLoading,
    mediaError,
    refreshMedia,
    toast,
  } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [pulling, setPulling] = useState(0);
  const pullStart = useRef<number | null>(null);

  const filtered = useMemo(() => {
    if (!media) return [];
    let out = media;
    if (filter === 'photo') out = out.filter((m) => m.type === 'photo');
    else if (filter === 'video') out = out.filter((m) => m.type === 'video');
    else if (filter === 'mine') out = out.filter((m) => m.uploader === gateUser?.username);
    else if (filter.startsWith('user:')) {
      const u = filter.slice(5);
      out = out.filter((m) => m.uploader === u);
    }
    return out;
  }, [media, filter, gateUser]);

  const photoCount = media?.filter((m) => m.type === 'photo').length ?? 0;
  const videoCount = media?.filter((m) => m.type === 'video').length ?? 0;
  const peopleCount = new Set((media ?? []).map((m) => m.uploader).filter(Boolean)).size;

  const doRefresh = async () => {
    await refreshMedia();
    toast('Galeria odświeżona ✨', 'success');
  };

  // Pull-to-refresh (mobil)
  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) pullStart.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pullStart.current == null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - pullStart.current;
    setPulling(dy > 0 ? Math.min(dy, 100) : 0);
  };
  const onTouchEnd = () => {
    if (pulling > 60) void doRefresh();
    pullStart.current = null;
    setPulling(0);
  };

  // Google noch nicht verbunden → Verbindungs-Karte (bzw. Demo-Karte)
  if (googleStatus !== 'ready') {
    if (demoMode) {
      return (
        <div className="flex flex-col items-center py-20 text-center">
          <Seal size={56} className="animate-seal-rotate" />
          <h2 className="font-display mt-6 text-2xl font-bold">
            Tryb <span className="text-gradient">demo</span>
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Wersja demonstracyjna — Google Drive jest wyłączony, galeria pokazuje przykładowe
            zdjęcia z aplikacji.
          </p>
          <button
            onClick={() => void enterDemo()}
            className="btn-gradient font-display mt-6 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#0B0B12]"
          >
            Wejdź do demo
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Seal size={56} className="animate-seal-rotate" />
        <h2 className="font-display mt-6 text-2xl font-bold">
          Połącz z <span className="text-gradient">Dyskiem Google</span>
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Galeria czyta zdjęcia i filmy prosto z folderu Drive. Zaloguj się kontem Google, które ma
          dostęp do folderu.
        </p>
        <button
          onClick={() => void signInGoogle()}
          disabled={googleStatus === 'signing-in'}
          className="btn-gradient font-display mt-6 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#0B0B12] disabled:opacity-60"
        >
          {googleStatus === 'signing-in' && <Loader2 size={16} className="animate-spin" />}
          Zaloguj przez Google
        </button>
      </div>
    );
  }

  const chips: { key: Filter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'Wszystko' },
    { key: 'photo', label: 'Zdjęcia', icon: <Camera size={13} /> },
    { key: 'video', label: 'Filmy', icon: <Clapperboard size={13} /> },
    { key: 'mine', label: 'Moje' },
  ];

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Pull-to-refresh-Indikator */}
      {pulling > 0 && (
        <div className="flex justify-center py-2" style={{ opacity: pulling / 60 }}>
          <Seal size={28} className={pulling > 60 ? 'animate-seal-rotate' : ''} />
        </div>
      )}

      {/* Hero-Strip */}
      <section className="pt-6 md:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-bold md:text-[34px]">
              Cześć, <span className="text-gradient">{gateUser?.displayName}</span> 👋
            </h1>
            <p className="font-hand mt-1 text-xl text-muted-foreground">
              {media
                ? media.length > 0
                  ? `grupa dodała już ${media.length} ${media.length === 1 ? 'wspomnienie' : 'wspomnień'}`
                  : 'czas na pierwsze wspomnienia z wyjazdu!'
                : 'ładowanie wspomnień…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { icon: Camera, value: photoCount, label: 'zdjęć' },
              { icon: Clapperboard, value: videoCount, label: 'filmów' },
              { icon: Users, value: peopleCount, label: 'osób' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 * i, type: 'spring', stiffness: 300, damping: 20 }}
                className="glass flex items-center gap-2 rounded-full px-3 py-1.5"
              >
                <s.icon size={14} className="text-[#A78BFA]" />
                <span className="font-display text-sm font-bold">{s.value}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{s.label}</span>
              </motion.div>
            ))}
            <button
              onClick={() => void doRefresh()}
              className="glass flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10"
              title="Odśwież galerię"
            >
              <RefreshCw size={15} className={mediaLoading ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/dodaj"
              className="btn-gradient font-display hidden items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-[#0B0B12] md:flex"
            >
              <Plus size={16} /> Dodaj zdjęcia i filmy
            </Link>
          </div>
        </div>
        <div className="gradient-line mt-5" />
      </section>

      {/* Filter-Leiste */}
      <section className="sticky top-16 z-40 -mx-4 mt-4 bg-[#0B0B12]/80 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {chips.map((c) => (
            <FilterChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)}>
              {c.icon} {c.label}
            </FilterChip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-white/10" />
          {USERS.map((u) => (
            <FilterChip
              key={u.username}
              active={filter === `user:${u.username}`}
              onClick={() => setFilter(`user:${u.username}`)}
            >
              <Avatar username={u.username} size={18} /> {u.displayName}
            </FilterChip>
          ))}
        </div>
      </section>

      {/* Fehler */}
      {mediaError && (
        <div className="glass mt-6 rounded-2xl border-[#FF5C7A]/40 p-5 text-sm">
          <p className="text-[#FF5C7A]">{mediaError}</p>
          <button
            onClick={() => void refreshMedia()}
            className="mt-3 rounded-full glass px-4 py-2 text-xs font-semibold hover:bg-white/10"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Inhalt */}
      <section className="mt-6">
        {mediaLoading && !media ? (
          <div className="masonry columns-2 md:columns-3 xl:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-xl bg-white/10"
                style={{ height: `${160 + ((i * 53) % 120)}px` }}
              />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="masonry columns-2 md:columns-3 xl:columns-4">
            {filtered.map((m, i) => (
              <MediaTile key={m.id} media={m} index={i} />
            ))}
          </div>
        ) : media && media.length === 0 ? (
          <DemoEmptyState />
        ) : (
          <EmptyState filterActive={filter !== 'all'} />
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition',
        active ? 'btn-gradient text-[#0B0B12]' : 'glass text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </motion.button>
  );
}

/** Leerer Drive → Demo-Wand mit klarer Kennzeichnung. */
function DemoEmptyState() {
  return (
    <div>
      <div className="glass mx-auto flex max-w-md flex-col items-center rounded-2xl p-6 text-center">
        <img
          src={`${BASE}empty-state.svg`}
          alt="Pusta walizka"
          className="animate-float w-56"
          draggable={false}
        />
        <h3 className="font-display mt-3 text-lg font-bold">Tu jeszcze pusto…</h3>
        <p className="font-hand text-xl text-[#FF5C7A]">dodaj pierwsze zdjęcie z wyjazdu!</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Folder na Dysku Google jest pusty — poniżej tylko{' '}
          <strong>Przykładowe zdjęcia</strong> (nie są zapisywane w Drive).
        </p>
        <Link
          to="/dodaj"
          className="btn-gradient font-display mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-[#0B0B12]"
        >
          <Plus size={16} /> Dodaj zdjęcia / filmy
        </Link>
      </div>
      <div className="mt-8">
        <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          <Images size={14} className="text-[#A78BFA]" /> Przykładowe zdjęcia
        </p>
        <div className="masonry columns-2 md:columns-3 xl:columns-4">
          {DEMO_IMAGES.map((d, i) => (
            <motion.div
              key={d.src}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 10) * 0.04 }}
              className="relative overflow-hidden rounded-xl border border-white/10"
            >
              <img src={d.src} alt={d.label} loading="lazy" className="block w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="text-[11px] text-white/80">{d.label}</span>
              </div>
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">
                Przykład
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Filter ohne Treffer. */
function EmptyState({ filterActive }: { filterActive: boolean }) {
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center rounded-2xl p-8 text-center">
      <img src={`${BASE}empty-state.svg`} alt="" className="animate-float w-56" draggable={false} />
      <h3 className="font-display mt-3 text-lg font-bold">Tu jeszcze pusto…</h3>
      <p className="font-hand text-xl text-[#FF5C7A]">
        {filterActive ? 'nic pasuje do tego filtra' : 'dodaj pierwsze zdjęcie z wyjazdu!'}
      </p>
      <Link
        to="/dodaj"
        className="btn-gradient font-display mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-[#0B0B12]"
      >
        <Plus size={16} /> Dodaj zdjęcia / filmy
      </Link>
    </div>
  );
}
