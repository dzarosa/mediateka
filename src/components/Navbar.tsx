import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { BarChart3, Images, LogOut, Plus, Shield, User } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Avatar from '@/components/Avatar';
import Seal from '@/components/Seal';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', label: 'Galeria', icon: Images },
  { to: '/dodaj', label: 'Dodaj', icon: Plus },
  { to: '/statystyki', label: 'Statystyki', icon: BarChart3 },
];

export default function Navbar() {
  const { gateUser, logout, demoMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo + ggf. Demo-Badge */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-3">
            <Seal size={36} />
            <div className="leading-tight">
              <div className="font-display text-sm font-bold uppercase tracking-[0.12em]">
                Mediateka
              </div>
              <div className="font-hand text-base text-[#FF5C7A]">Seul → Tokio · sierpień–wrzesień 2026 ♡</div>
            </div>
          </Link>
          {demoMode && (
            <span
              className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B0B12]"
              title="Tryb demo — Google Drive wyłączony / Demo-Modus: Google Drive deaktiviert"
            >
              Demo
            </span>
          )}
        </div>

        {/* Tabs (desktop) */}
        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => {
            const active =
              tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={cn(
                  'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full"
                    style={{ background: 'linear-gradient(90deg,#FF5C7A,#A78BFA)' }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="relative flex items-center gap-2">
          {gateUser?.isAdmin && (
            <Link
              to="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-full glass text-[#A78BFA] transition hover:shadow-[0_0_16px_rgba(167,139,250,0.4)]"
              title="Panel admina"
            >
              <Shield size={16} />
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full glass py-1 pl-1 pr-3 transition hover:bg-white/10"
          >
            <Avatar username={gateUser?.username} size={28} />
            <span className="hidden text-sm font-medium sm:inline">{gateUser?.displayName}</span>
            <User size={14} className="text-muted-foreground" />
          </button>
          {menuOpen && (
            <>
              <button
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
                aria-label="Zamknij menu"
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-12 z-50 w-44 rounded-2xl glass p-2 shadow-xl"
              >
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#F87171] transition hover:bg-white/10"
                >
                  <LogOut size={15} /> Wyloguj
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Mobile Bottom-Tab-Bar mit zentralem Upload-FAB. */
export function MobileTabBar() {
  const location = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 glass border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-6 py-2">
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const active =
            tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
          if (tab.to === '/dodaj') {
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="btn-gradient -mt-6 flex h-14 w-14 items-center justify-center rounded-full text-[#0B0B12] shadow-lg"
                aria-label="Dodaj zdjęcia i filmy"
              >
                <Icon size={24} />
              </Link>
            );
          }
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px]',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon size={20} className={active ? 'text-[#FF5C7A]' : ''} />
              {tab.label}
              <span className="sr-only">{i}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
