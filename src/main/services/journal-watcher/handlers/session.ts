/**
 * Session lifecycle: LoadGame, Continued, Shutdown, Rank, Progress, Reputation, Powerplay, Promotion.
 */
import type { LoadGameEvent, ContinuedEvent, RankEvent, ProgressEvent, ReputationEvent, PowerplayEvent, PromotionEvent } from '../../../../shared/types';
import type { JournalWatcherContext } from './context';
import { logInfo, logDebug, isDev } from '../../../logger';

export async function handleLoadGame(
  ctx: JournalWatcherContext,
  event: LoadGameEvent,
  isBackfill: boolean
): Promise<void> {
  ctx.setGameState({
    isRunning: true,
    commander: event.Commander,
    gameMode: event.GameMode,
    ship: event.Ship_Localised || event.Ship,
    isOdyssey: event.Odyssey ?? false,
    isHorizons: event.Horizons ?? false,
  });

  // Update commander info from LoadGame
  const prev = ctx.getCommanderState();
  ctx.setCommanderState({
    ...prev,
    name: event.Commander,
    credits: event.Credits ?? 0,
    loan: event.Loan ?? 0,
    ship: event.Ship_Localised || event.Ship,
    shipName: event.ShipName || null,
    shipIdent: event.ShipIdent || null,
  });

  logDebug(
    'JournalWatcher',
    isDev()
      ? `Game loaded: Commander ${event.Commander} in ${event.GameMode} mode`
      : 'Game loaded'
  );

  if (!isBackfill) {
    const state = ctx.getGameState();
    ctx.emit('game-started', {
      commander: event.Commander,
      gameMode: event.GameMode,
      ship: state.ship,
      isOdyssey: state.isOdyssey,
      timestamp: event.timestamp,
    });
    ctx.emit('commander-updated', ctx.getCommanderState());
  }
}

export async function handleRank(
  ctx: JournalWatcherContext,
  event: RankEvent,
  isBackfill: boolean
): Promise<void> {
  const prev = ctx.getCommanderState();
  ctx.setCommanderState({
    ...prev,
    ranks: {
      combat: event.Combat,
      trade: event.Trade,
      explore: event.Explore,
      soldier: event.Soldier,
      exobiologist: event.Exobiologist,
      empire: event.Empire,
      federation: event.Federation,
      cqc: event.CQC,
    },
  });

  logDebug('JournalWatcher', 'Ranks updated');

  if (!isBackfill) {
    ctx.emit('commander-updated', ctx.getCommanderState());
  }
}

export async function handleProgress(
  ctx: JournalWatcherContext,
  event: ProgressEvent,
  isBackfill: boolean
): Promise<void> {
  const prev = ctx.getCommanderState();
  ctx.setCommanderState({
    ...prev,
    progress: {
      combat: event.Combat,
      trade: event.Trade,
      explore: event.Explore,
      soldier: event.Soldier,
      exobiologist: event.Exobiologist,
      empire: event.Empire,
      federation: event.Federation,
      cqc: event.CQC,
    },
  });

  logDebug('JournalWatcher', 'Progress updated');

  if (!isBackfill) {
    ctx.emit('commander-updated', ctx.getCommanderState());
  }
}

export async function handleReputation(
  ctx: JournalWatcherContext,
  event: ReputationEvent,
  isBackfill: boolean
): Promise<void> {
  const prev = ctx.getCommanderState();
  ctx.setCommanderState({
    ...prev,
    reputation: {
      empire: event.Empire,
      federation: event.Federation,
      alliance: event.Alliance,
      independent: event.Independent,
    },
  });

  logDebug('JournalWatcher', 'Reputation updated');

  if (!isBackfill) {
    ctx.emit('commander-updated', ctx.getCommanderState());
  }
}

export async function handlePowerplay(
  ctx: JournalWatcherContext,
  event: PowerplayEvent,
  isBackfill: boolean
): Promise<void> {
  const prev = ctx.getCommanderState();
  ctx.setCommanderState({
    ...prev,
    powerplay: {
      power: event.Power,
      rank: event.Rank,
      merits: event.Merits,
      timePledged: event.TimePledged,
    },
  });

  logDebug('JournalWatcher', isDev() ? `Powerplay: pledged to ${event.Power} (Rank ${event.Rank})` : 'Powerplay updated');

  if (!isBackfill) {
    ctx.emit('commander-updated', ctx.getCommanderState());
  }
}

export async function handlePromotion(
  ctx: JournalWatcherContext,
  event: PromotionEvent,
  isBackfill: boolean
): Promise<void> {
  const prev = ctx.getCommanderState();
  if (!prev.ranks) return;

  // Promotion event contains only the rank that changed (e.g. { "Combat": 7 })
  const updated = { ...prev.ranks };
  if (event.Combat !== undefined) updated.combat = event.Combat;
  if (event.Trade !== undefined) updated.trade = event.Trade;
  if (event.Explore !== undefined) updated.explore = event.Explore;
  if (event.Soldier !== undefined) updated.soldier = event.Soldier;
  if (event.Exobiologist !== undefined) updated.exobiologist = event.Exobiologist;
  if (event.Empire !== undefined) updated.empire = event.Empire;
  if (event.Federation !== undefined) updated.federation = event.Federation;
  if (event.CQC !== undefined) updated.cqc = event.CQC;

  ctx.setCommanderState({ ...prev, ranks: updated });

  logDebug('JournalWatcher', 'Promotion received');

  if (!isBackfill) {
    ctx.emit('commander-updated', ctx.getCommanderState());
  }
}

export async function handleContinued(
  ctx: JournalWatcherContext,
  event: ContinuedEvent
): Promise<void> {
  logInfo('JournalWatcher', `Journal continued in part ${event.Part}`);
  ctx.emit('journal-continued', {
    part: event.Part,
    timestamp: event.timestamp,
  });
}

export async function handleShutdown(ctx: JournalWatcherContext): Promise<void> {
  ctx.setGameState({
    ...ctx.getGameState(),
    isRunning: false,
  });
  logInfo('JournalWatcher', 'Game shutdown detected');
  ctx.emit('game-stopped', {
    timestamp: new Date().toISOString(),
  });
}
