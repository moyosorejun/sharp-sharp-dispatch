import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './styles/index.css';
import Landing from './pages/Landing';
import ComingNext from './pages/ComingNext';

// The call view carries the Vapi SDK, so it loads only when visited.
const Call = lazy(() => import('./pages/Call'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/call"
          element={
            <Suspense fallback={<div className="min-h-screen bg-forest" />}>
              <Call />
            </Suspense>
          }
        />
        <Route path="/dashboard/*" element={<ComingNext title="Dashboard" />} />
        <Route path="*" element={<ComingNext title="Page no dey" notFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
