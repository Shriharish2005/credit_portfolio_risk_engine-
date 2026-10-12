import React, { useEffect, useState } from 'react';
import { Zap, Play, PlusCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StressComparisonChart } from '../charts/StressComparisonChart';
import { riskApi } from '../services/api';
import { StressTestResponse } from '../types';

export const StressTestingPage: React.FC = () => {
  const [data, setData] = useState<StressTestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [customName, setCustomName] = useState<string>('Custom Stagflation');
  const [customDesc, setCustomDesc] = useState<string>('Deep contraction with policy tightening');
  const [customGdp, setCustomGdp] = useState<number>(-3.0);
  const [customIr, setCustomIr] = useState<number>(11.0);
  const [customUnemp, setCustomUnemp] = useState<number>(13.5);
  const [customHaircut, setCustomHaircut] = useState<number>(0.20);

  const fetchStressTests = () => {
    riskApi.getStressTests()
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchStressTests(); }, []);

  const handleRunCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await riskApi.runCustomStressTest({
        name: customName, description: customDesc,
        gdp_growth: customGdp, interest_rate: customIr,
        unemployment_rate: customUnemp, collateral_haircut_shock: customHaircut,
      });
      setData(res);
    } catch (err: any) {
      alert(`Error running custom stress test: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Executing macroeconomic stress testing scenarios..." />;
  if (!data) return null;

  const inputClass = "w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Macroeconomic Scenario Stress Testing</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7">
          Simulates macroeconomic shocks across GDP growth, interest rates, and unemployment on PD, LGD, and capital
        </p>
      </div>

      {/* Scenario Comparison Chart */}
      <div className="page-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Expected Loss & 99% VaR Across Scenarios</h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border">CCAR / EBA Capital Stress</span>
        </div>
        <StressComparisonChart scenarios={data.scenarios} />
      </div>

      {/* Custom Scenario Form */}
      <div className="page-card p-6 border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <PlusCircle className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Configure Custom Macroeconomic Scenario</h3>
        </div>
        <p className="text-xs text-muted-foreground ml-6 mb-5">Design a bespoke shock and run it against the live portfolio</p>

        <form onSubmit={handleRunCustom} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground font-semibold">Scenario Name</label>
              <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                className={inputClass} required />
            </div>
            <div>
              <label className="text-xs text-foreground font-semibold">Description</label>
              <input type="text" value={customDesc} onChange={(e) => setCustomDesc(e.target.value)}
                className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'GDP Growth (%)', val: customGdp, set: setCustomGdp, step: '0.1' },
              { label: 'Interest Rate (%)', val: customIr, set: setCustomIr, step: '0.1' },
              { label: 'Unemployment (%)', val: customUnemp, set: setCustomUnemp, step: '0.1' },
              { label: 'Haircut Shock (0–1)', val: customHaircut, set: setCustomHaircut, step: '0.05', min: '0', max: '0.8' },
            ].map(({ label, val, set, step, min, max }) => (
              <div key={label}>
                <label className="text-xs text-foreground font-semibold">{label}</label>
                <input type="number" step={step} min={min} max={max} value={val}
                  onChange={(e) => set(parseFloat(e.target.value))}
                  className={`${inputClass} font-mono`} />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? 'Simulating Shocks...' : 'Run Custom Scenario'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Scenario Matrix Table */}
      <div className="page-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-foreground">Scenario Impact Matrix vs Baseline</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border bg-muted/30 text-muted-foreground uppercase font-mono">
              <tr>
                {['Scenario','Macro Parameters','Weighted PD','Weighted LGD','Expected Loss','Δ vs Base','99% VaR'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-medium text-[10px] ${i >= 2 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.scenarios.map((s) => (
                <tr key={s.scenario_name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-foreground">{s.scenario_name}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    GDP: {s.macro_inputs.gdp_growth}% | IR: {s.macro_inputs.interest_rate}% | Unemp: {s.macro_inputs.unemployment_rate}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">{(s.weighted_pd * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-violet-400 font-semibold">{(s.weighted_lgd * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">${(s.total_expected_loss / 1e6).toFixed(2)}M</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-400 font-semibold">
                    {s.el_pct_change > 0 ? `+${s.el_pct_change.toFixed(1)}%` : 'Base'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground font-semibold">${(s.estimated_var_99 / 1e6).toFixed(2)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
