import { Outlet, Navigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar, { MobileTabBar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import Toasts from '@/components/Toasts';
import GrainOverlay from '@/components/GrainOverlay';
import SetupRequired from '@/components/SetupRequired';
import { useApp } from '@/context/AppContext';

/** App-Shell: schützt alle Seiten hinter der Gruppensperre. */
export default function Layout() {
  const { gateUser, configured } = useApp();
  const location = useLocation();

  if (!gateUser) return <Navigate to="/login" replace />;
  if (!configured) return <SetupRequired />;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 md:px-8 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileTabBar />
      <Toasts />
      <GrainOverlay />
    </div>
  );
}
