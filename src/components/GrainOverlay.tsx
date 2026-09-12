import { memo } from 'react';

/** Globaler Filmkorn-Overlay (grain.png, sehr dezent). */
const GrainOverlay = memo(function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90]"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}grain.png)`,
        opacity: 0.05,
        mixBlendMode: 'overlay',
      }}
    />
  );
});

export default GrainOverlay;
