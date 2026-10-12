import React, { useEffect, useState } from 'react';
import { Layers, Users, BarChart2, MapPin } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { riskApi } from '../services/api';
import { ConcentrationResponse } from '../types';

export const ConcentrationPage: React.FC = () => {
  const [data, setData] = useState<ConcentrationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    riskApi.getConcentration()
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Evaluating portfolio concentration and Herfindahl indices..." />;
  if (!data) return null;

  const heatLevel = (bps: number) => {
    if (bps < 1500) return { label: 'Unconcentrated', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' };
    if (bps < 2500) return { label: 'Moderately Concentrated', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' };
    return { label: 'Highly Concentrated', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/5' };
  };

  const sectorHeat = heatLevel(data.hhi_sector_bps);
  const geoHeat = heatLevel(data.hhi_geography_bps);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Concentration Risk & Herfindahl-Hirschman Index (HHI)
          </h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7">
          Quantifies single-name obligor, industrial sector, and geographical concentration
        </p>
      </div>

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Obligor HHI"
          value={data.hhi_borrower_bps.toFixed(1)}
          subtitle={`Raw index: ${data.hhi_borrower.toFixed(6)}`}
          badge={`${data.hhi_borrower_bps.toFixed(0)} bps`}
          color="blue"
        />
        <MetricCard
          title="Effective Obligors (N_eff)"
          value={data.effective_obligors.toFixed(0)}
          subtitle="Theoretical count of equal-sized counterparties"
          badge="N_eff = 1 / HHI"
          color="emerald"
        />
        <MetricCard
          title="Gini Concentration"
          value={data.gini_coefficient.toFixed(3)}
          subtitle="Exposure distribution inequality (0 = equal, 1 = max)"
          color="purple"
        />
        <MetricCard
          title="Top 10 Obligor Share"
          value={`${(data.top_10_share * 100).toFixed(2)}%`}
          subtitle={`Top 5: ${(data.top_5_share * 100).toFixed(2)}% | Top 20: ${(data.top_20_share * 100).toFixed(2)}%`}
          color="amber"
        />
      </div>

      {/* Sector & Geography HHI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Sector Concentration', icon: BarChart2, bps: data.hhi_sector_bps, index: data.hhi_sector, heat: sectorHeat },
          { label: 'Geographic Concentration', icon: MapPin, bps: data.hhi_geography_bps, index: data.hhi_geography, heat: geoHeat },
        ].map(({ label, icon: Icon, bps, index, heat }) => (
          <div key={label} className={`page-card p-5 border ${heat.border} ${heat.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${heat.color}`} />
                <span className="text-xs font-semibold text-foreground">{label}</span>
              </div>
              <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${heat.border} ${heat.color} bg-transparent`}>
                {bps.toFixed(0)} bps
              </span>
            </div>
            <div className={`mt-3 text-3xl font-bold font-mono ${heat.color}`}>{index.toFixed(4)}</div>
            <p className={`text-xs mt-1.5 font-medium ${heat.color}`}>{heat.label} (&lt; 1500 / 1500–2500 / &gt; 2500 bps)</p>
          </div>
        ))}
      </div>

      {/* Top Obligors Table */}
      <div className="page-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Top 10 Obligor Concentration Exposures</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border bg-muted/30 text-muted-foreground uppercase font-mono">
              <tr>
                {['Obligor Identifier','Exposure (EAD)','Portfolio Share','HHI Contribution (s_i²)'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 font-medium text-[10px] ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.top_borrowers.map((b) => (
                <tr key={b.borrower_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-2.5 font-mono font-medium text-primary">{b.borrower_id}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-foreground font-semibold">
                    ${(b.exposure / 1e6).toFixed(2)}M
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-amber-400 font-semibold">
                    {(b.share * 100).toFixed(3)}%
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-muted-foreground">
                    {(Math.pow(b.share, 2) * 10000).toFixed(4)} bps
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
