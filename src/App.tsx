import { Navigate, Route, Routes } from 'react-router';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Gallery from '@/pages/Gallery';
import Upload from '@/pages/Upload';
import MediaDetail from '@/pages/MediaDetail';
import Stats from '@/pages/Stats';
import Admin from '@/pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Layout-Route (Pattern B): Layout rendert <Outlet/>, Seiten sind nested routes */}
      <Route element={<Layout />}>
        <Route index element={<Gallery />} />
        <Route path="dodaj" element={<Upload />} />
        <Route path="media/:id" element={<MediaDetail />} />
        <Route path="statystyki" element={<Stats />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
