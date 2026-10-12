import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Building,
  TrendingDown,
  Layers,
  Scale,
  Sliders,
  FileCheck,
  Download
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { riskApi } from '../services/api';
import { BaselCapitalResponse } from '../types';

export const BaselCapitalPage: React.FC = () => {
  const [data, setData] = useState<BaselCapitalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [maturityAssumption, setMaturityAssumption] = useState<number>(2.5);
  const [stressMultiplier, setStressMultiplier] = useState<number>(1.0);

  useEffect(() => {
    riskApi.getBaselCapital()
      .then((res) => { setData(res); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner message="Calculating Basel III/IV IRB Risk-Weighted Assets & Capital Adequacy..." />;
  if (error) return (
    <div className="p-6 text-destructive bg-destructive/10 border border-destructive/30 rounded-xl font-mono text-sm">
      Error loading regulatory capital metrics: {error}
    </div>
  );
  if (!data) return null;

  const simRwa = data.total_rwa * stressMultiplier * (1 + (maturityAssumption - 2.5) * 0.08);
  const simMinCapital = simRwa * 0.08;
  const simTotalCapital = simRwa * 0.105;
  const simRwaDensity = (simRwa / data.total_ead) * 100;

  const kpiCards = [
    { label: 'Total Risk-Weighted Assets', value: `$${(data.total_rwa / 1e9).toFixed(2)}B`, sub: `From $${(data.total_ead / 1e9).toFixed(2)}B EAD (Density: ${data.rwa_density_pct.toFixed(1)}%)`, color: 'text-sky-400', Icon: Scale },
    { label: 'Pillar 1 Min Capital (8%)', value: `$${(data.pillar_1_minimum_capital / 1e9).toFixed(2)}B`, sub: 'Strict statutory solvency minimum', color: 'text-emerald-400', Icon: ShieldCheck },
    { label: 'Capital Conservation (2.5%)', value: `$${(data.capital_conservation_buffer / 1e9).toFixed(2)}B`, sub: 'Basel III macroprudential buffer', color: 'text-amber-400', Icon: Layers },
    { label: 'Total Required Capital (10.5%)', value: `$${(data.total_regulatory_capital / 1e9).toFixed(2)}B`, sub: `CET1: $${(data.cet1_requirement_4_5pct / 1e9).toFixed(2)}B | Tier 1: $${(data.tier_1_requirement_6pct / 1e9).toFixed(2)}B`, color: 'text-violet-400', Icon: Building },
  ];

  const ratingColor = (rating: string) => {
    if (rating.startsWith('A')) return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    if (rating === 'BBB') return 'border-blue-500/40 text-blue-400 bg-blue-500/10';
    if (rating.startsWith('B')) return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    return 'border-rose-500/40 text-rose-400 bg-rose-500/10';
  };

  return (
    <div className="flex-1 space-y-6 p-2 md:p-6 pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Basel III / IV Regulatory Capital</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">A-IRB Formula</Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-7">
            Pillar 1 Advanced Internal Ratings-Based (A-IRB) Risk-Weighted Assets (RWA) and minimum capital adequacy buffers.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="h-9 px-3 font-mono text-xs">
            RWA Density: {data.rwa_density_pct.toFixed(1)}%
          </Badge>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => window.open('/api/v1/reports/portfolio', '_blank')}>
            <Download className="w-3.5 h-3.5" />
            <span>Export Capital Schedule</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(({ label, value, sub, color, Icon }) => (
          <div key={label} className="page-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Rating Table & Capital Stack */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Rating Breakdown Table */}
        <div className="md:col-span-4 page-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">RWA & Capital Density by Rating Notch</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Basel asset correlation R(PD) and unexpected loss capital factor K across credit grades</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/30 hover:bg-transparent">
                {['Rating','Facilities','EAD ($M)','RWA ($M)','Density','Pillar 1 ($M)'].map((h, i) => (
                  <TableHead key={h} className={`font-mono text-xs text-muted-foreground ${i >= 2 ? 'text-right' : ''}`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.by_rating.map((r) => (
                <TableRow key={r.rating} className="border-border/40 font-mono text-xs hover:bg-muted/40">
                  <TableCell>
                    <Badge variant="outline" className={ratingColor(r.rating)}>{r.rating}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.count.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${(r.ead / 1e6).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-semibold text-foreground">${(r.rwa / 1e6).toFixed(1)}</TableCell>
                  <TableCell className="text-right">
                    <span className={r.rwa_density_pct > 100 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {r.rwa_density_pct.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sky-400 font-semibold">${(r.min_capital / 1e6).toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Right column: Capital Stack + Simulator */}
        <div className="md:col-span-3 space-y-6">
          {/* Capital Stack */}
          <div className="page-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Basel III Pillar 1 Capital Stack</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-6 mb-5">Tiered capital hierarchy as percentage of total RWA</p>
            <div className="space-y-4">
              {[
                { label: 'Common Equity Tier 1 (CET1)', pct: '4.5%', val: data.cet1_requirement_4_5pct, width: '42.8%', color: 'bg-emerald-500' },
                { label: 'Tier 1 Total (CET1 + AT1)', pct: '6.0%', val: data.tier_1_requirement_6pct, width: '57.1%', color: 'bg-sky-500' },
                { label: 'Minimum Pillar 1 Total', pct: '8.0%', val: data.pillar_1_minimum_capital, width: '76.2%', color: 'bg-primary' },
                { label: 'Total Capital + CCB Buffer', pct: '10.5%', val: data.total_regulatory_capital, width: '100%', color: 'bg-violet-500' },
              ].map(({ label, pct, val, width, color }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold text-foreground">{pct} (${(val / 1e9).toFixed(2)}B)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Sensitivity Simulator */}
          <div className="page-card p-6 bg-muted/10">
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-foreground">Interactive RWA Sensitivity Simulator</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-6 mb-5">Simulate portfolio maturity and macro shock impacts</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-muted-foreground">Portfolio Maturity Assumption (M):</span>
                  <span className="font-bold text-foreground">{maturityAssumption.toFixed(1)} Years</span>
                </div>
                <input type="range" min="1.0" max="5.0" step="0.5" value={maturityAssumption}
                  onChange={(e) => setMaturityAssumption(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-muted-foreground">Downturn Stress Multiplier:</span>
                  <span className="font-bold text-foreground">{(stressMultiplier * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0.8" max="1.6" step="0.1" value={stressMultiplier}
                  onChange={(e) => setStressMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded cursor-pointer" />
              </div>

              <div className="p-4 rounded-xl bg-card border border-border space-y-2 font-mono text-xs">
                {[
                  { label: 'Simulated RWA:', value: `$${(simRwa / 1e9).toFixed(2)}B`, color: 'text-sky-400' },
                  { label: 'Simulated Density:', value: `${simRwaDensity.toFixed(1)}%`, color: 'text-foreground' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Capital Required (10.5%):</span>
                  <span className="font-bold text-primary">${(simTotalCapital / 1e9).toFixed(2)}B</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
