import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { AppLoadingFallback } from './components/ui/app-loading-fallback';
import './index.css';
import './lib/i18n';

const App = React.lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<AppLoadingFallback fullscreen />}>
      <App />
    </Suspense>
  </React.StrictMode>
);
