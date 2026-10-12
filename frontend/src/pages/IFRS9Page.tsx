import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  Download,
  Info
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { riskApi } from '../services/api';
import { IFRS9StagingResponse } from '../types';

export const IFRS9Page: React.FC = () => {
  const [data, setData] = useState<IFRS9StagingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stage1MigrationPct, setStage1MigrationPct] = useState<number>(0);

  useEffect(() => {
    riskApi.getIFRS9Staging()
      .then((res) => { setData(res); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner message="Evaluating IFRS 9 / CECL 3-Stage classifications and SICR triggers..." />;
  if (error) return (
    <div className="p-6 text-destructive bg-destructive/10 border border-destructive/30 rounded-xl font-mono text-sm">
      Error loading IFRS 9 staging analytics: {error}
    </div>
  );
  if (!data) return null;

  const s1 = data.stages.stage_1;
  const s2 = data.stages.stage_2;
  const s3 = data.stages.stage_3;

  const migratedExposure = s1.total_exposure * (stage1MigrationPct / 100);
  const stressedS1Exp = s1.total_exposure - migratedExposure;
  const stressedS2Exp = s2.total_exposure + migratedExposure;
  const additionalEcl = migratedExposure * ((s2.coverage_ratio_pct - s1.coverage_ratio_pct) / 100);
  const stressedTotalEcl = data.total_ecl_provisions + additionalEcl;
  const stressedCoverage = (stressedTotalEcl / data.total_exposure) * 100;

  const stages = [
    {
      label: 'Stage 1: Performing',
      sub: '12-Month Expected Credit Loss',
      Icon: CheckCircle2,
      badge: `${s1.exposure_share_pct.toFixed(1)}% EAD`,
      color: { text: 'text-emerald-400', border: 'border-emerald-500/30', bar: 'bg-emerald-500', bg: 'bg-emerald-500/5', eclText: 'text-emerald-400', badgeBorder: 'border-emerald-500/30' },
      rows: [
        { label: 'Exposure at Default', value: `$${(s1.total_exposure / 1e9).toFixed(2)}B` },
        { label: 'Facilities Count', value: s1.facility_count.toLocaleString() },
        { label: '12m ECL Provisions', value: `$${(s1.total_ecl / 1e6).toFixed(1)}M`, highlight: true },
        { label: 'Coverage Ratio', value: `${s1.coverage_ratio_pct.toFixed(2)}%`, highlight: true },
      ],
    },
    {
      label: 'Stage 2: SICR Trigger',
      sub: 'Lifetime ECL (Underperforming)',
      Icon: AlertTriangle,
      badge: `${s2.exposure_share_pct.toFixed(1)}% EAD`,
      color: { text: 'text-amber-400', border: 'border-amber-500/30', bar: 'bg-amber-500', bg: 'bg-amber-500/5', eclText: 'text-amber-400', badgeBorder: 'border-amber-500/30' },
      rows: [
        { label: 'Exposure at Default', value: `$${(s2.total_exposure / 1e9).toFixed(2)}B` },
        { label: 'Facilities Count', value: s2.facility_count.toLocaleString() },
        { label: 'Lifetime ECL Provisions', value: `$${(s2.total_ecl / 1e6).toFixed(1)}M`, highlight: true },
        { label: 'Coverage Ratio', value: `${s2.coverage_ratio_pct.toFixed(2)}%`, highlight: true },
      ],
    },
    {
      label: 'Stage 3: Credit-Impaired',
      sub: 'Lifetime ECL (Defaulted / 90+ DPD)',
      Icon: ShieldAlert,
      badge: `${s3.exposure_share_pct.toFixed(1)}% EAD`,
      color: { text: 'text-rose-400', border: 'border-rose-500/30', bar: 'bg-rose-500', bg: 'bg-rose-500/5', eclText: 'text-rose-400', badgeBorder: 'border-rose-500/30' },
      rows: [
        { label: 'Exposure at Default', value: `$${(s3.total_exposure / 1e9).toFixed(2)}B` },
        { label: 'Facilities Count', value: s3.facility_count.toLocaleString() },
        { label: 'Lifetime ECL Provisions', value: `$${(s3.total_ecl / 1e6).toFixed(1)}M`, highlight: true },
        { label: 'Coverage Ratio', value: `${s3.coverage_ratio_pct.toFixed(2)}%`, highlight: true },
      ],
    },
  ];

  const sicrRules = [
    { id: '1', title: 'Rating Deterioration Trigger', badge: '≥ 2 Notches', badgeColor: 'text-amber-400 border-amber-500/30', desc: 'Deterioration of 2 or more credit rating notches from origination automatically prompts Stage 2 reclassification.' },
    { id: '2', title: 'Relative PD Doubling Trigger', badge: 'PD Ratio ≥ 2.0x', badgeColor: 'text-amber-400 border-amber-500/30', desc: 'Current point-in-time PD exceeding 200% of origination baseline PD triggers significant risk transfer.' },
    { id: '3', title: 'Regulatory Days Past Due Backstop', badge: '≥ 30 DPD', badgeColor: 'text-amber-400 border-amber-500/30', desc: 'Statutory backstop presumption under IFRS 9: contractual payments overdue by 30 days or more.' },
    { id: '4', title: 'Objective Impairment (Stage 3)', badge: '≥ 90 DPD / Rating D', badgeColor: 'text-rose-400 border-rose-500/30', desc: 'Full default event, restructuring, or 90 days past due triggers non-accrual and Stage 3 lifetime loss accounting.' },
  ];

  return (
    <div className="flex-1 space-y-6 p-2 md:p-6 pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">IFRS 9 / CECL Expected Credit Loss</h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-mono">3-Stage Framework</Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-7">
            Credit impairment staging, Significant Increase in Credit Risk (SICR) triggers, and lifetime loss provisions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="h-9 px-3 font-mono text-xs">
            Blended Coverage: {data.blended_coverage_ratio_pct.toFixed(2)}%
          </Badge>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => window.open('/api/v1/reports/portfolio', '_blank')}>
            <Download className="w-3.5 h-3.5" />
            <span>Export ECL Schedule</span>
          </Button>
        </div>
      </div>

      {/* 3 Stage Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stages.map(({ label, sub, Icon, badge, color, rows }) => (
          <div key={label} className={`page-card relative overflow-hidden border ${color.border} ${color.bg}`}>
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${color.bar}`} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 ${color.text}`} />
                    <span className="text-sm font-bold text-foreground">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-5">{sub}</p>
                </div>
                <Badge variant="outline" className={`${color.text} font-mono text-xs ${color.badgeBorder}`}>
                  {badge}
                </Badge>
              </div>
              <div className="space-y-2 font-mono text-xs">
                {rows.map(({ label: rowLabel, value, highlight }) => (
                  <div key={rowLabel} className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">{rowLabel}:</span>
                    <span className={`font-bold ${highlight ? color.eclText : 'text-foreground'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SICR Policy & Migration Simulator */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* SICR Policy Rules */}
        <div className="page-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">IFRS 9 SICR Classification Rules</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-6 mb-5">Objective and qualitative triggers required by international accounting standards</p>
          <div className="space-y-3">
            {sicrRules.map(({ id, title, badge, badgeColor, desc }) => (
              <div key={id} className="p-4 rounded-xl bg-muted/30 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-xs text-foreground">{id}. {title}</span>
                  <Badge variant="outline" className={`font-mono text-[10px] ${badgeColor}`}>{badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What-If SICR Migration Simulator */}
        <div className="page-card p-6 bg-muted/10">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-foreground">What-If SICR Migration & Provision Shock</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-6 mb-5">Simulate macro deterioration migrating Stage 1 into Stage 2</p>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-muted-foreground">Hypothetical Stage 1 → Stage 2 Migration:</span>
                <span className="font-bold text-amber-400">{stage1MigrationPct}% of Stage 1</span>
              </div>
              <input
                type="range" min="0" max="25" step="1" value={stage1MigrationPct}
                onChange={(e) => setStage1MigrationPct(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-muted rounded cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                Migrating ${(migratedExposure / 1e9).toFixed(2)}B of performing loans to lifetime ECL
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Baseline ECL Provisions:</span>
                <span className="font-bold text-foreground">${(data.total_ecl_provisions / 1e6).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incremental SICR Provision Charge:</span>
                <span className="font-bold text-amber-400">+${(additionalEcl / 1e6).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground font-semibold">Stressed Total Provisions:</span>
                <span className="font-bold text-rose-400 text-sm">${(stressedTotalEcl / 1e6).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stressed Coverage Ratio:</span>
                <span className="font-bold text-foreground">
                  {stressedCoverage.toFixed(2)}% (+{(stressedCoverage - data.blended_coverage_ratio_pct).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
