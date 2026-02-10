/** Register all IPC handlers and journal event forwarding. */
import type { MainContext } from './context';
import { registerAppIpc } from './app';
import { registerSettingsIpc } from './settings';
import { registerDatabaseIpc } from './database';
import { registerJournalIpc, registerJournalEventForwarding } from './journal';
import { registerEdsmIpc } from './edsm';
import { registerEdastroRecordsIpc } from './edastro-records';

export function setupIPC(ctx: MainContext): void {
  registerAppIpc(ctx);
  registerSettingsIpc(ctx);
  registerDatabaseIpc(ctx);
  registerJournalIpc(ctx);
  registerEdsmIpc(ctx);
  registerJournalEventForwarding(ctx); // Must run before edastro - journal events are critical for display updates
  registerEdastroRecordsIpc();
}
