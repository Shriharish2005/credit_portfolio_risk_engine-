import React, { useEffect, useState } from 'react';
import { FileText, Download, Printer, CheckCircle2, BarChart2, Layers, Activity } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { riskApi } from '../services/api';
import { PortfolioReport } from '../types';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    riskApi.getPortfolioReport()
      .then((data) => { setReport(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-risk-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner message="Generating consolidated institutional risk report..." />;
  if (!report) return null;

  const fmtCurrency = (n: number) => {
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const summaryMetrics = [
    { label: 'Total Portfolio EAD', value: fmtCurrency(report.executive_summary.total_exposure), color: 'text-foreground' },
    { label: 'Total Expected Loss', value: fmtCurrency(report.executive_summary.total_expected_loss), color: 'text-amber-400' },
    { label: 'Weighted Avg PD', value: `${(report.executive_summary.weighted_pd * 100).toFixed(2)}%`, color: 'text-emerald-400' },
    { label: 'Weighted Avg LGD', value: `${(report.executive_summary.weighted_lgd * 100).toFixed(1)}%`, color: 'text-violet-400' },
  ];

  const capitalMetrics = [
    { label: '95% Credit VaR', value: fmtCurrency(report.capital_and_tail_risk.var_95), color: 'text-sky-400' },
    { label: '99% Credit VaR', value: fmtCurrency(report.capital_and_tail_risk.var_99), color: 'text-rose-400' },
    { label: '99% Expected Shortfall (CVaR)', value: fmtCurrency(report.capital_and_tail_risk.expected_shortfall_99), color: 'text-violet-400' },
    { label: '99% Unexpected Loss (UL)', value: fmtCurrency(report.capital_and_tail_risk.unexpected_loss_99), color: 'text-foreground' },
  ];

  const concentrationMetrics = [
    { label: 'Obligor HHI', value: report.concentration_metrics.hhi_borrower.toFixed(6), color: 'text-foreground' },
    { label: 'Effective Obligors (N_eff)', value: report.concentration_metrics.effective_obligors.toFixed(0), color: 'text-emerald-400' },
    { label: 'Top 10 Obligor Share', value: `${(report.concentration_metrics.top_10_share * 100).toFixed(2)}%`, color: 'text-amber-400' },
    { label: 'Sector HHI', value: `${report.concentration_metrics.hhi_sector_bps.toFixed(0)} bps`, color: 'text-sky-400' },
  ];

  const sections = [
    { num: '1', title: 'Executive Portfolio Risk Profile', icon: Activity, metrics: summaryMetrics },
    { num: '2', title: 'Economic Capital & Tail Risk Metrics', icon: BarChart2, metrics: capitalMetrics },
    { num: '3', title: 'Concentration & Governance Audit', icon: Layers, metrics: concentrationMetrics },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{report.report_title}</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-7 font-mono">
            {report.regulatory_framework} &bull; Generated: {report.generated_at}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadJson}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-muted hover:bg-muted/70 text-foreground text-xs font-mono border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Sections */}
      <div className="page-card p-8 space-y-8">
        {sections.map(({ num, title, icon: Icon, metrics }, idx) => (
          <div key={num} className={idx > 0 ? 'pt-8 border-t border-border' : ''}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-mono">
                {num}
              </div>
              <Icon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">{title}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map(({ label, value, color }) => (
                <div key={label} className="p-4 rounded-xl bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground font-mono">{label}:</span>
                  <p className={`text-base font-bold ${color} mt-1.5 font-mono`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="pt-6 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono">
            Report compliant with {report.regulatory_framework} — All figures are model estimates for risk management purposes only.
          </span>
        </div>
      </div>
    </div>
  );
};
