import React, { useEffect, useState } from 'react';
import {
  Download,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Activity,
  BarChart2,
  Layers,
  Radio,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RatingBarChart } from '../charts/RatingBarChart';
import { SectorPieChart } from '../charts/SectorPieChart';
import { ZentraDashboard } from '../components/ZentraDashboard';
import { ZentraSubheader } from '../components/ZentraSubheader';
import { KafkaLiveStreamCard } from '../components/KafkaLiveStreamCard';
import { riskApi } from '../services/api';
import { PortfolioSummary, PortfolioExposures } from '../types';

interface PipelineStatus {
  running: boolean;
  success?: boolean;
  error?: string;
  result?: any;
}

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [exposures, setExposures] = useState<PortfolioExposures | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('zentra');
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({ running: false });

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([riskApi.getPortfolioSummary(), riskApi.getPortfolioExposure()])
      .then(([sumData, expData]) => {
        setSummary(sumData);
        setExposures(expData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const runPipeline = async () => {
    setPipelineStatus({ running: true });
    try {
      const response = await fetch('http://localhost:8000/api/v1/pipeline/run', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Pipeline execution failed');
      }
      const data = await response.json();
      setPipelineStatus({ running: false, success: true, result: data });
      // Optionally reload data
      loadData();
    } catch (err: any) {
      setPipelineStatus({ running: false, success: false, error: err.message });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading Zentra risk terminal..." />;
  if (error) return (
    <div className="p-6 text-destructive bg-destructive/10 border border-destructive/30 rounded-xl font-mono text-sm flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold mb-1">Failed to connect to Risk Engine API</p>
        <p className="text-xs opacity-90">{error}</p>
      </div>
      <Button variant="outline" size="sm" onClick={loadData} className="shrink-0">
        Retry Connection
      </Button>
    </div>
  );
  if (!summary || !exposures) return null;

  return (
    <div className="space-y-6">
      <ZentraSubheader title="Overview" />

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        {/* Tab header bar */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl border border-border gap-1">
            {[
              { val: 'zentra', label: 'Overview Canvas', icon: <Activity className="w-3.5 h-3.5" /> },
              { val: 'kafka', label: 'Kafka Live Stream', icon: <Radio className="w-3.5 h-3.5 text-emerald-400" /> },
              { val: 'analytics', label: 'Sector Analytics', icon: <BarChart2 className="w-3.5 h-3.5" /> },
              { val: 'stress', label: 'Stress Scenarios', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
              { val: 'capital', label: 'Capital Buffers', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <TabsTrigger
                key={tab.val}
                value={tab.val}
                className="rounded-lg text-xs font-semibold px-3.5 py-1.5 flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-lg text-xs border-border"
            onClick={() => window.open('/api/v1/reports/portfolio', '_blank')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </Button>

          <Button
            size="sm"
            variant={pipelineStatus.running ? "secondary" : "default"}
            className="h-8 gap-1.5 rounded-lg text-xs ml-2"
            onClick={runPipeline}
            disabled={pipelineStatus.running}
          >
            {pipelineStatus.running ? (
              <Activity className="w-3.5 h-3.5 animate-pulse" />
            ) : pipelineStatus.success ? (
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}
            <span>{pipelineStatus.running ? 'Running Pipeline...' : pipelineStatus.success ? 'Pipeline Complete' : 'Run End-to-End Pipeline'}</span>
          </Button>
        </div>

        {pipelineStatus.error && (
          <div className="text-xs text-red-500 mt-2">
            Error running pipeline: {pipelineStatus.error}
          </div>
        )}

        {/* Tab 1: Overview Canvas */}
        <TabsContent value="zentra" className="m-0 focus-visible:outline-none">
          <ZentraDashboard summary={summary} exposures={exposures} />
        </TabsContent>

        {/* Tab: Kafka Live Stream */}
        <TabsContent value="kafka" className="m-0 focus-visible:outline-none">
          <KafkaLiveStreamCard onRefreshPortfolio={loadData} />
        </TabsContent>

        {/* Tab 2: Sector Analytics */}
        <TabsContent value="analytics" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="page-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Exposure by Rating Bucket</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-5 ml-6">50,000 facilities mapped across Basel rating scale</p>
              <RatingBarChart data={exposures.by_rating} />
            </div>

            <div className="page-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Sector Diversification</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-5 ml-6">Concentration across 10 global industry classifications</p>
              <SectorPieChart data={exposures.by_sector} />
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Stress Scenarios */}
        <TabsContent value="stress" className="space-y-4 m-0">
          <div className="page-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-foreground">CCAR & EBA Stress Testing Projections</h3>
                <p className="text-xs text-muted-foreground">Macroeconomic baseline vs adverse projections on credit portfolio</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 text-xs">
              {/* Base */}
              <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-emerald-400">Base Scenario</span>
                  </div>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">TTC Normal</Badge>
                </div>
                <p className="text-muted-foreground">GDP +6.0%, IR 6.5%, Unemployment 5.0%</p>
                <div className="pt-3 border-t border-emerald-500/20">
                  <p className="text-emerald-400 font-extrabold text-sm font-mono">
                    Projected EL: ${(summary.total_expected_loss / 1e9).toFixed(2)}B
                  </p>
                </div>
              </div>

              {/* Adverse */}
              <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-amber-400">Adverse Scenario</span>
                  </div>
                  <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">Moderate</Badge>
                </div>
                <p className="text-muted-foreground">GDP +3.0%, IR 8.0%, Unemployment 8.0%</p>
                <div className="pt-3 border-t border-amber-500/20">
                  <p className="text-amber-400 font-extrabold text-sm font-mono">
                    Projected EL: ${((summary.total_expected_loss * 1.58) / 1e9).toFixed(2)}B <span className="text-[10px] font-normal">(+58%)</span>
                  </p>
                </div>
              </div>

              {/* Severe */}
              <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-bold text-rose-400">Severely Adverse</span>
                  </div>
                  <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-[10px]">Severe Shock</Badge>
                </div>
                <p className="text-muted-foreground">GDP -2.0%, IR 10.0%, Unemployment 14.0%</p>
                <div className="pt-3 border-t border-rose-500/20">
                  <p className="text-rose-400 font-extrabold text-sm font-mono">
                    Projected EL: ${((summary.total_expected_loss * 2.85) / 1e9).toFixed(2)}B <span className="text-[10px] font-normal">(+185%)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Capital Buffers */}
        <TabsContent value="capital" className="space-y-4 m-0">
          <div className="page-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Basel Pillar 1 Regulatory Capital Adequacy</h3>
                <p className="text-xs text-muted-foreground">Capital requirements, unexpected loss reserves, and tail quantiles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: '95% Credit VaR', value: `$${(summary.var_95 / 1e9).toFixed(2)}B`, color: 'text-sky-400' },
                { label: '99% Credit VaR (Pillar 1)', value: `$${(summary.var_99 / 1e9).toFixed(2)}B`, color: 'text-rose-400' },
                { label: 'Unexpected Loss (UL)', value: `$${((summary.var_99 - summary.total_expected_loss) / 1e9).toFixed(2)}B`, color: 'text-violet-400' },
              ].map((metric) => (
                <div key={metric.label} className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  <div className={`text-2xl font-bold font-mono ${metric.color} mt-1`}>{metric.value}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
