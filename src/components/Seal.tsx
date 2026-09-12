// Hand-authored „Hanko"-Siegel-Logo (coral Stempel mit 2026 + KJ).

export default function Seal({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo-seal.svg`}
      alt="Mediateka Siegel"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
