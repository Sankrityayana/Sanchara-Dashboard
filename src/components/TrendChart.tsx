export function TrendChart({
  title,
  data,
  unit,
  color
}: {
  title: string;
  data: number[];
  unit: string;
  color: string;
}) {
  const width = 520;
  const height = 180;
  const padding = 18;
  const minValue = Math.min(...data, 0);
  const maxValue = Math.max(...data, 1);
  const range = Math.max(maxValue - minValue, 1);
  const points = data
    .map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const latest = data.at(-1) ?? 0;

  return (
    <article className="trend-panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        <span>
          {latest.toFixed(1)} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <polyline className="chart-gridline" points={`0,${height - padding} ${width},${height - padding}`} />
        <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeWidth="4" />
      </svg>
    </article>
  );
}
