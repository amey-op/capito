import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';

interface LevelChartProps {
  data: Array<{ level: number; pct: number | null }>;
  color: string;
  /** Short accessible name; the same numbers are listed as text under the chart. */
  label: string;
  /** Short axis label for a level, from i18n. */
  tick: (level: number) => string;
}

/** 0–100% bar per level. Very old browsers (no ResizeObserver) get only the text list. */
export function LevelChart({ data, color, label, tick }: LevelChartProps) {
  if (typeof ResizeObserver === 'undefined') return null;
  const rows = data.map((d) => ({ name: tick(d.level), pct: d.pct ?? 0, empty: d.pct === null }));
  return (
    <div className="ngo-chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d5cb" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800 }} tickLine={false} interval={0} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 10 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
          <Bar dataKey="pct" isAnimationActive={false} stroke="#17170f" strokeWidth={2} radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.name} fill={r.empty ? '#f1f0e8' : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
