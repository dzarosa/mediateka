import type { ReactNode } from 'react';

/**
 * Kompatybilność ze starszą wersją repozytorium.
 *
 * Logowanie Google po stronie przeglądarki zostało usunięte. Dostęp do
 * Google Drive realizuje teraz backend, dlatego ten komponent nie blokuje
 * już widoku i po prostu renderuje zawartość.
 */
export default function RequireGoogle({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
