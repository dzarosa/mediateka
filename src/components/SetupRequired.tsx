import { ExternalLink, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import Seal from '@/components/Seal';

/**
 * Eleganter „Setup erforderlich"-Screen, wenn in public/config.js noch keine
 * echte Google Client ID eingetragen ist — statt eines kaputten Logins.
 */
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
        Wymagana <span className="text-gradient">konfiguracja</span>
      </h1>
      <p className="font-hand mt-2 text-2xl text-[#FF5C7A]">jeszcze chwila i ruszamy! ✈️</p>

      <div className="glass mt-8 max-w-lg rounded-2xl p-6 text-left text-sm leading-relaxed text-muted-foreground">
        <div className="mb-3 flex items-center gap-2 text-foreground">
          <Settings size={16} className="text-[#A78BFA]" />
          <span className="font-semibold">Brak Google Client ID</span>
        </div>
        <p>
          W pliku <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#5EEAD4]">public/config.js</code>{' '}
          nie wpisano jeszcze identyfikatora <strong>Google OAuth Client ID</strong>.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>Utwórz projekt w Google Cloud i włącz <em>Google Drive API</em>.</li>
          <li>
            Utwórz <em>OAuth Client ID</em> (aplikacja internetowa) z adresem{' '}
            <code className="rounded bg-white/10 px-1">https://&lt;user&gt;.github.io</code>.
          </li>
          <li>
            Wpisz Client ID do <code className="rounded bg-white/10 px-1">public/config.js</code>,
            zacommituj i wypchnij zmiany.
          </li>
        </ol>
        <p className="mt-3">
          Pełna instrukcja krok po kroku:{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#5EEAD4]">GITHUB-SETUP.md</code>
        </p>
        <a
          href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
          target="_blank"
          rel="noreferrer"
          className="btn-gradient mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#0B0B12]"
        >
          Otwórz Google Cloud Console <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
