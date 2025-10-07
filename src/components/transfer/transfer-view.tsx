import { SendPanel } from './send-panel';
import { ReceivePanel } from './receive-panel';
import { TransferProgressPanel } from './transfer-progress';

export function TransferView() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      <SendPanel />
      <TransferProgressPanel />
      <ReceivePanel />
    </div>
  );
}
