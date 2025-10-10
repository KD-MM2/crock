import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import { SendPanel } from './send-panel';
import { ReceivePanel } from './receive-panel';
import { TransferProgressPanel } from './transfer-progress';

export function TransferView() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      <Tabs defaultValue="send" className="flex flex-1 flex-col gap-4">
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
