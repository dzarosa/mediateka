import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Seal from '@/components/Seal';

/** Zeigt eine Verbindungs-Karte, solange kein Google-Token vorliegt. */
export default function RequireGoogle({ children }: { children: ReactNode }) {
  const { googleStatus, signInGoogle, enterDemo, demoMode } = useApp();
  if (googleStatus === 'ready') return <>{children}</>;
  if (demoMode) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Seal size={56} className="animate-seal-rotate" />
        <h2 className="font-display mt-6 text-2xl font-bold">
          Tryb <span className="text-gradient">demo</span>
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Wersja demonstracyjna — Google Drive jest wyłączony, galeria pokazuje przykładowe zdjęcia.
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
        Ta strona potrzebuje dostępu do wspólnego folderu na Dysku Google. Zaloguj się kontem
        Google z dostępem do folderu.
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
