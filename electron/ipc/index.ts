import type { AppIpcContext } from './context';
import { registerAppHandlers } from './modules/app';
import { registerCrocHandlers } from './modules/croc';
import { registerHistoryHandlers } from './modules/history';
import { registerSettingsHandlers } from './modules/settings';

let initialized = false;

export function setupIpcHandlers(context: AppIpcContext) {
  if (initialized) return;
  initialized = true;
  registerAppHandlers(context);
  registerCrocHandlers(context);
  registerHistoryHandlers(context);
  registerSettingsHandlers(context);
}
