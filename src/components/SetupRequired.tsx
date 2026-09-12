import { ExternalLink, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import Seal from '@/components/Seal';

/** Pokazywany, gdy frontend nie ma jeszcze adresu backendu w public/config.js. */
export default function SetupRequired() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <Seal size={72} className="animate-seal-rotate drop-shadow-[0_0_24px_rgba(255,92,122,0.45)]" />
      </motion.div>
      <h1 className="font-display mt-6 text-2xl font-bold md:text-3xl">
        Wymagana <span className="text-gradient">konfiguracja backendu</span>
      </h1>
      <p className="font-hand mt-2 text-2xl text-[#FF5C7A]">jeszcze chwila i ruszamy! ✈️</p>

      <div className="glass mt-8 max-w-lg rounded-2xl p-6 text-left text-sm leading-relaxed text-muted-foreground">
        <div className="mb-3 flex items-center gap-2 text-foreground">
          <Settings size={16} className="text-[#A78BFA]" />
          <span className="font-semibold">Brak adresu Backend API</span>
        </div>
        <p>
          W pliku <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#5EEAD4]">public/config.js</code>{' '}
          trzeba wpisać adres wdrożonego backendu, np. Google Cloud Run.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>Włącz Google Drive API i przygotuj jednorazowy refresh token właściciela.</li>
          <li>Wdróż katalog <code className="rounded bg-white/10 px-1">server/</code> do Cloud Run.</li>
          <li>Wpisz otrzymany URL jako <code className="rounded bg-white/10 px-1">apiBaseUrl</code> w <code className="rounded bg-white/10 px-1">public/config.js</code>.</li>
        </ol>
        <p className="mt-3">
          Pełna instrukcja: <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#5EEAD4]">GITHUB-SETUP.md</code>
        </p>
        <a
          href="https://console.cloud.google.com/run"
          target="_blank"
          rel="noreferrer"
          className="btn-gradient mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#0B0B12]"
        >
          Otwórz Google Cloud Run <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
