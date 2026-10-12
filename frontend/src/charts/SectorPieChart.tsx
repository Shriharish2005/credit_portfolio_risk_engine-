import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../lib/theme';

interface SectorPieChartProps {
  data: Array<{ sector?: string; exposure: number; share: number }>;
}

const SECTOR_PALETTE = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16',
  '#fb923c', '#e879f9',
];

export const SectorPieChart: React.FC<SectorPieChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = data.map((d, i) => ({
    name: d.sector || 'Unassigned',
    value: d.exposure,
    itemStyle: { color: SECTOR_PALETTE[i % SECTOR_PALETTE.length] },
  }));

  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12, fontFamily: 'monospace' },
      formatter: (params: any) => {
        const item = data[params.dataIndex];
        return `<div style="font-family:monospace;line-height:1.6">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${params.color};margin-right:6px"></span>
          <b>${params.name}</b><br/>
          <span style="color:#94a3b8">Exposure:</span> <b>$${(params.value / 1e9).toFixed(2)}B</b><br/>
          <span style="color:#94a3b8">Share:</span> <b>${params.percent}%</b>
        </div>`;
      },
    },
    legend: {
      orient: 'vertical',
      right: '0%',
      top: 'middle',
      textStyle: {
        color: isDark ? '#94a3b8' : '#475569',
        fontSize: 10,
        fontFamily: 'monospace',
      },
      itemWidth: 8,
      itemHeight: 8,
      icon: 'circle',
      itemGap: 8,
    },
    series: [
      {
        name: 'Sector Exposure',
        type: 'pie',
        radius: ['50%', '78%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 5,
          borderColor: isDark ? '#0f172a' : '#f8fafc',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            color: isDark ? '#f1f5f9' : '#0f172a',
            fontFamily: 'monospace',
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0,0,0,0.3)',
          },
        },
        data: chartData,
      },
    ],
  };

  return (
    <div className="w-full h-64">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
    </div>
  );
};
