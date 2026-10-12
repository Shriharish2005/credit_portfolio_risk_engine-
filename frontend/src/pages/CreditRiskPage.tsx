import React, { useEffect, useState } from 'react';
import { Calculator, Shield, Layers } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { riskApi } from '../services/api';
import { RiskDistributions } from '../types';
import { useTheme } from '../lib/theme';

export const CreditRiskPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [distributions, setDistributions] = useState<RiskDistributions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Live Risk Calculator State
  const [pdInput, setPdInput] = useState<number>(0.025);
  const [lgdInput, setLgdInput] = useState<number>(0.45);
  const [eadInput, setEadInput] = useState<number>(1_000_000);
  const [calculatedEL, setCalculatedEL] = useState<number>(11250);

  useEffect(() => {
    riskApi.getRiskDistributions()
      .then((data) => {
        setDistributions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCalculate = async () => {
    try {
      const res = await riskApi.calculateSingleEL(pdInput, lgdInput, eadInput);
      setCalculatedEL(res.expected_loss);
    } catch {
      setCalculatedEL(pdInput * lgdInput * eadInput);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [pdInput, lgdInput, eadInput]);

  if (loading) return <LoadingSpinner message="Evaluating credit risk parameter distributions across 50,000 facilities..." />;

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const axisLineColor = isDark ? '#334155' : '#cbd5e1';
  const splitLineColor = isDark ? '#1e293b' : '#f1f5f9';

  // Helper chart generator for binned parameter distributions
  const makeDistChartOption = (dist: Array<{ bin: string; count: number }>, color: string, title: string) => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        return `
          <div style="font-family: monospace; font-size: 11px; padding: 4px; color: ${isDark ? '#f8fafc' : '#0f172a'}; background: ${isDark ? '#0f172a' : '#ffffff'}; border-radius: 6px;">
            <span style="color: ${textColor}">Bin Range:</span> <b>${item.name}</b><br/>
            <span style="color: ${color}">Facility Count:</span> <b>${item.value.toLocaleString()}</b>
          </div>
        `;
      }
    },
    grid: { left: '3%', right: '3%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dist.map((d) => d.bin),
      axisLabel: { color: textColor, fontSize: 9, rotate: 30 },
      axisLine: { lineStyle: { color: axisLineColor } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: [
      {
        name: title,
        type: 'bar',
        data: dist.map((d) => d.count),
        itemStyle: {
          color: color,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  });

  return (
    <div className="space-y-7 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-cyan-500 tracking-wider uppercase font-semibold">
              BASEL IRB PARAMETER MODELING
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground font-mono">PILLAR 1 PROVISIONS</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            PD / LGD / EAD Risk Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single loan expected loss simulation, collateral haircut adjustments, and empirical parameter distributions
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-muted/40 px-3 py-1.5 rounded-xl border border-border text-foreground">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>IFRS 9 Stage 1 / Basel IRB</span>
        </div>
      </div>

      {/* Interactive Facility Risk Calculator */}
      <div className="risk-card p-6 border-primary/20">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Interactive Loan Facility Loss Simulator
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">Formula: Expected Loss = PD × LGD × EAD</p>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
            Real-time API Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <label className="text-xs font-semibold text-foreground flex justify-between">
              <span>Probability of Default (PD)</span>
              <span className="font-mono text-primary font-bold">{(pdInput * 100).toFixed(2)}%</span>
            </label>
            <input
              type="range"
              min="0.0001"
              max="0.25"
              step="0.001"
              value={pdInput}
              onChange={(e) => setPdInput(parseFloat(e.target.value))}
              className="w-full mt-3 accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">1-year Through-The-Cycle (TTC) PD rating master scale</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <label className="text-xs font-semibold text-foreground flex justify-between">
              <span>Loss Given Default (LGD)</span>
              <span className="font-mono text-purple-500 font-bold">{(lgdInput * 100).toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.01"
              value={lgdInput}
              onChange={(e) => setLgdInput(parseFloat(e.target.value))}
              className="w-full mt-3 accent-purple-500 cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">Seniority & collateral workout haircut recovery rate</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <label className="text-xs font-semibold text-foreground flex justify-between">
              <span>Exposure at Default (EAD)</span>
              <span className="font-mono text-emerald-500 font-bold">${(eadInput / 1e3).toLocaleString()}k</span>
            </label>
            <input
              type="range"
              min="50000"
              max="5000000"
              step="50000"
              value={eadInput}
              onChange={(e) => setEadInput(parseFloat(e.target.value))}
              className="w-full mt-3 accent-emerald-500 cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">Drawn balance + Basel CCF × undrawn commitment</p>
          </div>
        </div>

        {/* Output Calculation Banner */}
        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground font-mono">
            Computation: <span className="text-primary">{(pdInput * 100).toFixed(2)}% PD</span> &times; <span className="text-purple-500">{(lgdInput * 100).toFixed(1)}% LGD</span> &times; <span className="text-emerald-500">${eadInput.toLocaleString()} EAD</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold font-mono">Facility EL:</span>
            <span className="text-xl font-bold font-mono text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-xl border border-amber-500/30">
              ${calculatedEL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Parameter Histograms */}
      {distributions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Empirical Parameter Histograms across Portfolio (50,000 Facilities)
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Calibrated distributions
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="risk-card p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <h3 className="text-xs font-bold text-foreground font-mono">PD Distribution (1-Year)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">PD</span>
              </div>
              <div className="h-60">
                <ReactECharts
                  option={makeDistChartOption(distributions.pd_distribution, '#06b6d4', 'PD Count')}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              </div>
            </div>

            <div className="risk-card p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <h3 className="text-xs font-bold text-foreground font-mono">LGD Distribution (Workout)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">LGD</span>
              </div>
              <div className="h-60">
                <ReactECharts
                  option={makeDistChartOption(distributions.lgd_distribution, '#a855f7', 'LGD Count')}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              </div>
            </div>

            <div className="risk-card p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <h3 className="text-xs font-bold text-foreground font-mono">EAD Exposure Size Distribution ($k)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">EAD</span>
              </div>
              <div className="h-60">
                <ReactECharts
                  option={makeDistChartOption(distributions.ead_distribution, '#10b981', 'EAD Count')}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
