// Demo-/Platzhalter-Bilder (nur genutzt, wenn der Drive-Ordner leer ist).
// Werden im UI klar als „Przykładowe zdjęcia" gekennzeichnet.

const BASE = import.meta.env.BASE_URL;

export interface DemoImage {
  src: string;
  label: string;
  /** grobes Seitenverhältnis für die Masonry-Platzhalterhöhe */
  ratio: number;
}

export const DEMO_IMAGES: DemoImage[] = [
  { src: `${BASE}demo-01.jpg`, label: 'Pałac Gyeongbokgung', ratio: 4 / 3 },
  { src: `${BASE}demo-02.jpg`, label: 'Nocny targ w Seulu', ratio: 3 / 4 },
  { src: `${BASE}demo-03.jpg`, label: 'Kolejki w Busan', ratio: 4 / 3 },
  { src: `${BASE}demo-04.jpg`, label: 'Koreańskie BBQ', ratio: 1 },
  { src: `${BASE}demo-05.jpg`, label: 'Fushimi Inari', ratio: 3 / 4 },
  { src: `${BASE}demo-06.jpg`, label: 'Shibuya nocą', ratio: 4 / 3 },
  { src: `${BASE}demo-07.jpg`, label: 'Bambusowy gaj w Kioto', ratio: 3 / 4 },
  { src: `${BASE}demo-08.jpg`, label: 'Ramen', ratio: 1 },
  { src: `${BASE}demo-09.jpg`, label: 'Fudżi z sakurą', ratio: 4 / 3 },
  { src: `${BASE}demo-10.jpg`, label: 'Dotonbori, Osaka', ratio: 3 / 4 },
];
