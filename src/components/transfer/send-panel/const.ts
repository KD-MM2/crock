import { TransferSession } from '@/types/transfer';
import { SendMode } from '@/types/transfer-ui';

const MODE_OPTIONS: Array<{ value: SendMode; labelKey: string; descriptionKey: string }> = [
  { value: 'files', labelKey: 'transfer.send.modes.files.label', descriptionKey: 'transfer.send.modes.files.description' },
  { value: 'text', labelKey: 'transfer.send.modes.text.label', descriptionKey: 'transfer.send.modes.text.description' }
];

const MAX_TEXT_LENGTH = 1_000;
const FINAL_SEND_PHASES: ReadonlyArray<TransferSession['phase']> = ['done', 'failed', 'canceled'];

export { MODE_OPTIONS, MAX_TEXT_LENGTH, FINAL_SEND_PHASES };
