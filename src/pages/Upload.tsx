import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  FolderOpen,
  HardDriveUpload,
  ImagePlus,
  Loader2,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import RequireGoogle from '@/components/RequireGoogle';
import { uploadToDrive, DriveError } from '@/lib/drive';
import { getAccessToken } from '@/lib/google';
import { formatBytes } from '@/lib/format';
import { getConfig } from '@/config';
import { cn } from '@/lib/utils';

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

type ItemStatus = 'queued' | 'uploading' | 'done' | 'error';

interface QueueItem {
  id: number;
  file: File;
  preview: string;
  isVideo: boolean;
  status: ItemStatus;
  progress: number;
  error?: string;
}

let itemId = 0;

function UploadInner() {
  const { gateUser, folderId, refreshMedia, toast, demoMode } = useApp();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [doneAll, setDoneAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // Cleanup lokaler Object-URLs
  useEffect(() => {
    return () => {
      setQueue((q) => {
        q.forEach((it) => URL.revokeObjectURL(it.preview));
        return q;
      });
    };
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      if (demoMode) {
        toast('Tryb demo: wysyłanie na Google Drive jest wyłączone. 📁', 'info');
        return;
      }
      const accepted: QueueItem[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast(`Pominięto ${file.name} — tylko zdjęcia i filmy.`, 'error');
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast(`${file.name} jest za duży (maks. 200 MB).`, 'error');
          continue;
        }
        accepted.push({
          id: ++itemId,
          file,
          preview: URL.createObjectURL(file),
          isVideo: file.type.startsWith('video/'),
          status: 'queued',
          progress: 0,
        });
      }
      if (accepted.length) {
        setQueue((q) => [...q, ...accepted]);
        setDoneAll(false);
      }
    },
    [toast, demoMode],
  );

  const removeItem = (id: number) => {
    setQueue((q) => {
      const it = q.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return q.filter((x) => x.id !== id);
    });
  };

  const patchItem = (id: number, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const uploadAll = async () => {
    const token = getAccessToken();
    if (!token || !folderId || !gateUser) {
      toast('Brak połączenia z Google — zaloguj się ponownie.', 'error');
      return;
    }
    setUploading(true);
    // Sequentiell: ein File nach dem anderen (schont Handy-Verbindungen)
    for (const item of queue) {
      if (item.status === 'done') continue;
      patchItem(item.id, { status: 'uploading', progress: 0, error: undefined });
      try {
        await uploadToDrive(token, folderId, item.file, gateUser.username, (frac) =>
          patchItem(item.id, { progress: frac }),
        );
        patchItem(item.id, { status: 'done', progress: 1 });
      } catch (err) {
        patchItem(item.id, {
          status: 'error',
          error: err instanceof DriveError ? err.friendly : 'Nie udało się wysłać pliku.',
        });
      }
    }
    setUploading(false);
    setQueue((q) => {
      const failed = q.filter((x) => x.status === 'error').length;
      if (failed > 0) {
        toast(`Nie udało się wysłać ${failed} ${failed === 1 ? 'pliku' : 'plików'} — spróbuj ponownie.`, 'error');
      } else {
        setDoneAll(true);
        void refreshMedia();
      }
      return q;
    });
  };

  const totalBytes = queue.reduce((s, x) => s + x.file.size, 0);
  const pending = queue.filter((x) => x.status !== 'done').length;

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ x: -40, rotate: -20, opacity: 0 }}
          animate={{ x: 0, rotate: 45, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Send size={28} className="text-[#FF5C7A]" />
        </motion.div>
        <h1 className="font-display text-[28px] font-bold md:text-4xl">Dodaj wspomnienia</h1>
      </div>
      <p className="font-hand mt-1 text-xl text-muted-foreground">
        prosto z telefonu — galeria otworzy się automatycznie 📱
      </p>
      {demoMode ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
          <HardDriveUpload size={14} className="shrink-0" />
          Tryb demo: wysyłanie na Google Drive będzie dostępne po konfiguracji (patrz GITHUB-SETUP.md).
        </div>
      ) : (
        <div className="glass mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground">
          <HardDriveUpload size={14} className="text-[#5EEAD4]" />
          Pliki trafiają prosto do katalogu Google Drive{' '}
          <span className="font-semibold text-[#A78BFA]">{getConfig().driveFolderName}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {doneAll ? (
          <SuccessCard
            key="success"
            name={gateUser?.displayName ?? ''}
            previews={queue.map((q) => q.preview)}
            onReset={() => {
              queue.forEach((it) => URL.revokeObjectURL(it.preview));
              setQueue([]);
              setDoneAll(false);
            }}
          />
        ) : (
          <motion.div key="form" exit={{ opacity: 0, y: -12 }}>
            {/* Drop-Zone */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                'relative mt-8 flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition',
                dragOver ? 'border-[#FF5C7A] bg-white/10' : 'border-white/15 bg-white/5',
              )}
            >
              <ImagePlus
                size={48}
                className={cn('text-[#A78BFA]', dragOver && 'animate-float')}
                strokeWidth={1.5}
              />
              <div>
                <p className="font-semibold">Wybierz zdjęcia i filmy</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG · PNG · HEIC · MP4 · MOV — wiele plików naraz, maks. 200 MB / plik
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => galleryInput.current?.click()}
                  className="btn-gradient font-display flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-[#0B0B12]"
                >
                  <FolderOpen size={17} /> Z galerii
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => cameraInput.current?.click()}
                  className="glass font-display flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold hover:bg-white/10"
                >
                  <Camera size={17} /> Zrób zdjęcie / nagraj
                </motion.button>
              </div>
              <p className="hidden text-xs text-muted-foreground md:block">
                albo przeciągnij pliki na tę kartę
              </p>
            </motion.div>

            {/* Versteckte native Picker: öffnen auf iOS/Android direkt Galerie/Kamera */}
            <input
              ref={galleryInput}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={cameraInput}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Queue */}
            {queue.length > 0 && (
              <div className="mt-8">
                <p className="text-sm text-muted-foreground">
                  Wybrano <strong className="text-foreground">{queue.length}</strong>{' '}
                  {queue.length === 1 ? 'plik' : 'plików'} (łącznie {formatBytes(totalBytes)})
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  <AnimatePresence>
                    {queue.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0, width: 0 }}
                        className={cn(
                          'relative aspect-square overflow-hidden rounded-lg border',
                          item.status === 'error' ? 'border-[#F87171]' : 'border-white/10',
                        )}
                      >
                        {item.isVideo ? (
                          <video src={item.preview} className="h-full w-full object-cover" muted />
                        ) : (
                          <img src={item.preview} alt="" className="h-full w-full object-cover" />
                        )}
                        {/* Status-Overlay */}
                        {item.status === 'uploading' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <ProgressRing progress={item.progress} />
                          </div>
                        )}
                        {item.status === 'done' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5EEAD4] text-[#0B0B12]">
                              <Check size={20} />
                            </span>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-1 text-center">
                            <RotateCcw size={18} className="text-[#F87171]" />
                            <span className="text-[10px] leading-tight text-[#F87171]">błąd</span>
                          </div>
                        )}
                        {item.status === 'queued' && !uploading && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-[#F87171]"
                            aria-label="Usuń z kolejki"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void uploadAll()}
                  disabled={uploading || pending === 0}
                  className="btn-gradient font-display mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold text-[#0B0B12] disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Wysyłanie…
                    </>
                  ) : (
                    `Wyślij ${pending} ${pending === 1 ? 'plik' : 'plików'}`
                  )}
                </motion.button>
              </div>
            )}

            {/* Tipps */}
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                '💡 Możesz zaznaczyć wiele zdjęć naraz',
                '🎬 Filmy do 200 MB na plik',
                '☁️ Kopie trafiają na wspólny Drive',
              ].map((t) => (
                <div key={t} className="glass rounded-2xl px-4 py-3 text-xs text-muted-foreground">
                  {t}
                </div>
              ))}
            </div>
            <p className="font-hand mt-6 text-center text-lg text-muted-foreground">
              — ekipa Seul → Tokio 2026
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Fortschrittsring mit Gradient-Stroke (echter XHR-Progress). */
function ProgressRing({ progress }: { progress: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14">
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF5C7A" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

/** Erfolgs-Karte mit Konfetti. */
function SuccessCard({
  name,
  previews,
  onReset,
}: {
  name: string;
  previews: string[];
  onReset: () => void;
}) {
  const confetti = useRef(
    Array.from({ length: 30 }).map((_, i) => ({
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: ['#FF5C7A', '#A78BFA', '#5EEAD4'][i % 3],
      size: 5 + Math.random() * 7,
      rotate: Math.random() * 360,
    })),
  );
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass relative mt-8 overflow-hidden rounded-2xl p-10 text-center"
    >
      {confetti.current.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '60vh', opacity: 0, rotate: p.rotate }}
          transition={{ duration: 1.6, delay: p.delay, ease: 'easeIn' }}
          className="pointer-events-none absolute top-0"
          style={{ width: p.size, height: p.size, background: p.color, borderRadius: 2 }}
        />
      ))}
      <p className="font-hand text-3xl text-[#5EEAD4]">Dodane! Dzięki, {name} 🎉</p>
      <div className="mt-5 flex justify-center gap-2 overflow-x-auto">
        {previews.slice(0, 6).map((src, i) => (
          <motion.img
            key={src}
            src={src}
            alt=""
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ))}
      </div>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="btn-gradient font-display rounded-full px-6 py-3 text-sm font-bold text-[#0B0B12]"
        >
          Zobacz w galerii
        </Link>
        <button onClick={onReset} className="glass font-display rounded-full px-6 py-3 text-sm font-bold hover:bg-white/10">
          Dodaj kolejne
        </button>
      </div>
    </motion.div>
  );
}

export default function Upload() {
  return (
    <RequireGoogle>
      <UploadInner />
    </RequireGoogle>
  );
}
