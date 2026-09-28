import { useId, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, CircleDollarSign, Package, Users } from 'lucide-react';
import type { Sale } from '../types';
export type Metric = { label: string; value: string | number; note: string; tone?: 'ink' | 'lilac' | 'mint' | 'peach'; onClick?: () => void };
const icons = [CircleDollarSign, BarChart3, Package, Users];
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return <div className="widget-metrics">{metrics.map((metric, index) => {
    const Icon = icons[index % icons.length];
    const content = <><div className="metric-top"><span>{metric.label}</span><Icon size={17} /></div><strong className="metric-value">{metric.value}</strong><div className="metric-bottom"><span>{metric.note}</span>{metric.onClick && <ArrowUpRight size={17}/>}</div></>;
    return metric.onClick ? <button key={metric.label} className={`metric-widget tone-${metric.tone || 'lilac'}`} onClick={metric.onClick}>{content}</button> : <article key={metric.label} className={`metric-widget tone-${metric.tone || 'lilac'}`}>{content}</article>;
  })}</div>;
}
export function RevenueWidget({ sales, formatCurrency, title = 'Sales analytics' }: { sales: Sale[]; formatCurrency: (n: number) => string; title?: string }) {
  const [period, setPeriod] = useState<'month' | 'day'>('day');
  const id = useId();
  const completed = sales.filter(sale => !sale.restoredAt);
  const points = useMemo(() => {
    const totals = new Map<string, { amount: number; units: number }>();
    completed.forEach(sale => {
      const date = sale.saleDate.slice(0, period === 'month' ? 7 : 10);
      const prev = totals.get(date) || { amount: 0, units: 0 };
      totals.set(date, { amount: prev.amount + sale.soldPrice, units: prev.units + (sale.quantity ?? 1) });
    });
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [sales, period]);
  const max = Math.max(1, ...points.map(([, data]) => data.amount));
  const total = completed.reduce((sum, sale) => sum + sale.soldPrice, 0);
  return <section className="workspace-widget revenue-widget" aria-labelledby={id}>
    <div className="widget-heading"><div><span className="widget-eyebrow">PERFORMANCE</span><h2 id={id}>{title}</h2></div><select aria-label={`${title} grouping`} value={period} onChange={event => setPeriod(event.target.value as 'month' | 'day')}><option value="month">By month</option><option value="day">By day</option></select></div>
    <div className="chart-summary"><strong>{formatCurrency(total)}</strong><span>Completed revenue in this selection</span></div>
    {points.length ? <><div className="widget-chart" role="img" aria-label={`Revenue for the latest ${points.length} recorded ${period === 'month' ? 'months' : 'days'}. Exact values are in chart details.`}>{points.map(([date, data]) => <div className="widget-bar-column" key={date}><div className="widget-bar-track"><div className="widget-bar" style={{ height: `${data.amount / max * 100}%` }} title={`${date}: ${formatCurrency(data.amount)} · ${data.units} units`} /></div><span>{period === 'month' ? new Date(`${date}-01T12:00:00`).toLocaleDateString('en', { month: 'short', year: '2-digit' }) : date.slice(5)}</span></div>)}</div><details className="chart-details"><summary>Chart details · latest {points.length} recorded {period === 'month' ? 'months' : 'days'}</summary><div>{points.map(([date, data]) => <p key={date}><span>{date} · {data.units} units</span><strong>{formatCurrency(data.amount)}</strong></p>)}</div></details></> : <div className="widget-empty"><BarChart3 size={32}/><p>Your sales chart will appear here.</p><span>No completed sales in this selection.</span></div>}
  </section>;
}
const palette = ['#9d8ad2', '#33443e', '#b7dace', '#efcbbb', '#d8dde5'];
export function BreakdownWidget({ title, subtitle, rows, formatValue = (n: number) => String(n) }: { title: string; subtitle: string; rows: { label: string; value: number }[]; formatValue?: (n: number) => string }) {
  const id = useId();
  const sorted = rows.filter(row => row.value > 0).sort((a,b) => b.value - a.value);
  const values = sorted.length > 5 ? [...sorted.slice(0,4), { label: 'Other', value: sorted.slice(4).reduce((sum,row) => sum + row.value,0) }] : sorted;
  const total = values.reduce((sum,row) => sum + row.value,0);
  let position = 0;
  const stops = values.map((row,index) => { const start = position; position += row.value / total * 100; return `${palette[index]} ${start}% ${position}%`; });
  return <section className="workspace-widget breakdown-widget" aria-labelledby={id}><div className="widget-heading"><div><span className="widget-eyebrow">BREAKDOWN</span><h2 id={id}>{title}</h2></div><ArrowUpRight size={19}/></div><p className="widget-description">{subtitle}</p>{total ? <><div className="widget-donut" role="img" aria-label={`${title}: ${values.map(row => `${row.label} ${Math.round(row.value / total * 100)}%`).join(', ')}`} style={{ background: `conic-gradient(${stops.join(',')})` }}><div><strong>{values.length}</strong><span>groups</span></div></div><div className="widget-legend">{values.map((row,index) => <div key={row.label}><span style={{ background: palette[index] }}/><span>{row.label}</span><strong>{formatValue(row.value)}</strong></div>)}</div></> : <div className="widget-empty"><Package size={30}/><p>No data in this selection yet.</p></div>}</section>;
}
export function SalesWidgets({ sales, formatCurrency }: { sales: Sale[]; formatCurrency: (n: number) => string }) {
  const categories = new Map<string, number>();
  sales.filter(sale => !sale.restoredAt).forEach(sale => categories.set(sale.categoryName || 'Uncategorised', (categories.get(sale.categoryName || 'Uncategorised') || 0) + sale.soldPrice));
  return <div className="widget-analytics"><RevenueWidget sales={sales} formatCurrency={formatCurrency}/><BreakdownWidget title="Category revenue" subtitle="Revenue share from completed sales" rows={[...categories].map(([label,value]) => ({ label,value }))} formatValue={formatCurrency}/></div>;
}
