import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Brain, Zap, Target, Shield, CheckCircle2, AlertTriangle,
  TrendingUp, BarChart2, Layers, ArrowRight, Activity,
  Eye, GitBranch, Database, FlaskConical, Scale,
  ChevronUp, ChevronDown, Minus, Info, Star, FileCode,
  Filter, Sparkles, SlidersHorizontal, Check
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/ui/badge';
import { riskApi } from '../services/api';
import { useTheme } from '../lib/theme';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ModelMetrics {
  model_name: string; model_type: string; roc_auc: number; gini: number;
  ks_statistic: number; brier_score: number; log_loss: number;
  precision: number; recall: number; f1_score: number;
  training_time_s: number; explainability: string;
  regulatory_approval: string; color: string;
}
interface SHAPFeature {
  feature: string; shap_value: number; direction: string; category: string;
}
interface WorkflowStep {
  step: number; title: string; description: string; tools: string[]; status: string;
}
interface MLData {
  models: ModelMetrics[]; shap_features: SHAPFeature[];
  workflow: WorkflowStep[]; performance_comparison: any[]; summary: Record<string, string | number>;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const ExplainabilityBadge: React.FC<{ level: string }> = ({ level }) => {
  const cfg = {
    'High':   { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <Eye className="w-3 h-3" /> },
    'Medium': { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',       icon: <Eye className="w-3 h-3" /> },
    'Low':    { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',           icon: <Eye className="w-3 h-3" /> },
  }[level] ?? { cls: 'bg-muted text-muted-foreground border-border', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.icon} {level}
    </span>
  );
};

const ApprovalBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = {
    'Approved':    { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    'Challenger':  { cls: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    'Research':    { cls: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  }[status] ?? { cls: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {status}
    </span>
  );
};

const WorkflowStatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const icons: Record<string, React.ReactNode> = {
    input:      <Database className="w-4 h-4 text-sky-400" />,
    process:    <Zap className="w-4 h-4 text-amber-400" />,
    output:     <Target className="w-4 h-4 text-emerald-400" />,
    governance: <Shield className="w-4 h-4 text-violet-400" />,
  };
  const colors: Record<string, string> = {
    input: 'bg-sky-500/10 border-sky-500/30',
    process: 'bg-amber-500/10 border-amber-500/30',
    output: 'bg-emerald-500/10 border-emerald-500/30',
    governance: 'bg-violet-500/10 border-violet-500/30',
  };
  return (
    <div className={`p-2 rounded-xl border ${colors[status] || 'bg-muted border-border'}`}>
      {icons[status] || <Activity className="w-4 h-4" />}
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────
export const MLCreditRiskPage: React.FC = () => {
  const [data, setData] = useState<MLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState<string>('LightGBM');
  
  // Radar Interactive Controls
  const [radarSelectedModels, setRadarSelectedModels] = useState<string[]>([]);
  const [radarFocusMetric, setRadarFocusMetric] = useState<string | null>(null);

  // Simulator State
  const [simDTI, setSimDTI] = useState<number>(35);
  const [simUtil, setSimUtil] = useState<number>(60);
  const [simIncome, setSimIncome] = useState<number>(85000);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    riskApi.getMLOverview()
      .then((res: MLData) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading ML Credit Risk Intelligence Engine..." />;
  if (!data) return null;

  const selectedModel = data.models.find(m => m.model_name === activeModel) ?? data.models[0];
  const baselineModel = data.models[0]; // Logistic Regression

  // ── Chart: SHAP Horizontal Bar ────────────────────────────────────────────
  const shapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: isDark ? '#1e293b' : '#fff',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      formatter: (params: any) => {
        const item = data.shap_features[params[0].dataIndex];
        return `<div style="font-family:monospace;font-size:11px;line-height:1.7">
          <b>${item.feature}</b><br/>
          <span style="color:#94a3b8">SHAP:</span> <b>${item.shap_value.toFixed(4)}</b><br/>
          <span style="color:#94a3b8">Direction:</span> <b style="color:${item.direction === 'risk_increasing' ? '#f43f5e' : '#10b981'}">${item.direction === 'risk_increasing' ? '▲ Risk ↑' : '▼ Risk ↓'}</b><br/>
          <span style="color:#94a3b8">Category:</span> ${item.category}
        </div>`;
      },
    },
    grid: { left: '2%', right: '10%', top: '3%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: [...data.shap_features].reverse().map(f => f.feature.length > 28 ? f.feature.slice(0, 26) + '…' : f.feature), axisLabel: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 10, fontFamily: 'monospace' }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar',
      data: [...data.shap_features].reverse().map(f => ({
        value: f.shap_value,
        itemStyle: {
          color: f.direction === 'risk_increasing' ? '#f43f5e' : '#10b981',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barMaxWidth: 24,
      label: { show: true, position: 'right', color: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontFamily: 'monospace', formatter: (p: any) => p.value.toFixed(3) },
    }],
  };

  // ── Chart: Radar (Discrimination & Calibration Frontier) ─────────────────
  const radarDimensions = [
    { key: 'roc_auc', name: 'ROC-AUC', max: 0.95, min: 0.65, description: 'Separation of good vs bad borrowers' },
    { key: 'gini', name: 'Gini / AR', max: 0.90, min: 0.40, description: 'Accuracy Ratio (2 × AUC - 1)' },
    { key: 'ks_statistic', name: 'KS Stat', max: 0.65, min: 0.25, description: 'Max separation of cumulative distributions' },
    { key: 'f1_score', name: 'F1 Score', max: 0.85, min: 0.50, description: 'Harmonic mean of precision & recall' },
    { key: 'precision', name: 'Precision', max: 0.85, min: 0.50, description: 'Correctness of default flags' },
    { key: 'recall', name: 'Recall', max: 0.85, min: 0.50, description: 'Coverage of actual defaults' },
  ];

  const visibleModels = data.models.filter(m => 
    radarSelectedModels.length === 0 || radarSelectedModels.includes(m.model_name)
  );

  const radarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 11, fontFamily: 'monospace' },
      formatter: (params: any) => {
        const model = data.models.find(m => m.model_name === params.name);
        if (!model) return '';
        return `
          <div style="font-family: Inter, system-ui, sans-serif; min-width: 190px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid ${isDark ? '#334155' : '#f1f5f9'};">
              <span style="font-weight:700;color:${model.color};font-size:12px;">${model.model_name}</span>
              <span style="font-size:9px;font-family:monospace;padding:1px 6px;border-radius:999px;background:${isDark ? '#1e293b' : '#f1f5f9'};color:${isDark ? '#cbd5e1' : '#475569'};font-weight:600;">${model.model_type}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px;font-family:monospace;">
              <div><span style="color:#94a3b8">ROC-AUC:</span> <b>${model.roc_auc.toFixed(3)}</b></div>
              <div><span style="color:#94a3b8">Gini:</span> <b>${model.gini.toFixed(3)}</b></div>
              <div><span style="color:#94a3b8">KS Stat:</span> <b>${model.ks_statistic.toFixed(3)}</b></div>
              <div><span style="color:#94a3b8">F1 Score:</span> <b>${model.f1_score.toFixed(3)}</b></div>
              <div><span style="color:#94a3b8">Precision:</span> <b>${model.precision.toFixed(3)}</b></div>
              <div><span style="color:#94a3b8">Recall:</span> <b>${model.recall.toFixed(3)}</b></div>
            </div>
          </div>
        `;
      },
    },
    radar: {
      indicator: radarDimensions.map(d => ({
        name: d.name,
        max: d.max,
        min: d.min,
      })),
      shape: 'polygon',
      radius: '68%',
      center: ['50%', '52%'],
      nameGap: 10,
      axisName: {
        color: isDark ? '#cbd5e1' : '#334155',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        formatter: (value: string) => {
          if (radarFocusMetric && radarFocusMetric === value) {
            return `{focused|● ${value}}`;
          }
          return value;
        },
        rich: {
          focused: {
            color: '#3b82f6',
            fontWeight: 800,
            fontSize: 12,
            backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
            padding: [2, 6],
            borderRadius: 4,
          }
        }
      },
      splitNumber: 4,
      splitLine: {
        lineStyle: {
          color: isDark
            ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0.14)']
            : ['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.12)'],
          type: 'dashed'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: isDark
            ? ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.04)']
            : ['rgba(0,0,0,0.01)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.03)', 'rgba(0,0,0,0.04)'],
        }
      },
      axisLine: {
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        }
      },
    },
    series: [{
      type: 'radar',
      data: visibleModels.map(m => {
        const isHighlighted = activeModel === m.model_name;
        return {
          name: m.model_name,
          value: [m.roc_auc, m.gini, m.ks_statistic, m.f1_score, m.precision, m.recall],
          lineStyle: {
            color: m.color,
            width: isHighlighted ? 3.5 : 2,
            shadowColor: isHighlighted ? m.color : 'transparent',
            shadowBlur: isHighlighted ? 10 : 0,
          },
          areaStyle: {
            color: m.color,
            opacity: isHighlighted ? 0.28 : (radarSelectedModels.length === 1 ? 0.25 : 0.06),
          },
          symbol: 'circle',
          symbolSize: isHighlighted ? 7 : 4,
          itemStyle: {
            color: m.color,
            borderColor: isDark ? '#0f172a' : '#ffffff',
            borderWidth: isHighlighted ? 2 : 1,
          },
        };
      }),
    }],
  };

  // ── Chart: AUC Bar Comparison ─────────────────────────────────────────────
  const aucBarOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'none' }, backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', borderWidth: 1, textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 11, fontFamily: 'monospace' } },
    grid: { left: '2%', right: '5%', top: '8%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: data.models.map(m => m.model_name.replace(' ', '\n')), axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontFamily: 'monospace', interval: 0 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', min: 0.6, max: 1.0, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontFamily: 'monospace', formatter: (v: number) => v.toFixed(2) }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar',
      data: data.models.map(m => ({
        value: m.roc_auc,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: m.color }, { offset: 1, color: m.color + '44' }] },
          borderRadius: [6, 6, 0, 0],
        },
      })),
      barMaxWidth: 50,
      label: { show: true, position: 'top', color: isDark ? '#cbd5e1' : '#475569', fontSize: 10, fontFamily: 'monospace', formatter: (p: any) => p.value.toFixed(3) },
      showBackground: true,
      backgroundStyle: { color: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: [6, 6, 0, 0] },
    }],
  };

  const categoryColors: Record<string, string> = {
    Financial: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    Behavioral: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Macroeconomic: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    Structural: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  };

  return (
    <div className="space-y-6 pb-10">

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="page-card overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500" />
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-indigo-500/30">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold">ML Credit Risk Intelligence</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Machine Learning for Credit Risk</h2>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground">Champion:</span>
              <span className="text-foreground font-semibold">{data.summary.champion_status}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-muted-foreground">Challenger:</span>
              <span className="text-foreground font-semibold">{data.summary.challenger_status}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-muted-foreground">Best AUC:</span>
              <span className="text-amber-400 font-bold">{data.summary.best_auc} ({data.summary.auc_improvement_over_baseline} vs LR)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Three Core Concepts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'PD', full: 'Probability of Default', desc: 'Likelihood a borrower fails to repay within a 12-month horizon. Calibrated via Logistic Regression or XGBoost.', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-rose-400', border: 'border-rose-500/25', bg: 'bg-rose-500/5', bar: 'bg-rose-500', pct: '68%' },
          { label: 'LGD', full: 'Loss Given Default', desc: 'Expected economic loss rate if default occurs, net of collateral recovery. Modeled with regression on workout data.', icon: <Scale className="w-5 h-5" />, color: 'text-amber-400', border: 'border-amber-500/25', bg: 'bg-amber-500/5', bar: 'bg-amber-500', pct: '45%' },
          { label: 'EAD', full: 'Exposure at Default', desc: 'Outstanding loan balance + Credit Conversion Factor × undrawn portion at time of default event.', icon: <Layers className="w-5 h-5" />, color: 'text-sky-400', border: 'border-sky-500/25', bg: 'bg-sky-500/5', bar: 'bg-sky-500', pct: '82%' },
        ].map(({ label, full, desc, icon, color, border, bg, bar, pct }) => (
          <div key={label} className={`page-card p-5 border ${border} ${bg}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl border ${border} ${color}`}>{icon}</div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${color}`}>{label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{full}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{desc}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>Portfolio avg</span><span className={color}>{pct}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: pct }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Expected Loss Formula Banner ───────────────────────────────────── */}
      <div className="page-card p-5 bg-gradient-to-r from-indigo-500/5 via-fuchsia-500/5 to-sky-500/5 border-indigo-500/20">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Basel IRB Formula</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black font-mono text-foreground">EL</span>
            <span className="text-xl text-muted-foreground">=</span>
            <span className="text-xl font-bold font-mono text-rose-400">PD</span>
            <span className="text-xl text-muted-foreground">×</span>
            <span className="text-xl font-bold font-mono text-amber-400">LGD</span>
            <span className="text-xl text-muted-foreground">×</span>
            <span className="text-xl font-bold font-mono text-sky-400">EAD</span>
          </div>
          <div className="flex gap-4 text-xs font-mono text-muted-foreground">
            <span><span className="text-foreground font-semibold">{data.summary.data_points_trained?.toLocaleString()}</span> loans trained</span>
            <span><span className="text-foreground font-semibold">{data.summary.features_used}</span> features</span>
            <span>Default rate <span className="text-rose-400 font-semibold">{data.summary.default_rate}</span></span>
          </div>
        </div>
      </div>

      {/* ── Model Comparison Cards ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Model Comparison: Traditional vs ML Challengers</h3>
          <span className="text-xs text-muted-foreground ml-1">— Click a model to inspect metrics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.models.map((m) => {
            const isActive = activeModel === m.model_name;
            const auc_delta = m.roc_auc - baselineModel.roc_auc;
            return (
              <button
                key={m.model_name}
                onClick={() => setActiveModel(m.model_name)}
                className={`page-card p-4 text-left transition-all cursor-pointer`}
                style={{ outline: isActive ? `2px solid ${m.color}` : '2px solid transparent', outlineOffset: '2px' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <ApprovalBadge status={m.regulatory_approval} />
                </div>
                <p className="text-xs font-bold text-foreground leading-snug mb-1">{m.model_name}</p>
                <p className="text-[10px] font-mono text-muted-foreground mb-3">{m.model_type}</p>
                <div className="text-xl font-black font-mono" style={{ color: m.color }}>
                  {m.roc_auc.toFixed(3)}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">ROC-AUC</p>
                {auc_delta > 0 && (
                  <div className="flex items-center gap-0.5 mt-1 text-[10px] font-mono text-emerald-400">
                    <ChevronUp className="w-3 h-3" />+{(auc_delta * 100).toFixed(1)}% vs LR
                  </div>
                )}
                {auc_delta === 0 && (
                  <div className="flex items-center gap-0.5 mt-1 text-[10px] font-mono text-muted-foreground">
                    <Minus className="w-3 h-3" />Baseline
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected Model Deep-Dive ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Metrics grid */}
        <div className="lg:col-span-1 page-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedModel.color }} />
            <h4 className="text-sm font-bold text-foreground">{selectedModel.model_name}</h4>
            <ApprovalBadge status={selectedModel.regulatory_approval} />
          </div>
          <div className="space-y-3">
            {[
              { label: 'ROC-AUC', value: selectedModel.roc_auc.toFixed(3), color: 'text-foreground', good: selectedModel.roc_auc > 0.8 },
              { label: 'Gini (AR)', value: selectedModel.gini.toFixed(3), color: 'text-foreground', good: selectedModel.gini > 0.6 },
              { label: 'KS Statistic', value: selectedModel.ks_statistic.toFixed(3), color: 'text-foreground', good: selectedModel.ks_statistic > 0.45 },
              { label: 'F1 Score', value: selectedModel.f1_score.toFixed(3), color: 'text-foreground', good: selectedModel.f1_score > 0.7 },
              { label: 'Precision', value: selectedModel.precision.toFixed(3), color: 'text-foreground', good: true },
              { label: 'Recall', value: selectedModel.recall.toFixed(3), color: 'text-foreground', good: true },
              { label: 'Brier Score ↓', value: selectedModel.brier_score.toFixed(4), color: 'text-foreground', good: selectedModel.brier_score < 0.07 },
              { label: 'Training Time', value: `${selectedModel.training_time_s}s`, color: 'text-muted-foreground', good: selectedModel.training_time_s < 10 },
            ].map(({ label, value, good }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-foreground">{value}</span>
                  {good ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">Explainability</span>
                <ExplainabilityBadge level={selectedModel.explainability} />
              </div>
            </div>
          </div>
        </div>

        {/* Radar chart */}
        <div className="lg:col-span-2 page-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    All-Model Radar: Discrimination & Calibration
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Frontier View
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Multi-dimensional overlay across 6 discrimination & goodness-of-fit metrics
                  </p>
                </div>
              </div>

              {/* Quick Model Filter Pills */}
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  onClick={() => setRadarSelectedModels([])}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md transition-all cursor-pointer font-medium ${
                    radarSelectedModels.length === 0
                      ? 'bg-foreground text-background font-bold shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title="Show all 5 models overlaid"
                >
                  All (5)
                </button>
                {data.models.map(m => {
                  const isFiltered = radarSelectedModels.includes(m.model_name);
                  const isCurrentActive = activeModel === m.model_name;
                  return (
                    <button
                      key={m.model_name}
                      onClick={() => {
                        if (radarSelectedModels.length === 0) {
                          setRadarSelectedModels([m.model_name]);
                        } else if (isFiltered) {
                          const next = radarSelectedModels.filter(name => name !== m.model_name);
                          setRadarSelectedModels(next);
                        } else {
                          setRadarSelectedModels([...radarSelectedModels, m.model_name]);
                        }
                      }}
                      onMouseEnter={() => setActiveModel(m.model_name)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isFiltered || radarSelectedModels.length === 0
                          ? isCurrentActive
                            ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                            : 'bg-card border-border text-foreground hover:border-primary/50'
                          : 'opacity-40 border-transparent bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                      <span className="truncate max-w-[85px]">{m.model_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metric Dimension Info Tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-2 text-[10px] font-mono text-muted-foreground">
              <span className="shrink-0 text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Focus Metric:
              </span>
              {radarDimensions.map(d => (
                <button
                  key={d.name}
                  onClick={() => setRadarFocusMetric(radarFocusMetric === d.name ? null : d.name)}
                  className={`px-2 py-0.5 rounded-full border shrink-0 transition-colors cursor-pointer ${
                    radarFocusMetric === d.name
                      ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 font-bold'
                      : 'border-border/60 hover:border-border hover:text-foreground bg-muted/20'
                  }`}
                  title={d.description}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Radar Chart Canvas */}
          <div className="h-72 w-full my-auto">
            <ReactECharts
              option={radarOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
              onEvents={{
                mouseover: (params: any) => {
                  if (params.name && data.models.some(m => m.model_name === params.name)) {
                    setActiveModel(params.name);
                  }
                }
              }}
            />
          </div>

          {/* Legend and Active Model Key Stats Bar */}
          <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Active Model:</span>
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedModel.color }} />
                {selectedModel.model_name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                (AUC <span className="font-bold text-foreground">{selectedModel.roc_auc.toFixed(3)}</span> • Gini <span className="font-bold text-foreground">{selectedModel.gini.toFixed(3)}</span>)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Sparkles className="w-3 h-3" /> Frontier Best: LightGBM (AUC 0.852)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AUC Bar + SHAP ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* AUC Bar Chart */}
        <div className="page-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">ROC-AUC by Model</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-4 ml-6">Higher AUC = better separation of defaulters vs non-defaulters</p>
          <div className="h-52">
            <ReactECharts option={aucBarOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
          </div>
        </div>

        {/* SHAP Importance */}
        <div className="page-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-foreground">SHAP Feature Importance (XGBoost)</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-4 ml-6">
            <span className="text-rose-400 font-semibold">Red = risk ↑</span> &nbsp; <span className="text-emerald-400 font-semibold">Green = risk ↓</span>
          </p>
          <div className="h-52">
            <ReactECharts option={shapOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
          </div>
        </div>
      </div>

      {/* ── SHAP Feature Table ─────────────────────────────────────────────── */}
      <div className="page-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <FlaskConical className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-bold text-foreground">SHAP Explainability — Top Feature Drivers</h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ml-auto">XGBoost Champion Challenger</span>
        </div>
        <div className="divide-y divide-border/60">
          {data.shap_features.map((f, i) => (
            <div key={f.feature} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
              <span className="text-[11px] font-mono text-muted-foreground/60 w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{f.feature}</p>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${categoryColors[f.category] || 'bg-muted text-muted-foreground border-border'}`}>
                  {f.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-48">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(f.shap_value / data.shap_features[0].shap_value) * 100}%`,
                      backgroundColor: f.direction === 'risk_increasing' ? '#f43f5e' : '#10b981'
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold w-10 text-right text-foreground">{f.shap_value.toFixed(4)}</span>
              </div>
              <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${f.direction === 'risk_increasing' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>
                {f.direction === 'risk_increasing' ? '▲ Risk +' : '▼ Risk −'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live ML Decision Simulator ──────────────────────────────────────── */}
      <div className="page-card p-6 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">Live Decisioning Simulator</h3>
            <p className="text-xs text-muted-foreground">Adjust borrower parameters to see how ML models capture non-linear risk vs Traditional Scorecards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            
            {/* DTI Slider */}
            <div className="bg-background rounded-2xl p-5 border border-border shadow-xs transition-all hover:border-amber-500/40 hover:shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <label className="text-sm font-semibold text-foreground tracking-tight">Debt-to-Income (DTI)</label>
                  <div className="text-3xl font-extrabold text-amber-500 font-sans tracking-tighter mt-1">{simDTI}%</div>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-mono font-bold border border-amber-500/20 uppercase tracking-widest">
                  Weight: High
                </div>
              </div>
              <div className="relative pt-1 pb-1">
                <input 
                  type="range" min="10" max="80" step="1" 
                  value={simDTI} onChange={(e) => setSimDTI(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                  style={{
                    backgroundImage: `linear-gradient(to right, #f59e0b ${((simDTI - 10) / 70) * 100}%, transparent ${((simDTI - 10) / 70) * 100}%)`,
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-2 font-mono font-medium">
                <span>10%</span><span>80%</span>
              </div>
            </div>

            {/* Credit Util Slider */}
            <div className="bg-background rounded-2xl p-5 border border-border shadow-xs transition-all hover:border-amber-500/40 hover:shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <label className="text-sm font-semibold text-foreground tracking-tight">Credit Utilization</label>
                  <div className="text-3xl font-extrabold text-amber-500 font-sans tracking-tighter mt-1">{simUtil}%</div>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-mono font-bold border border-amber-500/20 uppercase tracking-widest">
                  Weight: Med
                </div>
              </div>
              <div className="relative pt-1 pb-1">
                <input 
                  type="range" min="0" max="100" step="1" 
                  value={simUtil} onChange={(e) => setSimUtil(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                  style={{
                    backgroundImage: `linear-gradient(to right, #f59e0b ${simUtil}%, transparent ${simUtil}%)`,
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-2 font-mono font-medium">
                <span>0%</span><span>100%</span>
              </div>
            </div>

            {/* Income Slider */}
            <div className="bg-background rounded-2xl p-5 border border-border shadow-xs transition-all hover:border-amber-500/40 hover:shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <label className="text-sm font-semibold text-foreground tracking-tight">Annual Income</label>
                  <div className="text-3xl font-extrabold text-amber-500 font-sans tracking-tighter mt-1">${(simIncome / 1000).toFixed(0)}k</div>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-mono font-bold border border-amber-500/20 uppercase tracking-widest">
                  Weight: Low
                </div>
              </div>
              <div className="relative pt-1 pb-1">
                <input 
                  type="range" min="30000" max="250000" step="5000" 
                  value={simIncome} onChange={(e) => setSimIncome(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                  style={{
                    backgroundImage: `linear-gradient(to right, #f59e0b ${((simIncome - 30000) / 220000) * 100}%, transparent ${((simIncome - 30000) / 220000) * 100}%)`,
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-2 font-mono font-medium">
                <span>$30k</span><span>$250k</span>
              </div>
            </div>
            
          </div>

          {/* Results Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Logistic Regression Card */}
            <div className="p-5 rounded-2xl bg-background border border-indigo-500/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-foreground">Traditional (LR)</h4>
                <ApprovalBadge status="Approved" />
              </div>
              
              {(() => {
                // Linear calculation
                const base = 0.02;
                const dtiEffect = (simDTI - 30) * 0.0015;
                const utilEffect = (simUtil - 30) * 0.001;
                const incEffect = ((100000 - simIncome) / 10000) * 0.002;
                const pd = Math.max(0.005, Math.min(0.99, base + dtiEffect + utilEffect + incEffect));
                const isApproved = pd < 0.15;

                return (
                  <>
                    <div className="mb-4">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Predicted PD</p>
                      <div className="text-3xl font-black font-mono text-indigo-500">{(pd * 100).toFixed(1)}%</div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Decision</p>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {isApproved ? 'APPROVE' : 'DECLINE'}
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                      Linear model scales risk proportionally. Misses the compounding danger of high DTI combined with maxed-out utilization.
                    </p>
                  </>
                );
              })()}
            </div>

            {/* XGBoost Card */}
            <div className="p-5 rounded-2xl bg-background border border-fuchsia-500/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-foreground">XGBoost (ML)</h4>
                <ApprovalBadge status="Challenger" />
              </div>
              
              {(() => {
                // Non-linear calculation (punishes combinations heavily)
                const base = 0.015;
                let dtiEffect = (simDTI - 30) * 0.0012;
                if (simDTI > 50) dtiEffect += (simDTI - 50) * 0.004; // Non-linear spike
                
                let utilEffect = (simUtil - 30) * 0.0008;
                if (simUtil > 80) utilEffect += (simUtil - 80) * 0.006; // Non-linear spike
                
                // Interaction effect: High DTI + High Util = Massive Risk
                let interaction = 0;
                if (simDTI > 45 && simUtil > 75) {
                  interaction = 0.08;
                }
                
                const incEffect = ((100000 - simIncome) / 10000) * 0.0015;
                const pd = Math.max(0.001, Math.min(0.99, base + dtiEffect + utilEffect + interaction + incEffect));
                const isApproved = pd < 0.15;

                return (
                  <>
                    <div className="mb-4">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Predicted PD</p>
                      <div className="text-3xl font-black font-mono text-fuchsia-500">{(pd * 100).toFixed(1)}%</div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Decision</p>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {isApproved ? 'APPROVE' : 'DECLINE'}
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                      Tree-based model detects non-linear tipping points (e.g. utilization &gt; 80%) and feature interactions (High Util + High DTI).
                    </p>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
