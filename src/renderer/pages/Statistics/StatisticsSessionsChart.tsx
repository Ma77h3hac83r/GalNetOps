/** Recent sessions bar chart and optional data table. */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SessionDiscovery } from './types';
import { CHART_MARGINS, CHART_CONTAINER_HEIGHT, TOOLTIP_CONTENT_STYLE, getChartColors } from './constants';

interface StatisticsSessionsChartProps {
  sanitizedSessions: SessionDiscovery[];
  showSessionsTable: boolean;
  setShowSessionsTable: (fn: (v: boolean) => boolean) => void;
  formatNumber: (num: number) => string;
  formatCredits: (credits: number) => string;
  formatDateShort: (value: string | number) => string;
  formatDateLabel: (label: unknown) => string;
  sessionTooltipFormatter: (value: number | undefined, name: string | undefined) => [string, string];
}

export function StatisticsSessionsChart({
  sanitizedSessions,
  showSessionsTable,
  setShowSessionsTable,
  formatNumber,
  formatCredits,
  formatDateShort,
  formatDateLabel,
  sessionTooltipFormatter,
}: StatisticsSessionsChartProps) {
  const chartColors = getChartColors();
  const displaySessions = sanitizedSessions.slice(0, 10).reverse();

  return (
    <figure role="figure" className="card" aria-labelledby="chart-sessions-title" aria-describedby="chart-sessions-desc">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 id="chart-sessions-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Recent Sessions
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Systems visited per session</p>
        <p id="chart-sessions-desc" className="sr-only">
          Bar chart: last {Math.min(10, sanitizedSessions.length)} session{sanitizedSessions.length === 1 ? '' : 's'}, systems and first discoveries per session.
        </p>
      </div>
      <div className="p-4">
        {sanitizedSessions.length === 0 ? (
          <div
            style={{ height: CHART_CONTAINER_HEIGHT }}
            className="flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <p>No session data available</p>
          </div>
        ) : (
          <div style={{ height: CHART_CONTAINER_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displaySessions} margin={CHART_MARGINS}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke, #334155)" opacity={0.3} />
                <XAxis
                  dataKey="startTime"
                  tickFormatter={formatDateShort}
                  stroke="var(--axis-stroke, #64748b)"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis domain={[0, 'auto']} stroke="var(--axis-stroke, #64748b)" fontSize={11} />
                <Tooltip
                  formatter={sessionTooltipFormatter}
                  labelFormatter={formatDateLabel}
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                />
                <Legend />
                <Bar dataKey="systems" name="Systems" fill={chartColors.systems} radius={[4, 4, 0, 0]} />
                <Bar dataKey="firstDiscoveries" name="First Discoveries" fill={chartColors.discoveries} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {sanitizedSessions.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowSessionsTable((v) => !v)}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              {showSessionsTable ? 'Hide data table' : 'View data as table'}
            </button>
            {showSessionsTable && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th scope="col" className="text-left p-2 font-medium">Session start</th>
                      <th scope="col" className="text-right p-2 font-medium">Systems</th>
                      <th scope="col" className="text-right p-2 font-medium">First discoveries</th>
                      <th scope="col" className="text-right p-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displaySessions.map((row, i) => (
                      <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="p-2">{formatDateLabel(row.startTime)}</td>
                        <td className="p-2 text-right">{formatNumber(row.systems)}</td>
                        <td className="p-2 text-right">{formatNumber(row.firstDiscoveries)}</td>
                        <td className="p-2 text-right">{formatCredits(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
