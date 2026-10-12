import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, ShieldAlert, Award, Activity } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RocChart } from '../charts/RocChart';
import { riskApi } from '../services/api';
import { ValidationResponse } from '../types';

export const ValidationPage: React.FC = () => {
  const [data, setData] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    riskApi.runModelValidation(5000, 10)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Evaluating credit risk model discrimination, calibration & PSI stability..." />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Quantitative Credit Model Validation & Backtesting</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7">
          Independent diagnostic testing for discrimination power, probability calibration, and population stability
        </p>
      </div>

      {/* Regulatory & Educational Disclaimer Alert */}
      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-lg flex items-start space-x-3 text-xs text-foreground">
        <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Engineering Diagnostic Notice: </span>
          {data.disclaimer} Standard statistical checks (ROC, KS, Brier, PSI) follow Basel internal ratings-based (IRB) methodology.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="ROC-AUC Score"
          value={data.discrimination.roc_auc.toFixed(3)}
          subtitle="Area Under ROC Curve (>0.70 acceptable)"
          badge={data.discrimination.roc_auc > 0.75 ? 'Strong' : 'Moderate'}
          color="emerald"
        />
        <MetricCard
          title="Gini Coefficient (AR)"
          value={data.discrimination.gini.toFixed(3)}
          subtitle="Accuracy Ratio = 2 &times; AUC - 1"
          color="blue"
        />
        <MetricCard
          title="Kolmogorov-Smirnov (KS)"
          value={`${(data.discrimination.ks_statistic * 100).toFixed(1)}%`}
          subtitle={`Max separation at PD threshold ${data.discrimination.ks_threshold.toFixed(3)}`}
          color="purple"
        />
        <MetricCard
          title="Population Stability (PSI)"
          value={data.stability.total_psi.toFixed(3)}
          subtitle={data.stability.status}
          badge={data.stability.traffic_light}
          color={data.stability.traffic_light === 'GREEN' ? 'emerald' : data.stability.traffic_light === 'AMBER' ? 'amber' : 'rose'}
        />
      </div>

      {/* ROC Curve Chart and Calibration Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="risk-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Receiver Operating Characteristic (ROC Curve)
          </h3>
          <RocChart
            rocCurve={data.discrimination.roc_curve}
            auc={data.discrimination.roc_auc}
            gini={data.discrimination.gini}
          />
        </div>

        <div className="risk-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Decile Calibration Curve (Hosmer-Lemeshow)
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">
              Brier Score: {data.calibration.brier_score.toFixed(4)}
            </span>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-mono sticky top-0">
                <tr>
                  <th className="px-3 py-2">Decile</th>
                  <th className="px-3 py-2 text-right">Sample</th>
                  <th className="px-3 py-2 text-right">Predicted PD</th>
                  <th className="px-3 py-2 text-right">Observed Def Rate</th>
                  <th className="px-3 py-2 text-right">Diff (&Delta;)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.calibration.calibration_curve.map((row) => (
                  <tr key={row.decile} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono font-medium text-foreground">Decile {row.decile}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{row.count}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-500">
                      {(row.predicted_pd * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-500">
                      {(row.observed_default_rate * 100).toFixed(2)}%
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${Math.abs(row.diff) > 0.05 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                      {(row.diff * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
