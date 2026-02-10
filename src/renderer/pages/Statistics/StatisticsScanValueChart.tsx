/** Scan value over time area chart and optional data table. */
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ScanValueByDate } from './types';
import { CHART_MARGINS, CHART_CONTAINER_HEIGHT, TOOLTIP_CONTENT_STYLE, getChartColors } from './constants';

interface StatisticsScanValueChartProps {
  sanitizedScanValues: ScanValueByDate[];
  canRenderAreaChart: boolean;
  showScanTable: boolean;
  setShowScanTable: (fn: (v: boolean) => boolean) => void;
  formatCredits: (credits: number) => string;
  formatNumber: (num: number) => string;
  formatDateShort: (value: string | number) => string;
  formatDateMedium: (label: unknown) => string;
  formatYAxisValue: (value: number) => string;
  areaTooltipFormatter: (value: number | undefined) => [string, string];
}

export function StatisticsScanValueChart({
  sanitizedScanValues,
  canRenderAreaChart,
  showScanTable,
  setShowScanTable,
  formatCredits,
  formatNumber,
  formatDateShort,
  formatDateMedium,
  formatYAxisValue,
  areaTooltipFormatter,
}: StatisticsScanValueChartProps) {
  const chartColors = getChartColors();
  const displayData = sanitizedScanValues.slice(-30);

  return (
    <figure role="figure" className="card" aria-labelledby="chart-scan-value-title" aria-describedby="chart-scan-value-desc">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <h2 id="chart-scan-value-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Scan Value Over Time
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Daily exploration earnings</p>
        <p id="chart-scan-value-desc" className="sr-only">
          Area chart: scan value over time, {sanitizedScanValues.length} data point{sanitizedScanValues.length === 1 ? '' : 's'} (last 30 days).
        </p>
      </div>
      <div className="p-4">
        {!canRenderAreaChart ? (
          <div
            style={{ height: CHART_CONTAINER_HEIGHT }}
            className="flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <p>
              {sanitizedScanValues.length === 0
                ? 'No scan data available'
                : 'Not enough data to display chart (need at least 2 points)'}
            </p>
          </div>
        ) : (
          <div style={{ height: CHART_CONTAINER_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={CHART_MARGINS}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.value} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.value} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke, #334155)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  stroke="var(--axis-stroke, #64748b)"
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 'dataMax']}
                  tickFormatter={formatYAxisValue}
                  stroke="var(--axis-stroke, #64748b)"
                  fontSize={11}
                />
                <Tooltip
                  formatter={areaTooltipFormatter}
                  labelFormatter={formatDateMedium}
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColors.value}
                  strokeWidth={2}
                  fill="url(#valueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {canRenderAreaChart && (
          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={() => setShowScanTable((v) => !v)}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              {showScanTable ? 'Hide data table' : 'View data as table'}
            </button>
            {showScanTable && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th scope="col" className="text-left p-2 font-medium">Date</th>
                      <th scope="col" className="text-right p-2 font-medium">Value</th>
                      <th scope="col" className="text-right p-2 font-medium">Bodies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((row, i) => (
                      <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="p-2">{formatDateMedium(row.date)}</td>
                        <td className="p-2 text-right">{formatCredits(row.value)}</td>
                        <td className="p-2 text-right">{formatNumber(row.bodies)}</td>
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
