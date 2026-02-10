/** Commander info panel: CMDR name + credits, ship type + name, ranks + progress + reputation + powerplay. */
import { useCommanderInfo } from '../stores/appStore';
import { getRankName, formatCredits, getReputationLevel, getPowerplayRating } from '@shared/rankNames';

/** Color class for a reputation level. */
function reputationColorClass(level: string): string {
  switch (level) {
    case 'Allied': return 'text-cyan-500 dark:text-cyan-400';
    case 'Friendly': return 'text-green-500 dark:text-green-400';
    case 'Cordial': return 'text-lime-500 dark:text-lime-400';
    case 'Neutral': return 'text-yellow-500 dark:text-yellow-400';
    case 'Unfriendly': return 'text-orange-500 dark:text-orange-400';
    case 'Hostile': return 'text-red-500 dark:text-red-400';
    default: return 'text-slate-400 dark:text-slate-500';
  }
}

/** Render a single rank chip: label, name, progress bar + percent. */
function RankChip({ label, rankKey, ranks, progress }: {
  label: string;
  rankKey: 'combat' | 'trade' | 'explore' | 'soldier' | 'exobiologist' | 'cqc';
  ranks: NonNullable<ReturnType<typeof useCommanderInfo>>['ranks'];
  progress: NonNullable<ReturnType<typeof useCommanderInfo>>['progress'];
}) {
  if (!ranks) return null;
  const rankLevel = ranks[rankKey];
  const rankName = getRankName(rankKey, rankLevel);
  const prog = progress?.[rankKey] ?? 0;
  const isElite = rankName.startsWith('Elite');
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${rankName} (${prog}%)`}>
      <span className="text-[15px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-[15px] font-medium ${isElite ? 'text-amber-500 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
        {rankName}
      </span>
      {!isElite && (
        <span className="text-[15px] text-slate-400 dark:text-slate-500 tabular-nums">{prog}%</span>
      )}
    </div>
  );
}

function CommanderInfo() {
  const cmdr = useCommanderInfo();

  if (!cmdr?.name) return null;

  return (
    <div className="flex flex-col items-end gap-1.5 text-right min-w-0">
      {/* Row 1: CMDR Name - Credits */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span className="text-[21px] font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
          CMDR {cmdr.name}
        </span>
        <span className="text-[21px] text-amber-600 dark:text-amber-400 font-medium tabular-nums whitespace-nowrap leading-tight">
          {formatCredits(cmdr.credits)}
        </span>
      </div>

      {/* Row 2: Ship type - Ship name */}
      {cmdr.ship && (
        <div className="flex items-center gap-1.5 text-lg text-slate-500 dark:text-slate-400 truncate">
          <span className="font-medium text-slate-600 dark:text-slate-300">{cmdr.ship}</span>
          {cmdr.shipName && (
            <>
              <span className="text-slate-300 dark:text-slate-600">-</span>
              <span className="italic truncate">{cmdr.shipName}</span>
            </>
          )}
          {cmdr.shipIdent && (
            <span className="text-[15px] text-slate-400 dark:text-slate-500">[{cmdr.shipIdent}]</span>
          )}
        </div>
      )}

      {/* Rank line 1: Explorer, Exobiologist, Trade */}
      {cmdr.ranks && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 justify-end">
          <RankChip label="Explorer" rankKey="explore" ranks={cmdr.ranks} progress={cmdr.progress} />
          <RankChip label="Exobiologist" rankKey="exobiologist" ranks={cmdr.ranks} progress={cmdr.progress} />
          <RankChip label="Trade" rankKey="trade" ranks={cmdr.ranks} progress={cmdr.progress} />
        </div>
      )}

      {/* Rank line 2: Combat, Mercenary, CQC */}
      {cmdr.ranks && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 justify-end">
          <RankChip label="Combat" rankKey="combat" ranks={cmdr.ranks} progress={cmdr.progress} />
          <RankChip label="Mercenary" rankKey="soldier" ranks={cmdr.ranks} progress={cmdr.progress} />
          <RankChip label="CQC" rankKey="cqc" ranks={cmdr.ranks} progress={cmdr.progress} />
        </div>
      )}

      {/* Federation / Empire / Alliance — rank + reputation on one line */}
      {(cmdr.ranks || cmdr.reputation) && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 justify-end text-[15px]">
          {/* Federation: naval rank + progress + reputation */}
          {(() => {
            const fedRank = cmdr.ranks ? getRankName('federation', cmdr.ranks.federation) : null;
            const fedProg = cmdr.progress?.federation ?? 0;
            const fedRep = cmdr.reputation?.federation;
            const fedLevel = fedRep != null ? getReputationLevel(fedRep) : null;
            if (!fedRank && fedLevel == null) return null;
            return (
              <div className="flex items-center gap-1.5" title={`Federation: ${fedRank ?? ''}${fedProg ? ` (${fedProg}%)` : ''} — Rep: ${fedRep?.toFixed(1) ?? '?'}% (${fedLevel ?? '?'})`}>
                <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Federation</span>
                {fedRank && fedRank !== 'None' && (
                  <span className="font-medium text-slate-600 dark:text-slate-300">{fedRank}</span>
                )}
                {fedRank && fedRank !== 'None' && (
                  <span className="text-slate-400 dark:text-slate-500 tabular-nums">{fedProg}%</span>
                )}
                {fedLevel && (
                  <span className={`font-medium ${reputationColorClass(fedLevel)}`}>{fedLevel}</span>
                )}
              </div>
            );
          })()}

          {/* Empire: naval rank + progress + reputation */}
          {(() => {
            const empRank = cmdr.ranks ? getRankName('empire', cmdr.ranks.empire) : null;
            const empProg = cmdr.progress?.empire ?? 0;
            const empRep = cmdr.reputation?.empire;
            const empLevel = empRep != null ? getReputationLevel(empRep) : null;
            if (!empRank && empLevel == null) return null;
            return (
              <div className="flex items-center gap-1.5" title={`Empire: ${empRank ?? ''}${empProg ? ` (${empProg}%)` : ''} — Rep: ${empRep?.toFixed(1) ?? '?'}% (${empLevel ?? '?'})`}>
                <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Empire</span>
                {empRank && empRank !== 'None' && (
                  <span className="font-medium text-slate-600 dark:text-slate-300">{empRank}</span>
                )}
                {empRank && empRank !== 'None' && (
                  <span className="text-slate-400 dark:text-slate-500 tabular-nums">{empProg}%</span>
                )}
                {empLevel && (
                  <span className={`font-medium ${reputationColorClass(empLevel)}`}>{empLevel}</span>
                )}
              </div>
            );
          })()}

          {/* Alliance: reputation only (no naval rank) */}
          {(() => {
            const alliRep = cmdr.reputation?.alliance;
            const alliLevel = alliRep != null ? getReputationLevel(alliRep) : null;
            if (alliLevel == null) return null;
            return (
              <div className="flex items-center gap-1.5" title={`Alliance Reputation: ${alliRep?.toFixed(1) ?? '?'}% (${alliLevel})`}>
                <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Alliance</span>
                <span className={`font-medium ${reputationColorClass(alliLevel)}`}>{alliLevel}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Powerplay — own line */}
      {cmdr.powerplay && (
        <div className="flex items-center gap-1.5 justify-end text-[15px]" title={`Powerplay: ${cmdr.powerplay.power} - ${getPowerplayRating(cmdr.powerplay.rank)} (${cmdr.powerplay.merits.toLocaleString()} merits)`}>
          <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Powerplay</span>
          <span className="font-medium text-purple-500 dark:text-purple-400">
            {cmdr.powerplay.power}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {getPowerplayRating(cmdr.powerplay.rank)}
          </span>
          <span className="text-slate-400 dark:text-slate-500 tabular-nums">
            {cmdr.powerplay.merits.toLocaleString()} merits
          </span>
        </div>
      )}
    </div>
  );
}

export default CommanderInfo;
