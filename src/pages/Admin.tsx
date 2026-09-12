import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Camera,
  Clapperboard,
  Database,
  FolderOpen,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import RequireGoogle from '@/components/RequireGoogle';
import Avatar from '@/components/Avatar';
import MediaTile from '@/components/MediaTile';
import { getConfig } from '@/config';
import { formatBytes, formatUploader } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'moderation' | 'drive';

function AdminInner() {
  const { media, mediaLoading, refreshMedia, removeMedia, folderId, toast, demoMode } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!media && !mediaLoading) void refreshMedia();
  }, [media, mediaLoading, refreshMedia]);

  const items = media ?? [];
  const photos = items.filter((m) => m.type === 'photo');
  const videos = items.filter((m) => m.type === 'video');
  const totalBytes = items.reduce((s, m) => s + (m.size ?? 0), 0);

  const doDelete = async (id: string) => {
    setDeletingId(id);
    await removeMedia(id);
    setDeletingId(null);
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Przegląd', icon: Shield },
    { key: 'moderation', label: 'Moderacja mediów', icon: Trash2 },
    { key: 'drive', label: 'Status Drive', icon: HardDrive },
  ];

  return (
    <div className="py-8">
      <h1 className="font-display flex items-center gap-3 text-[28px] font-bold md:text-4xl">
        <Shield className="text-[#A78BFA]" /> Panel <span className="text-gradient">admina</span>
      </h1>
      <p className="font-hand mt-1 text-xl text-muted-foreground">zarządzanie wspólną mediateką 🛡️</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
              tab === t.key ? 'btn-gradient text-[#0B0B12]' : 'glass text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
        <button
          onClick={() => {
            void refreshMedia();
            toast('Odświeżono dane ✨', 'success');
          }}
          className="glass ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          title="Odśwież"
        >
          <RefreshCw size={15} className={mediaLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {tab === 'overview' && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Wszystkie pliki', value: items.length, icon: Database },
            { label: 'Zdjęcia', value: photos.length, icon: Camera },
            { label: 'Filmy', value: videos.length, icon: Clapperboard },
            { label: 'Łączny rozmiar', value: formatBytes(totalBytes), icon: HardDrive },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-4"
            >
              <s.icon size={16} className="text-[#FF5C7A]" />
              <p className="font-display mt-2 text-2xl font-bold">{s.value}</p>
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'moderation' && (
        <div className="mt-6">
          {demoMode && (
            <p className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
              Tryb demo: usuwanie plików jest wyłączone.
            </p>
          )}
          {mediaLoading && !media ? (
            <div className="flex justify-center py-16">
              <Loader2 size={26} className="animate-spin text-[#A78BFA]" />
            </div>
          ) : items.length === 0 ? (
            <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
              Folder jest pusty — nie ma czego moderować. 🎉
            </p>
          ) : (
            <div className="masonry columns-2 md:columns-3 xl:columns-4">
              {items.map((m, i) => (
                <div key={m.id} className="relative">
                  <MediaTile media={m} index={i} />
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
                    <Avatar username={m.uploader} size={14} />
                    {formatUploader(m.uploader)}
                    {m.type === 'video' && <Play size={9} fill="currentColor" />}
                  </div>
                  {!demoMode && (
                    <button
                      onClick={() => void doDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="absolute bottom-2 right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#F87171]/90 text-[#0B0B12] transition hover:shadow-[0_0_16px_rgba(248,113,113,0.6)] disabled:opacity-50"
                      title="Usuń z Drive"
                    >
                      {deletingId === m.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'drive' && (
        <div className="mt-6 max-w-xl space-y-4">
          <div className="glass rounded-2xl p-5 text-sm">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
              <FolderOpen size={18} className="text-[#5EEAD4]" /> Status połączenia
            </h2>
            <dl className="mt-4 space-y-3">
              {demoMode && <Row label="Tryb" value="DEMO — Google Drive wyłączony" />}
              <Row label="Folder Drive" value={getConfig().driveFolderName} />
              <Row label="ID folderu" value={folderId ?? '—'} mono />
              <Row label="Liczba plików" value={String(items.length)} />
              <Row
                label="Google Client ID"
                value={
                  getConfig().googleClientId.includes('HIER_GOOGLE')
                    ? '⚠️ Platzhalter — siehe GITHUB-SETUP.md'
                    : `…${getConfig().googleClientId.slice(-24)}`
                }
                mono
              />
            </dl>
          </div>
          <div className="glass rounded-2xl p-5 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Konfiguration ohne Neu-Build:</strong> die Datei{' '}
              <code className="rounded bg-white/10 px-1 text-[#5EEAD4]">public/config.js</code>{' '}
              enthält Client-ID und Ordnernamen. Nach dem Ändern einfach committen &amp; pushen —
              GitHub Actions baut und veröffentlicht automatisch neu.
            </p>
            <p className="mt-2">
              Hinweise zur Einrichtung: <code className="rounded bg-white/10 px-1">GITHUB-SETUP.md</code>{' '}
              im Repository.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className={cn('break-all text-right text-xs', mono && 'font-mono')}>{value}</dd>
    </div>
  );
}

export default function Admin() {
  const { gateUser } = useApp();
  if (!gateUser?.isAdmin) return <Navigate to="/" replace />;
  return (
    <RequireGoogle>
      <AdminInner />
    </RequireGoogle>
  );
}
