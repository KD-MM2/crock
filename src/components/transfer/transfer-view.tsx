import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import SendPanel from './send-panel';
import ReceivePanel from './receive-panel';
import { TransferProgressPanel } from './transfer-progress';
import { useUiStore } from '@/stores/ui';
import { getWindowApi } from '@/lib/window-api';
import { useEffect } from 'react';

export function TransferView() {
  const { t } = useTranslation();
  const activeTransferTab = useUiStore((state) => state.activeTransferTab);
  const setActiveTransferTab = useUiStore((state) => state.setActiveTransferTab);

  useEffect(() => {
    const api = getWindowApi();
    const unsubscribe = api.events.on('deep-link:receive', (data) => {
      console.log('[TransferView] Received deep link:', data);

      // Store the deep link data first
      useUiStore.getState().setPendingDeepLink(data);

      // Then switch to the appropriate tab
      if (data.action === 'receive') {
        useUiStore.getState().setActiveTransferTab('receive');
      } else if (data.action === 'send') {
        useUiStore.getState().setActiveTransferTab('send');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      <Tabs value={activeTransferTab} onValueChange={(value: string) => setActiveTransferTab(value)} className="flex flex-1 flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="send">{t('transfer.tabs.send')}</TabsTrigger>
          <TabsTrigger value="receive">{t('transfer.tabs.receive')}</TabsTrigger>
        </TabsList>
        <TabsContent value="send" className="flex-1">
          <SendPanel />
        </TabsContent>
        <TabsContent value="receive" className="flex-1">
          <ReceivePanel />
        </TabsContent>
      </Tabs>
      <TransferProgressPanel />
    </div>
  );
}
