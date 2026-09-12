import { createRoot } from 'react-dom/client';
// HashRouter: GitHub Pages hat kein SPA-Fallback — saubere URLs würden 404 liefern.
import { HashRouter } from 'react-router';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './context/AppContext.tsx';

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <AppProvider>
      <App />
    </AppProvider>
  </HashRouter>,
);
