import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR, formatINRCompact } from '@/core/format';

/** Line colours follow the theme's marker colours: blue, green, red, yellow, purple. */
export const seriesColors = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#7c3aed'] as const;

export interface ChartLine {
  key: string;
  label: string;
  /** Defaults to the next colour in `seriesColors`. */
  color?: string;
}

interface ToolChartProps {
  data: Array<Record<string, number>>;
  xKey: string;
  lines: ChartLine[];
  xLabel: string;
}

/** A small line chart with a text legend underneath, so colour is never the only cue. */
export function ToolChart({ data, xKey, lines, xLabel }: ToolChartProps) {
  // Very old browsers cannot measure the chart box; they get the result cards and the legend only.
  const canDraw = typeof ResizeObserver !== 'undefined';
  return (
    <div className="stack">
      {canDraw && (
        <div className="card-sm tl-chart" role="img" aria-label={lines.map((l) => l.label).join(', ')}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d6d5cb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} width={74} tickFormatter={(v: number) => formatINRCompact(v)} />
              <Tooltip
                formatter={(value: number, name: string) => [formatINR(value), name]}
                labelFormatter={(x) => `${xLabel} ${x}`}
                contentStyle={{ border: '2px solid #17170f', borderRadius: 12, fontWeight: 800 }}
              />
              {lines.map((line, i) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color ?? seriesColors[i % seriesColors.length]}
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="tl-legend">
        {lines.map((line, i) => (
          <li key={line.key}>
            <span className="tl-swatch" style={{ background: line.color ?? seriesColors[i % seriesColors.length] }} aria-hidden="true" />
            {line.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
