/** Body type distribution pie chart and optional data table. */
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BodyTypeDistribution } from './types';
import { getPieColors, CHART_CONTAINER_HEIGHT, TOOLTIP_CONTENT_STYLE } from './constants';

interface StatisticsBodyTypeChartProps {
  sanitizedBodyDist: BodyTypeDistribution[];
  showBodyTable: boolean;
  setShowBodyTable: (fn: (v: boolean) => boolean) => void;
  formatNumber: (num: number) => string;
  formatCredits: (credits: number) => string;
  pieTooltipFormatter: (value: number | undefined, name: string | undefined) => [string, string];
  pieLabelRenderer: (props: { category?: string; percent?: number }) => string;
}

export function StatisticsBodyTypeChart({
  sanitizedBodyDist,
  showBodyTable,
  setShowBodyTable,
  formatNumber,
  formatCredits,
  pieTooltipFormatter,
  pieLabelRenderer,
}: StatisticsBodyTypeChartProps) {
  const pieColors = getPieColors();
  return (
    <figure role="figure" className="card" aria-labelledby="chart-body-type-title" aria-describedby="chart-body-type-desc">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <h2 id="chart-body-type-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Body Type Distribution
          </h2>
        </div>
        <p id="chart-body-type-desc" className="sr-only">
          Pie chart: body type distribution, {sanitizedBodyDist.length} categor{sanitizedBodyDist.length === 1 ? 'y' : 'ies'}.
        </p>
      </div>
      <div className="p-4">
        {sanitizedBodyDist.length === 0 ? (
          <div
            style={{ height: CHART_CONTAINER_HEIGHT }}
            className="flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <p>No body data available</p>
          </div>
        ) : (
          <div style={{ height: CHART_CONTAINER_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sanitizedBodyDist as unknown as Array<Record<string, string | number>>}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="category"
                  label={pieLabelRenderer}
                  labelLine={false}
                >
                  {sanitizedBodyDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length] ?? '#64748b'} />
                  ))}
                </Pie>
                <Tooltip formatter={pieTooltipFormatter} contentStyle={TOOLTIP_CONTENT_STYLE} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {sanitizedBodyDist.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowBodyTable((v) => !v)}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              {showBodyTable ? 'Hide data table' : 'View data as table'}
            </button>
            {showBodyTable && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th scope="col" className="text-left p-2 font-medium">Category</th>
                      <th scope="col" className="text-right p-2 font-medium">Count</th>
                      <th scope="col" className="text-right p-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sanitizedBodyDist.map((row, i) => (
                      <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="p-2">{row.category}</td>
                        <td className="p-2 text-right">{formatNumber(row.count)}</td>
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
