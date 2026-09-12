import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[80] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={cn(
                'glass flex items-center gap-2 rounded-2xl px-4 py-3 shadow-xl',
                t.kind === 'success' && 'text-[#5EEAD4]',
                t.kind === 'error' && 'text-[#FF5C7A]',
                t.kind === 'info' && 'text-foreground',
              )}
            >
              <Icon size={18} />
              <span className="font-hand text-xl leading-none">{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
