import { getConfig } from '@/config';

const PLACES = [
  'SEOUL',
  'BUSAN',
  'JEJU',
  'KYOTO',
  'TOKYO',
  'OSAKA',
  'NARA',
  'GYEONGJU',
  'HAKONE',
  'INCHEON',
];

export default function Footer() {
  const items = [...PLACES, ...PLACES];
  return (
    <footer className="mt-auto border-t border-white/10 pb-24 md:pb-0">
      <div className="overflow-hidden py-3">
        <div className="animate-marquee flex w-max gap-6 whitespace-nowrap text-xs font-medium tracking-[0.2em] text-muted-foreground">
          {items.map((p, i) => (
            <span key={`${p}-${i}`} className="flex items-center gap-6">
              {p} <span className="text-[#FF5C7A]">·</span>
            </span>
          ))}
        </div>
      </div>
      <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
        Mediateka grupowa · Korea &amp; Japonia 2026 · zdjęcia zapisują się w katalogu{' '}
        <span className="text-[#A78BFA]">{getConfig().driveFolderName}</span>
      </p>
    </footer>
  );
}
