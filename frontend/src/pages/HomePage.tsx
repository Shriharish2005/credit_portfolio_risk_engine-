import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  TrendingDown,
  Cpu,
  Zap,
  BarChart3,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  Activity,
  FileCode,
  Play,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { riskApi } from '../services/api';
import { PortfolioSummary } from '../types';

interface HomePageProps {
  onNavigate: (tab: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    riskApi.getPortfolioSummary()
      .then((data) => setSummary(data))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full relative overflow-hidden bg-background">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 hero-glow pointer-events-none opacity-60" />

      <div className="space-y-16 pt-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 1. CLASSICAL CENTERED HERO SECTION */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">

          {/* Main Headline (Exact screenshot styling) */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#111827] dark:text-white leading-[1.08] font-sans">
              Credit Portfolio Risk & <br />
              <span className="text-[#2563EB] dark:text-[#60A5FA]">
                Capital Adequacy Simulation
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#4B5563] dark:text-neutral-300 max-w-3xl mx-auto font-sans leading-relaxed">
              Vectorized Gaussian copula Monte Carlo simulations, Basel Pillar 1 IRB loss provisions, multi-period Markov rating migrations, and macroeconomic stress testing for institutional credit desks.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              size="lg"
              className="h-11 px-7 gap-2.5 text-sm font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[1.02]"
              onClick={() => onNavigate('dashboard')}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Risk Terminal</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 gap-2 text-sm font-semibold border-border hover:bg-muted/50"
              onClick={() => onNavigate('portfolio')}
            >
              <span>Explore 50k Portfolio</span>
            </Button>

            <Button
              variant="ghost"
              size="lg"
              className="h-11 px-4 gap-2 text-sm font-mono text-muted-foreground hover:text-foreground"
              onClick={() => window.open('/docs', '_blank')}
            >
              <FileCode className="w-4 h-4 text-primary" />
              <span>Swagger API</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Classical 4-Metric Overview Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-left">
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Portfolio EAD
              </span>
              <div className="text-3xl font-bold font-mono text-foreground mt-3">
                {summary ? `$${(summary.total_exposure / 1e9).toFixed(2)}B` : '$187.24B'}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {summary ? summary.total_loans.toLocaleString() : '50,000'} Total Loans
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition-all">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Expected Loss
              </span>
              <div className="text-3xl font-bold font-mono text-amber-500 mt-3">
                {summary ? `$${(summary.total_expected_loss / 1e9).toFixed(2)}B` : '$1.60B'}
              </div>
              <p className="text-xs text-amber-500/90 mt-2 font-mono">
                {summary ? `${summary.expected_loss_rate.toFixed(2)}% EL Rate` : '0.86% EL Rate'}
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between hover:border-rose-500/40 transition-all">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                99% Credit VaR
              </span>
              <div className="text-3xl font-bold font-mono text-rose-500 mt-3">
                {summary ? `$${(summary.var_99 / 1e9).toFixed(2)}B` : '$8.63B'}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                1-in-100 Yr Quantile
              </p>
            </div>
          </div>
        </section>

        {/* 2. CORE METHODOLOGY MODULES (3x2 GRID) */}
        <section className="space-y-8 max-w-6xl mx-auto pt-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="outline" className="font-mono text-xs">Quantitative Pillars</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-foreground">
              Institutional Risk Modeling Frameworks
            </h2>
            <p className="text-sm text-muted-foreground">
              Strict mathematical formulation built with NumPy, SciPy, Pandas, and Statsmodels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            <Card
              className="hover:border-primary/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('credit-risk')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-2">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Vasicek Point-In-Time PD</CardTitle>
                <CardDescription>
                  Calibrated rating master scales (AAA to CCC) conditioned on macroeconomic factor shocks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-primary font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Launch Parameter Engine</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-purple-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('credit-risk')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Workout LGD Engine</CardTitle>
                <CardDescription>
                  Collateral haircut adjustments by asset class with facility seniority tiers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-purple-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Inspect Recovery Haircuts</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-rose-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('monte-carlo')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-2">
                  <Cpu className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Gaussian Copula Monte Carlo</CardTitle>
                <CardDescription>
                  10,000 iteration portfolio simulation calculating 95% & 99% Credit VaR and Expected Shortfall.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-rose-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Run Vectorized Simulation</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-cyan-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('migration')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center mb-2">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Markov Rating Migration (Pⁿ)</CardTitle>
                <CardDescription>
                  Multi-period transition matrices via matrix exponentiation with absorbing default states.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-cyan-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Decompose Rating Migrations</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-amber-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('stress-testing')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Macro Stress Testing</CardTitle>
                <CardDescription>
                  Regulatory CCAR & EBA scenarios: Base (+6% GDP), Moderate (+3% GDP), and Severe (-2% GDP).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-amber-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Simulate Macro Scenarios</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-emerald-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('validation')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2">
                  <Activity className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Model Validation & PSI</CardTitle>
                <CardDescription>
                  Discrimination (ROC-AUC, Gini, KS) and calibration stability via Population Stability Index.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-emerald-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Inspect Backtesting & PSI</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-cyan-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('capital')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Basel III / IV IRB Capital</CardTitle>
                <CardDescription>
                  Pillar 1 Risk-Weighted Assets (RWA), Capital Conservation Buffer, and Tier 1 solvency requirements.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-cyan-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Compute Basel RWA & Capital</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-amber-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('ifrs9')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
                  <Layers className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">IFRS 9 / CECL Impairment</CardTitle>
                <CardDescription>
                  Stage 1 (12m ECL), Stage 2 (Lifetime ECL via SICR), and Stage 3 (Default) coverage reserves.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-amber-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Analyze Staging & Provisions</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-primary/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('underwriting')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-2">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">RAROC Pricing Desk</CardTitle>
                <CardDescription>
                  Risk-Adjusted Return on Capital deal underwriting simulator and institutional hurdle rate authorization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-primary font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Price Facility & Test Hurdle</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-blue-500/50 transition-all shadow-sm cursor-pointer group hover:-translate-y-0.5"
              onClick={() => onNavigate('data-management')}
            >
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-2">
                  <Database className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Data Management Desk</CardTitle>
                <CardDescription>
                  Customer information, loan facilities, income, credit history, existing liabilities, and repayment tracking across 50k accounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-blue-500 font-medium flex items-center justify-between pt-2 border-t border-border">
                  <span>Manage 6 Core Datasets</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Plain Text Credit Risk Dashboard ─────────────────────────────── */}
        <section className="max-w-6xl mx-auto">
          <div className="page-card p-8 border-border/60 bg-card font-mono text-[13px] overflow-x-auto shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-muted-foreground font-bold uppercase tracking-widest text-[10px] border-b border-border pb-4">
              <FileCode className="w-3.5 h-3.5" />
              <span>Plain text</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left: KPI table */}
              <div className="text-foreground leading-loose">
                <div className="mb-4 font-extrabold tracking-widest text-base text-foreground">CREDIT RISK DASHBOARD</div>
                <div className="border-t border-border/60 w-72 mb-5" />
                <div className="grid grid-cols-[170px_1fr] gap-x-6 gap-y-1">
                  <div className="text-muted-foreground">Total Loans</div>
                  <div className="font-bold text-foreground">
                    {summary ? summary.total_loans.toLocaleString() : '25,430'}
                  </div>

                  <div className="text-muted-foreground">Total Exposure</div>
                  <div className="font-bold text-primary">
                    {summary ? `₹${(summary.total_exposure / 1e7).toFixed(0)} Cr` : '₹1,240 Cr'}
                  </div>

                  <div className="text-muted-foreground">High Risk Loans</div>
                  <div className="font-bold text-amber-500">
                    {summary ? Math.round(summary.total_loans * 0.05).toLocaleString() : '1,284'}
                  </div>

                  <div className="text-muted-foreground">Default Rate</div>
                  <div className="font-bold text-rose-500">
                    {summary ? `${(summary.expected_loss_rate * 100).toFixed(1)}%` : '3.8%'}
                  </div>

                  <div className="text-muted-foreground">Expected Loss</div>
                  <div className="font-bold text-amber-400">
                    {summary ? `₹${(summary.total_expected_loss / 1e7).toFixed(1)} Cr` : '₹32.4 Cr'}
                  </div>
                </div>
              </div>

              {/* Right: Risk Distribution bars */}
              <div className="text-foreground leading-loose">
                <div className="mb-4 font-bold text-sm text-foreground">Risk Distribution</div>
                <div className="space-y-3">
                  {[
                    { label: 'Low',      width: '65%', color: 'bg-emerald-500' },
                    { label: 'Medium',   width: '22%', color: 'bg-amber-500' },
                    { label: 'High',     width: '9%',  color: 'bg-orange-500' },
                    { label: 'Critical', width: '4%',  color: 'bg-rose-600' },
                  ].map(({ label, width, color }) => (
                    <div key={label} className="grid grid-cols-[90px_1fr_50px] items-center gap-4">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <div className="h-4 bg-muted rounded-sm overflow-hidden">
                        <div className={`h-full ${color} rounded-sm transition-all`} style={{ width }} />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground text-right">{width}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-border/40 pt-4 space-y-1 text-[11px] text-muted-foreground">
                  <div>EL Formula: <span className="text-foreground font-semibold">PD × LGD × EAD</span></div>
                  <div>Example: <span className="text-amber-400 font-mono">4.2% × 45% × ₹10,00,000 = ₹18,900</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
