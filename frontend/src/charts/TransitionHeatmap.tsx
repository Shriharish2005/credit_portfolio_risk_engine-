import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../lib/theme';

interface TransitionHeatmapProps {
  ratings: string[];
  matrix: number[][];
}

export const TransitionHeatmap: React.FC<TransitionHeatmapProps> = ({ ratings, matrix }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Transform matrix for ECharts heatmap: [xIndex, yIndex, value]
  const data: Array<[number, number, number]> = [];
  matrix.forEach((row, i) => {
    row.forEach((val, j) => {
      // Invert i so AAA starts from the top
      data.push([j, ratings.length - 1 - i, Number((val * 100).toFixed(2))]);
    });
  });

  const reversedRatings = [...ratings].reverse();

  const textColor = isDark ? '#cbd5e1' : '#475569';
  const mutedTextColor = isDark ? '#94a3b8' : '#64748b';
  const axisLineColor = isDark ? '#334155' : '#cbd5e1';
  const cellBorderColor = isDark ? '#0b0f19' : '#ffffff';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const fromR = ratings[ratings.length - 1 - params.data[1]];
        const toR = ratings[params.data[0]];
        return `
          <div style="font-family: monospace; font-size: 12px; padding: 6px; color: ${isDark ? '#f8fafc' : '#0f172a'}; background: ${isDark ? '#0f172a' : '#ffffff'}; border-radius: 6px;">
            <b>Transition:</b> ${fromR} &rarr; ${toR}<br/>
            <b>Probability:</b> ${params.data[2]}%
          </div>
        `;
      },
    },
    grid: {
      top: '5%',
      bottom: '18%',
      left: '12%',
      right: '6%',
    },
    xAxis: {
      type: 'category',
      data: ratings,
      name: 'Terminal Rating',
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: mutedTextColor, fontSize: 11, fontWeight: 'bold' },
      axisLabel: { color: textColor, fontSize: 11, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: axisLineColor } },
      splitArea: { show: true, areaStyle: { color: ['transparent', isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'] } },
    },
    yAxis: {
      type: 'category',
      data: reversedRatings,
      name: 'Initial Rating',
      nameLocation: 'middle',
      nameGap: 38,
      nameTextStyle: { color: mutedTextColor, fontSize: 11, fontWeight: 'bold' },
      axisLabel: { color: textColor, fontSize: 11, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: axisLineColor } },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 2,
      itemWidth: 14,
      itemHeight: 140,
      text: ['100%', '0%'],
      textStyle: { color: mutedTextColor, fontSize: 10 },
      inRange: {
        color: isDark
          ? ['#0f172a', '#1e3a8a', '#2563eb', '#38bdf8', '#10b981']
          : ['#f8fafc', '#bfdbfe', '#60a5fa', '#2563eb', '#15803d'],
      },
    },
    series: [
      {
        name: 'Transition Prob (%)',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          formatter: (p: any) => (p.data[2] > 0.05 ? `${p.data[2]}%` : ''),
          fontSize: 9,
          color: isDark ? '#ffffff' : '#0f172a',
        },
        itemStyle: {
          borderColor: cellBorderColor,
          borderWidth: 2,
        },
      },
    ],
  };

  return (
    <div className="w-full h-96">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
    </div>
  );
};
