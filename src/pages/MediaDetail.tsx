import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import RequireGoogle from '@/components/RequireGoogle';
import Avatar from '@/components/Avatar';
import { fullUrl, type DriveMedia } from '@/lib/drive';
import { formatBytes, formatDate, formatDuration, formatUploader } from '@/lib/format';
import { cn } from '@/lib/utils';

function DetailInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { media, mediaLoading, gateUser, removeMedia, refreshMedia, demoMode } = useApp();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Bei Direktaufruf/Reload: Liste ggf. nachladen
  useEffect(() => {
    if (!media && !mediaLoading) void refreshMedia();
  }, [media, mediaLoading, refreshMedia]);

  const item: DriveMedia | undefined = useMemo(
    () => media?.find((m) => m.id === id),
    [media, id],
  );
  const index = media?.findIndex((m) => m.id === id) ?? -1;
  const prev = media && index > 0 ? media[index - 1] : undefined;
  const next = media && index >= 0 && index < media.length - 1 ? media[index + 1] : undefined;

  useEffect(() => {
    setBlobUrl(null);
    setLoadError(null);
    setConfirmDelete(false);
    if (!item) return;
    let cancelled = false;
    fullUrl(item)
      .then((url) => {
        if (!cancelled) setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Nie udało się załadować pliku z Dysku Google.');
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  const doDelete = async () => {
    if (!item) return;
    setDeleting(true);
    const ok = await removeMedia(item.id);
    setDeleting(false);
    if (ok) navigate('/', { replace: true });
  };

  if (mediaLoading && !media) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[#A78BFA]" />
      </div>
    );
  }

  if (media && !item) {
    return (
      <div className="glass mx-auto mt-16 max-w-md rounded-2xl p-8 text-center">
        <p className="font-display text-lg font-bold">Nie znaleziono pliku</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Może został usunięty z Dysku Google.
        </p>
        <Link to="/" className="btn-gradient font-display mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-bold text-[#0B0B12]">
          Wróć do galerii
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4 md:py-8">
      {/* Obere Leiste */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm hover:bg-white/10"
        >
          <ChevronLeft size={16} /> Galeria
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => prev && navigate(`/media/${prev.id}`, { replace: true })}
            disabled={!prev}
            className="glass flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
            aria-label="Poprzedni"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => next && navigate(`/media/${next.id}`, { replace: true })}
            disabled={!next}
            className="glass flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
            aria-label="Następny"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Lightbox */}
        <motion.div
          key={item?.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex min-h-[40vh] items-center justify-center overflow-hidden rounded-2xl bg-black/60"
        >
          {blobUrl && item ? (
            item.type === 'video' ? (
              <video
                src={blobUrl}
                controls
                playsInline
                className="max-h-[80vh] w-full object-contain"
              />
            ) : (
              <img src={blobUrl} alt={item.name} className="max-h-[80vh] w-full object-contain" />
            )
          ) : (
            <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
              {loadError ? (
                <p className="text-sm text-[#FF5C7A]">{loadError}</p>
              ) : (
                <>
                  <Loader2 size={26} className="animate-spin text-[#A78BFA]" />
                  <span className="text-xs">Ładowanie z Dysku Google…</span>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Metadaten */}
        <aside className="glass h-fit rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <Avatar username={item?.uploader} size={40} />
            <div>
              <p className="font-semibold">{formatUploader(item?.uploader)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(item?.createdTime)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <MetaRow label="Nazwa" value={item?.name} />
            <MetaRow label="Rozmiar" value={formatBytes(item?.size)} />
            {item?.width && item?.height && (
              <MetaRow label="Wymiary" value={`${item.width} × ${item.height}px`} />
            )}
            {item?.type === 'video' && item.durationMs && (
              <MetaRow label="Czas trwania" value={formatDuration(item.durationMs)} />
            )}
            <MetaRow label="Typ" value={item?.mimeType} />
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {blobUrl && item && (
              <a
                href={blobUrl}
                download={item.name}
                className="btn-gradient font-display flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-[#0B0B12]"
              >
                <Download size={15} /> Pobierz
              </a>
            )}
            {item?.webViewLink && (
              <a
                href={item.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="glass flex items-center justify-center gap-2 rounded-full py-2.5 text-sm hover:bg-white/10"
              >
                <ExternalLink size={14} /> Otwórz w Drive
              </a>
            )}
            {gateUser?.isAdmin && item && !demoMode && (
              <>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center justify-center gap-2 rounded-full border border-[#F87171]/40 py-2.5 text-sm text-[#F87171] transition hover:bg-[#F87171]/10"
                  >
                    <Trash2 size={14} /> Usuń (admin)
                  </button>
                ) : (
                  <div className="rounded-xl border border-[#F87171]/40 p-3 text-center">
                    <p className="text-xs text-[#F87171]">Na pewno usunąć z Drive?</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => void doDelete()}
                        disabled={deleting}
                        className={cn(
                          'flex-1 rounded-full bg-[#F87171] py-2 text-xs font-bold text-[#0B0B12]',
                          deleting && 'opacity-60',
                        )}
                      >
                        {deleting ? 'Usuwam…' : 'Tak, usuń'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="glass flex-1 rounded-full py-2 text-xs"
                      >
                        <X size={12} className="mr-1 inline" /> Anuluj
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2">
      <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <span className="break-all text-right text-xs">{value ?? '—'}</span>
    </div>
  );
}

export default function MediaDetail() {
  return (
    <RequireGoogle>
      <DetailInner />
    </RequireGoogle>
  );
}
