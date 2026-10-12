import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../lib/theme';

interface RatingBarChartProps {
  data: Array<{ rating?: string; exposure: number; share: number }>;
}

const RATING_CONFIG: Record<string, { color: string; dark: string }> = {
  AAA: { color: '#10b981', dark: '#34d399' },
  AA:  { color: '#059669', dark: '#2dd4a6' },
  A:   { color: '#0ea5e9', dark: '#38bdf8' },
  BBB: { color: '#6366f1', dark: '#818cf8' },
  BB:  { color: '#f59e0b', dark: '#fbbf24' },
  B:   { color: '#f97316', dark: '#fb923c' },
  CCC: { color: '#ef4444', dark: '#f87171' },
  D:   { color: '#dc2626', dark: '#ef4444' },
};

export const RatingBarChart: React.FC<RatingBarChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const ratings = data.map((d) => d.rating || 'N/A');
  const values = data.map((d) => Number((d.exposure / 1_000_000).toFixed(2)));

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const splitLineColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12, fontFamily: 'monospace' },
      formatter: (params: any) => {
        const item = data[params[0].dataIndex];
        const pct = (item.share * 100).toFixed(2);
        const exp = (item.exposure / 1e9).toFixed(2);
        return `<div style="font-family:monospace;line-height:1.6">
          <b style="font-size:13px">${item.rating}</b><br/>
          <span style="color:${textColor}">Exposure:</span> <b>$${exp}B</b><br/>
          <span style="color:${textColor}">Share:</span> <b>${pct}%</b>
        </div>`;
      },
    },
    grid: { left: '2%', right: '2%', bottom: '8%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ratings,
      axisLabel: {
        color: isDark ? '#94a3b8' : '#475569',
        fontWeight: '700',
        fontSize: 12,
        fontFamily: 'monospace',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'Exposure ($M)',
      nameTextStyle: { color: textColor, fontSize: 10, fontFamily: 'monospace' },
      axisLabel: {
        color: textColor,
        fontSize: 10,
        fontFamily: 'monospace',
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`,
      },
      splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Exposure',
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: (RATING_CONFIG[ratings[i]] || RATING_CONFIG['BBB'])[isDark ? 'dark' : 'color'] },
                { offset: 1, color: (RATING_CONFIG[ratings[i]] || RATING_CONFIG['BBB'])[isDark ? 'dark' : 'color'] + '55' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: (RATING_CONFIG[ratings[i]] || RATING_CONFIG['BBB'])[isDark ? 'dark' : 'color'],
            },
          },
        })),
        barMaxWidth: 48,
        showBackground: true,
        backgroundStyle: {
          color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  return (
    <div className="w-full h-64">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
    </div>
  );
};
