import React, { useEffect, useState } from 'react';
import { Cpu, Play, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LossDistributionChart } from '../charts/LossDistributionChart';
import { riskApi } from '../services/api';
import { MonteCarloResponse } from '../types';

export const MonteCarloPage: React.FC = () => {
  const [data, setData] = useState<MonteCarloResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Simulation controls
  const [nSims, setNSims] = useState<number>(10000);
  const [seed, setSeed] = useState<number>(42);
  const [assetCorr, setAssetCorr] = useState<number>(0.18);
  const [stochasticLgd, setStochasticLgd] = useState<boolean>(false);

  const fetchSimulation = (simParams?: any) => {
    setSimulating(true);
    const runner = simParams
      ? riskApi.runMonteCarlo(simParams)
      : riskApi.getLatestMonteCarlo();

    runner
      .then((res) => {
        setData(res);
        setLoading(false);
        setSimulating(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setSimulating(false);
      });
  };

  useEffect(() => {
    fetchSimulation();
  }, []);

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSimulation({
      n_simulations: nSims,
      random_seed: seed,
      asset_correlation: assetCorr,
      stochastic_lgd: stochasticLgd,
    });
  };

  if (loading) return <LoadingSpinner message="Executing 10,000 Monte Carlo credit portfolio simulations..." />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Monte Carlo Credit Loss Simulation</h2>
          <p className="text-xs text-muted-foreground">
            Vectorized Vasicek one-factor Gaussian copula simulation with correlated defaults & tail risk quantification
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground">
          <span>Run ID:</span>
          <span className="text-primary font-semibold">{data.run_id}</span>
          <span className="text-muted-foreground">•</span>
          <span>Time:</span>
          <span className="text-emerald-500 font-semibold">{data.execution_time_seconds}s</span>
        </div>
      </div>

      {/* Interactive Simulation Parameters Bar */}
      <form onSubmit={handleRun} className="risk-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <label className="text-muted-foreground font-mono block">Iterations (N):</label>
            <select
              value={nSims}
              onChange={(e) => setNSims(parseInt(e.target.value))}
              className="bg-background border border-border rounded px-2.5 py-1 text-foreground font-mono mt-0.5"
            >
              <option value="1000">1,000</option>
              <option value="5000">5,000</option>
              <option value="10000">10,000 (Basel Standard)</option>
              <option value="20000">20,000</option>
            </select>
          </div>

          <div>
            <label className="text-muted-foreground font-mono block">Random Seed:</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value))}
              className="w-20 bg-background border border-border rounded px-2 py-1 text-foreground font-mono mt-0.5"
            />
          </div>

          <div>
            <label className="text-muted-foreground font-mono block">Asset Correlation (&rho;):</label>
            <input
              type="number"
              step="0.01"
              min="0.05"
              max="0.50"
              value={assetCorr}
              onChange={(e) => setAssetCorr(parseFloat(e.target.value))}
              className="w-20 bg-background border border-border rounded px-2 py-1 text-foreground font-mono mt-0.5"
            />
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <input
              type="checkbox"
              id="stochLgd"
              checked={stochasticLgd}
              onChange={(e) => setStochasticLgd(e.target.checked)}
              className="rounded bg-background border-border text-primary focus:ring-0"
            />
            <label htmlFor="stochLgd" className="text-xs text-foreground font-mono cursor-pointer">
              Systematic Downturn LGD
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={simulating}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
        >
          {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{simulating ? 'Simulating...' : 'Run Simulation'}</span>
        </button>
      </form>

      {/* Key Simulated Risk Quantiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Mean Simulated Loss"
          value={`$${(data.mean_loss / 1e6).toFixed(2)}M`}
          subtitle={`EL %: ${data.expected_loss_pct.toFixed(2)}% of portfolio`}
          badge="Expected"
          color="blue"
        />
        <MetricCard
          title="95% Credit VaR"
          value={`$${(data.var_95 / 1e6).toFixed(2)}M`}
          subtitle="95th percentile portfolio loss ceiling"
          color="amber"
        />
        <MetricCard
          title="99% Credit VaR"
          value={`$${(data.var_99 / 1e6).toFixed(2)}M`}
          subtitle="99th percentile capital adequacy buffer"
          badge="1-in-100 Year"
          color="rose"
        />
        <MetricCard
          title="99% Expected Shortfall (CVaR)"
          value={`$${(data.es_99 / 1e6).toFixed(2)}M`}
          subtitle="Conditional expectation in the extreme tail"
          badge="Tail Risk"
          color="purple"
        />
      </div>

      {/* Loss Distribution Histogram */}
      <div className="risk-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Simulated Portfolio Loss Distribution Histogram ({data.n_simulations.toLocaleString()} Runs)
          </h3>
          <span className="text-[11px] font-mono text-muted-foreground">
            Std Dev: ${(data.std_loss / 1e6).toFixed(2)}M
          </span>
        </div>
        <LossDistributionChart
          distribution={data.distribution}
          meanLoss={data.mean_loss}
          var95={data.var_95}
          var99={data.var_99}
          es99={data.es_99}
        />
      </div>

      {/* Quantiles & Percentiles Table */}
      <div className="risk-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Portfolio Loss Quantiles</h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {Object.entries(data.percentiles).map(([pKey, pVal]) => (
            <div key={pKey} className="bg-muted/40 p-3 rounded-lg border border-border text-center">
              <span className="text-[11px] font-mono uppercase text-muted-foreground">{pKey.toUpperCase()}</span>
              <p className="text-sm font-bold font-mono text-foreground mt-1">
                ${(pVal / 1e6).toFixed(2)}M
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
