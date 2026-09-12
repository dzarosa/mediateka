import { avatarUrl } from '@/lib/gate';
import { formatUploader } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AvatarProps {
  username?: string;
  size?: number;
  className?: string;
}

/** Prozeduraler Gradient-Avatar mit Initiale (public/avatar-*.png). */
export default function Avatar({ username, size = 32, className }: AvatarProps) {
  const name = formatUploader(username);
  if (!username) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-white/10 text-muted-foreground',
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        ?
      </div>
    );
  }
  return (
    <img
      src={avatarUrl(username)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className={cn('rounded-full object-cover ring-1 ring-white/20', className)}
      style={{ width: size, height: size }}
    />
  );
}
