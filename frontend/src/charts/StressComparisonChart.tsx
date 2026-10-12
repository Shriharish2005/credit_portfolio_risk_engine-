import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../lib/theme';
import { StressScenarioResult } from '../types';

interface StressComparisonChartProps {
  scenarios: StressScenarioResult[];
}

export const StressComparisonChart: React.FC<StressComparisonChartProps> = ({ scenarios }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const scenarioNames = scenarios.map((s) => s.scenario_name);
  const elValues = scenarios.map((s) => Number((s.total_expected_loss / 1_000_000).toFixed(2)));
  const varValues = scenarios.map((s) => Number((s.estimated_var_99 / 1_000_000).toFixed(2)));

  const textColor = isDark ? '#cbd5e1' : '#475569';
  const mutedTextColor = isDark ? '#94a3b8' : '#64748b';
  const axisLineColor = isDark ? '#334155' : '#cbd5e1';
  const splitLineColor = isDark ? '#1e293b' : '#f1f5f9';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['Expected Loss ($M)', 'Estimated 99% VaR ($M)'],
      textStyle: { color: mutedTextColor, fontSize: 11 },
      top: '0%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '18%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: scenarioNames,
      axisLabel: { color: textColor, fontWeight: 'bold', fontSize: 11 },
      axisLine: { lineStyle: { color: axisLineColor } },
    },
    yAxis: {
      type: 'value',
      name: 'Loss ($M)',
      nameTextStyle: { color: mutedTextColor, fontSize: 11 },
      axisLabel: { color: mutedTextColor, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: [
      {
        name: 'Expected Loss ($M)',
        type: 'bar',
        data: elValues,
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Estimated 99% VaR ($M)',
        type: 'bar',
        data: varValues,
        itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return (
    <div className="w-full h-80">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
    </div>
  );
};
