import { TransferSession } from '@/types/transfer';
import { SendMode } from '@/types/transfer-ui';

const MODE_OPTIONS: Array<{ value: SendMode; labelKey: string; descriptionKey: string }> = [
  { value: 'files', labelKey: 'transfer.send.modes.files.label', descriptionKey: 'transfer.send.modes.files.description' },
  { value: 'text', labelKey: 'transfer.send.modes.text.label', descriptionKey: 'transfer.send.modes.text.description' }
];

const MAX_TEXT_LENGTH = 1_000;
const FINAL_SEND_PHASES: ReadonlyArray<TransferSession['phase']> = ['done', 'failed', 'canceled'];

type SendToggleKey = 'zip' | 'git' | 'noLocal' | 'noMulti' | 'store';

const ADVANCED_SEND_TOGGLES: Array<{ key: SendToggleKey; labelKey: string; descriptionKey: string }> = [
  { key: 'zip', labelKey: 'transfer.common.sessionOptions.zip.label', descriptionKey: 'transfer.common.sessionOptions.zip.description' },
  { key: 'git', labelKey: 'transfer.common.sessionOptions.git.label', descriptionKey: 'transfer.common.sessionOptions.git.description' },
  { key: 'noLocal', labelKey: 'transfer.common.sessionOptions.noLocal.label', descriptionKey: 'transfer.common.sessionOptions.noLocal.description' },
  { key: 'noMulti', labelKey: 'transfer.common.sessionOptions.noMulti.label', descriptionKey: 'transfer.common.sessionOptions.noMulti.description' },
  { key: 'store', labelKey: 'transfer.common.sessionOptions.store.label', descriptionKey: 'transfer.common.sessionOptions.store.description' }
];

export { MODE_OPTIONS, MAX_TEXT_LENGTH, FINAL_SEND_PHASES, ADVANCED_SEND_TOGGLES };
