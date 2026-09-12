import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { thumbUrl, type DriveMedia } from '@/lib/drive';
import { formatDate, formatDuration, formatUploader } from '@/lib/format';
import Avatar from '@/components/Avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaTileProps {
  media: DriveMedia;
  index: number;
}

/** Masonry-Kachel mit Lazy-Loading (IntersectionObserver) + Hover-Overlay. */
export default function MediaTile({ media, index }: MediaTileProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Lazy: erst laden, wenn die Kachel sichtbar wird
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || src || failed) return;
    let cancelled = false;
    thumbUrl(media)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, src, failed, media]);

  const duration = formatDuration(media.durationMs);

  return (
    <motion.div
      ref={ref}
      initial={index < 10 ? { opacity: 0, y: 24 } : { opacity: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: index < 10 ? index * 0.04 : 0 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/media/${media.id}`)}
      className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-md"
    >
      {src ? (
        <img src={src} alt={media.name} loading="lazy" className="block w-full object-cover" />
      ) : (
        <Skeleton className="h-48 w-full rounded-none bg-white/10" />
      )}
      {failed && (
        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
          Nie udało się załadować
        </div>
      )}

      {/* Video-Badge */}
      {media.type === 'video' && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <Play size={10} fill="currentColor" />
          {duration || 'film'}
        </div>
      )}

      {/* Hover-Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center gap-2">
          <Avatar username={media.uploader} size={22} />
          <span className="text-xs font-medium text-white">{formatUploader(media.uploader)}</span>
          <span className="ml-auto text-[11px] text-white/70">{formatDate(media.createdTime)}</span>
        </div>
      </div>
    </motion.div>
  );
}
