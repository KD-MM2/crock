import { Suspense, lazy } from 'react';
import { Toaster } from 'sonner';
import './App.css';
import { AppLoadingFallback } from './components/ui/app-loading-fallback';
import ThemeProvider from './providers/theme';

const AppShellTopbar = lazy(() => import('./components/app-shell/topbar'));
const HistoryDialog = lazy(() => import('./components/history/history-dialog'));
const SettingsDialog = lazy(() => import('./components/settings/settings-dialog'));
const TransferView = lazy(() => import('./components/transfer/transfer-view'));

function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<AppLoadingFallback fullscreen />}>
        <div className="flex h-screen flex-col bg-background text-foreground">
          <AppShellTopbar />
          <main className="flex flex-1 flex-col overflow-hidden">
            <TransferView />
          </main>
          <HistoryDialog />
          <SettingsDialog />
          <Toaster position="top-right" richColors />
        </div>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
