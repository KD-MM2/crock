import './App.css';
import { Toaster } from 'sonner';

import { AppShellTopbar } from './components/app-shell/topbar';
import { HistoryDialog } from './components/history/history-dialog';
import { SettingsDialog } from './components/settings/settings-dialog';
import { TransferView } from './components/transfer/transfer-view';
import { ThemeProvider } from './providers/theme';

function App() {
  return (
    <ThemeProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <AppShellTopbar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <TransferView />
        </main>
        <HistoryDialog />
        <SettingsDialog />
        <Toaster position="top-right" richColors />
      </div>
    </ThemeProvider>
  );
}

export default App;
