import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../lib/theme';

interface RocChartProps {
  rocCurve: Array<{ fpr: number; tpr: number }>;
  auc: number;
  gini: number;
}

export const RocChart: React.FC<RocChartProps> = ({ rocCurve, auc, gini }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const modelPoints = rocCurve.map((p) => [p.fpr, p.tpr]);
  const diagonalPoints = [
    [0, 0],
    [1, 1],
  ];

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const splitLineColor = isDark ? '#1e293b' : '#f1f5f9';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const pt = params[0].data;
        return `
          <div style="font-family: monospace; font-size: 12px; padding: 6px; color: ${isDark ? '#f8fafc' : '#0f172a'}; background: ${isDark ? '#0f172a' : '#ffffff'}; border-radius: 6px;">
            <b>FPR (1 - Specificity):</b> ${pt[0]}<br/>
            <b>TPR (Sensitivity):</b> ${pt[1]}
          </div>
        `;
      },
    },
    grid: {
      left: '4%',
      right: '6%',
      bottom: '10%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'False Positive Rate',
      min: 0,
      max: 1,
      nameTextStyle: { color: textColor, fontSize: 11 },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    yAxis: {
      type: 'value',
      name: 'True Positive Rate',
      min: 0,
      max: 1,
      nameTextStyle: { color: textColor, fontSize: 11 },
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: [
      {
        name: 'Model ROC',
        type: 'line',
        smooth: true,
        data: modelPoints,
        lineStyle: { color: '#3b82f6', width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.0)' },
            ],
          },
        },
        showSymbol: false,
      },
      {
        name: 'Random Chance',
        type: 'line',
        data: diagonalPoints,
        lineStyle: { color: isDark ? '#64748b' : '#94a3b8', type: 'dashed', width: 1.5 },
        showSymbol: false,
      },
    ],
  };

  return (
    <div className="w-full h-80">
      <div className="flex items-center justify-end space-x-4 mb-1 text-xs font-mono">
        <span className="text-emerald-500 font-semibold">ROC-AUC: {auc}</span>
        <span className="text-blue-500 font-semibold">Gini (AR): {gini}</span>
      </div>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
    </div>
  );
};
