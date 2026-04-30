export default function Sparkline({
  data,
  width = 120,
  height = 32,
  color = '#4F46E5',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length === 0) return <svg width={width} height={height} />;
  const max = Math.max(...data, 1);
  const min = Math.min(0, ...data);
  const range = max - min || 1;
  const stepX = width / Math.max(data.length - 1, 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(' ');
  const area = `M0,${height} L${points.replace(/,/g, ' ').split(' ').reduce((acc, _, i, arr) => (i % 2 === 0 ? acc + ' L' + arr[i] + ',' + arr[i + 1] : acc), '')} L${width},${height} Z`;
  return (
    <svg width={width} height={height} className="block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}
