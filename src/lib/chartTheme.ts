export const CHART_PALETTE = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--foreground) / 0.76)',
  'hsl(var(--muted-foreground) / 0.9)',
] as const;

export const chartAxisStyle = {
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  fill: 'hsl(var(--foreground) / 0.72)',
} as const;

export const chartTooltipStyle = {
  borderRadius: '18px',
  border: '1px solid hsl(var(--border) / 0.56)',
  background: 'hsl(var(--popover) / 0.94)',
  boxShadow: '0 20px 50px hsl(var(--background) / 0.34)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  color: 'hsl(var(--popover-foreground))',
  backdropFilter: 'blur(18px)',
} as const;

export const chartGridStroke = 'hsl(var(--border) / 0.4)';

export const chartLegendStyle = {
  color: 'hsl(var(--foreground) / 0.84)',
} as const;
