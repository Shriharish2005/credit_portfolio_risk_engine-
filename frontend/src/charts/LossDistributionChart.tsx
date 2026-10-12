import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../lib/theme';
import { MonteCarloDistributionBin } from '../types';

interface LossDistributionChartProps {
  distribution: MonteCarloDistributionBin[];
  meanLoss: number;
  var95: number;
  var99: number;
  es99: number;
}

export const LossDistributionChart: React.FC<LossDistributionChartProps> = ({
  distribution,
  meanLoss,
  var95,
  var99,
  es99,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const xLabels = distribution.map((d) => `$${(d.bin_start / 1_000_000).toFixed(2)}M`);
  const frequencies = distribution.map((d) => d.frequency);

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const axisLineColor = isDark ? '#334155' : '#cbd5e1';
  const splitLineColor = isDark ? '#1e293b' : '#f1f5f9';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = distribution[params[0].dataIndex];
        if (!item) return '';
        return `
          <div style="font-family: monospace; font-size: 12px; padding: 6px; color: ${isDark ? '#f8fafc' : '#0f172a'}; background: ${isDark ? '#0f172a' : '#ffffff'}; border-radius: 6px;">
            <b style="color: #3b82f6;">Range:</b> $${(item.bin_start / 1e6).toFixed(2)}M - $${(item.bin_end / 1e6).toFixed(2)}M<br/>
            <b style="color: #10b981;">Iterations:</b> ${item.frequency.toLocaleString()}<br/>
            <b style="color: #f59e0b;">Probability:</b> ${(item.probability * 100).toFixed(3)}%
          </div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: {
        color: textColor,
        fontSize: 10,
        interval: Math.max(1, Math.floor(xLabels.length / 8)),
      },
      axisLine: { lineStyle: { color: axisLineColor } },
    },
    yAxis: {
      type: 'value',
      name: 'Frequency',
      nameTextStyle: { color: textColor, fontSize: 11 },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: [
      {
        name: 'Simulated Losses',
        type: 'bar',
        barWidth: '95%',
        data: frequencies,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1d4ed8' },
            ],
          },
          borderRadius: [2, 2, 0, 0],
        },
      },
    ],
  };

  return (
    <div className="w-full h-80">
      <div className="flex items-center justify-end space-x-4 mb-2 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-blue-500 font-semibold">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" /> Mean: ${(meanLoss / 1e6).toFixed(2)}M
        </span>
        <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" /> 95% VaR: ${(var95 / 1e6).toFixed(2)}M
        </span>
        <span className="flex items-center gap-1.5 text-rose-500 font-semibold">
          <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" /> 99% VaR: ${(var99 / 1e6).toFixed(2)}M
        </span>
        <span className="flex items-center gap-1.5 text-purple-500 font-semibold">
          <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm" /> 99% ES: ${(es99 / 1e6).toFixed(2)}M
        </span>
      </div>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
    </div>
  );
};
