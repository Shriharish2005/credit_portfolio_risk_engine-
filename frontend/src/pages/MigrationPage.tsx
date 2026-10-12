import React, { useEffect, useState } from 'react';
import { GitCommit, ArrowUpRight, ArrowDownRight, Minus, AlertOctagon, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TransitionHeatmap } from '../charts/TransitionHeatmap';
import { riskApi } from '../services/api';
import { MigrationResponse } from '../types';

export const MigrationPage: React.FC = () => {
  const [migrationData, setMigrationData] = useState<MigrationResponse | null>(null);
  const [periods, setPeriods] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMigration = (p: number) => {
    setLoading(true);
    riskApi.getMigration(p)
      .then((data) => {
        setMigrationData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMigration(periods);
  }, [periods]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Credit Rating Migration & Transition Matrix</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-7">
            Markovian credit quality migration dynamics: P(n) = P<sup>n</sup>
          </p>
        </div>

        {/* Horizon selector buttons */}
        <div className="flex items-center space-x-1 bg-muted/50 p-1 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground px-2 font-mono">Horizon:</span>
          {[1, 2, 3, 5].map((yr) => (
            <button
              key={yr}
              onClick={() => setPeriods(yr)}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                periods === yr ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {yr}Y
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message={`Calculating ${periods}-year Markov transition matrix power P^${periods}...`} />
      ) : migrationData ? (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="risk-card p-4 flex items-center space-x-3">
              <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-mono">Avg Upgrade Rate</p>
                <p className="text-lg font-bold font-mono text-emerald-400">
                  {(migrationData.overall_avg_upgrade * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="risk-card p-4 flex items-center space-x-3">
              <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Minus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-mono">Avg Stability (Unchanged)</p>
                <p className="text-lg font-bold font-mono text-blue-400">
                  {(migrationData.overall_avg_unchanged * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="risk-card p-4 flex items-center space-x-3">
              <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-mono">Avg Downgrade Rate</p>
                <p className="text-lg font-bold font-mono text-amber-400">
                  {(migrationData.overall_avg_downgrade * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="risk-card p-4 flex items-center space-x-3">
              <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-mono">Avg Default Transition</p>
                <p className="text-lg font-bold font-mono text-rose-400">
                  {(migrationData.overall_avg_default * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="risk-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-primary" />
                Transition Probability Matrix P({periods}) = P<sup>{periods}</sup>
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                Absorbing State: Default = 100.00%
              </span>
            </div>
            <TransitionHeatmap ratings={migrationData.ratings} matrix={migrationData.transition_matrix} />
          </div>

          {/* Rating by Rating Decomposition Table */}
          <div className="risk-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Rating Tier Migration Decomposition</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/30 text-muted-foreground uppercase font-mono">
                  <tr>
                    <th className="px-4 py-3 font-medium text-[10px]">Initial Rating</th>
                    <th className="px-4 py-3 font-medium text-[10px] text-right">Upgrade Prob</th>
                    <th className="px-4 py-3 font-medium text-[10px] text-right">Unchanged (Diagonal)</th>
                    <th className="px-4 py-3 font-medium text-[10px] text-right">Downgrade Prob</th>
                    <th className="px-4 py-3 font-medium text-[10px] text-right">Default Prob</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {migrationData.rating_analysis.map((r) => (
                    <tr key={r.rating} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-bold font-mono text-foreground">{r.rating}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-400">
                        {(r.upgrade * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-blue-400">
                        {(r.unchanged * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-amber-400">
                        {(r.downgrade * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-rose-400">
                        {(r.default_prob * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
