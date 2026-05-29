import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StartPage } from './pages/StartPage';
import { BoardPage } from './pages/BoardPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
