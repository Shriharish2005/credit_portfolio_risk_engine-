import React, { useState } from 'react';
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  Lightbulb,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Globe,
  Building2,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { PortfolioSummary, PortfolioExposures } from '../types';

interface ZentraDashboardProps {
  summary: PortfolioSummary;
  exposures: PortfolioExposures;
  onNavigate?: (tab: string) => void;
}

export const ZentraDashboard: React.FC<ZentraDashboardProps> = ({ summary, exposures, onNavigate }) => {
  const [activeStage, setActiveStage] = useState<number>(2); // Stage 3 active by default
  const [activeInsight, setActiveInsight] = useState<number>(0);
  const [breakdownType, setBreakdownType] = useState<'sector' | 'geography' | 'rating'>('sector');
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [showCarInfo, setShowCarInfo] = useState<boolean>(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveInsight((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Stages for the 3D isometric waterfall funnel (Credit Rating Distribution & Exposure)
  const maxExp = exposures?.by_rating?.length ? Math.max(...exposures.by_rating.map((r: any) => r.exposure)) : 1;
  const funnelStages = exposures?.by_rating?.slice(0, 5).map((r: any, i: number) => {
    const isSelected = i === activeStage;
    return {
      id: i,
      label: r.rating || `Tranche ${i+1}`,
      count: `${(r.loan_count / 1000).toFixed(1)}k`,
      exposure: `$${(r.exposure / 1e9).toFixed(1)}B`,
      heightPercent: Math.max(30, Math.floor((r.exposure / maxExp) * 95)),
      isHatched: !isSelected,
      color: isSelected ? '#2563EB' : '#3B82F6',
      highlightBadge: isSelected ? `${r.loan_count.toLocaleString()} facilities | Share: ${(r.share * 100).toFixed(1)}%` : undefined,
    };
  }) || [];

  // Green dot-matrix histogram data for "Transactions" (14 columns)
  const transactionDots = [
    [1, 1],
    [1, 1],
    [1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1], // Peak Wed
    [1, 1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1],
    [1, 1],
    [1, 1],
    [1],
    [1],
  ];

  // Blue dot-matrix histogram data for "Customers" (14 columns)
  const customerDots = [
    [1],
    [1, 1],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1, 1], // Highest Thu
    [1, 1, 1, 1],
    [1, 1, 1],
    [1, 1],
    [1, 1, 1],
    [1, 1],
    [1],
    [1],
  ];

  return (
    <div className="w-full space-y-6 select-none font-sans">
      {/* Upper Row: Left 3D Funnel Chart (8 cols) & Right Gross Volume Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* HERO CARD 1: 3D Isometric Hatched Payments / Exposure Funnel (8 cols) */}
        <div className="lg:col-span-8 zentra-card p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
          {/* Card Top Title */}
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#111827]">Credit Exposures by Rating Tranche</h2>
              <p className="text-xs text-[#6B7280]">50,000 facilities structured across Basel rating bands</p>
            </div>
          </div>

          {/* Stage Metrics Row Above Bars */}
          <div className="grid grid-cols-5 gap-2 pt-1 pb-4">
            {funnelStages.map((stage) => {
              const isSelected = activeStage === stage.id;
              return (
                <div
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className="cursor-pointer group space-y-1 text-left transition-all"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-[#6B7280] font-medium truncate block">
                      {stage.label}
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-[#111827] font-sans">
                    {stage.count}
                  </div>
                  {/* Subtle active indicator pill */}
                  <div className="h-1 w-6 rounded-full bg-[#3B82F6]/30 group-hover:bg-[#3B82F6] transition-colors" />
                </div>
              );
            })}
          </div>

          {/* 3D Isometric Faceted Hatched Funnel Chart Visual Area */}
          <div className="relative w-full h-[220px] flex items-end justify-between px-2 pt-4 pb-2 border-b border-black/[0.04]">
            {/* Background Y-Axis Guide Lines & Numbers */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40 text-[10px] text-[#9CA3AF] font-mono pr-2">
              <div className="border-b border-black/[0.04] w-full flex justify-start pb-0.5">70k</div>
              <div className="border-b border-black/[0.04] w-full flex justify-start pb-0.5">60k</div>
              <div className="border-b border-black/[0.04] w-full flex justify-start pb-0.5">50k</div>
              <div className="border-b border-black/[0.04] w-full flex justify-start pb-0.5">40k</div>
              <div className="border-b border-black/[0.04] w-full flex justify-start pb-0.5">30k</div>
            </div>

            {/* 3D Isometric Stage Pillars with Sloping Connecting Surfaces */}
            <div className="w-full h-full flex items-end justify-between relative z-10 pl-6">
              {funnelStages.map((stage, idx) => {
                const isSelected = activeStage === stage.id;
                return (
                  <div
                    key={stage.id}
                    onClick={() => setActiveStage(stage.id)}
                    className="flex-1 flex flex-col items-center justify-end h-full px-1.5 cursor-pointer relative group"
                  >
                    {/* Floating Hover Badge on Active Stage */}
                    {stage.highlightBadge && isSelected && (
                      <div className="absolute -top-3 z-30 transform -translate-y-full whitespace-nowrap bg-white/95 backdrop-blur-md border border-black/[0.08] shadow-lg rounded-full px-3 py-1 text-[11px] font-semibold text-[#1F2937] animate-in fade-in zoom-in-95 duration-200">
                        {stage.highlightBadge}
                      </div>
                    )}

                    {/* 3D Isometric Bar Container */}
                    <div
                      style={{ height: `${stage.heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 relative ${
                        isSelected
                          ? 'isometric-bar-active ring-2 ring-[#2563EB]/40'
                          : 'isometric-bar-hatched opacity-90 group-hover:opacity-100'
                      }`}
                    >
                      {/* Top 3D Bevel / Angled Facet */}
                      <div className="absolute -top-2 left-0 right-0 h-2 bg-white/30 rounded-t-sm transform -skew-x-12" />

                      {/* Side Shadow Angle */}
                      <div className="absolute top-0 right-0 w-2 h-full bg-black/10 rounded-tr-lg" />
                    </div>

                    {/* Stage Indicator Pill below bar */}
                    <div className="mt-2 text-center">
                      <span className="text-[10px] font-semibold text-[#9CA3AF] font-mono">
                        {stage.exposure}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


        </div>

        {/* HERO CARD 2: Gross Exposure / Total Exposure Breakdown (4 cols) */}
        {(() => {
          const colorThemes = [
            { name: 'green', stripe: 'stripe-green', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
            { name: 'blue', stripe: 'stripe-blue', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
            { name: 'pink', stripe: 'stripe-pink', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
            { name: 'amber', stripe: 'stripe-amber', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
            { name: 'purple', stripe: 'stripe-purple', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
            { name: 'cyan', stripe: 'stripe-cyan', dot: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
          ];

          const getBreakdownData = () => {
            if (breakdownType === 'geography') {
              return (exposures?.by_geography || []).map((item) => ({
                id: item.geography,
                name: item.geography,
                exposure: item.exposure,
                share: item.share,
                loan_count: item.loan_count,
              }));
            }
            if (breakdownType === 'rating') {
              return (exposures?.by_rating || []).map((item) => ({
                id: item.rating || 'Unrated',
                name: item.rating ? `Grade ${item.rating}` : 'Unrated',
                exposure: item.exposure,
                share: item.share,
                loan_count: item.loan_count,
              }));
            }
            return (exposures?.by_sector || []).map((item) => ({
              id: item.sector || 'Corporate',
              name: item.sector || 'Corporate',
              exposure: item.exposure,
              share: item.share,
              loan_count: item.loan_count,
            }));
          };

          const currentBreakdown = getBreakdownData();
          const maxExp = currentBreakdown.length > 0 ? Math.max(...currentBreakdown.map((i) => i.exposure)) : 1;
          const displayItems = showAllCategories ? currentBreakdown : currentBreakdown.slice(0, 3);

          return (
            <div className="lg:col-span-4 zentra-card p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between min-h-[460px] transition-all duration-300">
              <div>
                {/* Header with Dimension Filter Switch */}
                <div className="flex items-start justify-between pb-3 gap-2">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-[#111827] dark:text-white">Gross Credit Exposure</h2>
                    <p className="text-xs text-[#6B7280] dark:text-neutral-400">Total commitment across facilities</p>
                  </div>

                  {/* Dimension selector pills */}
                  <div className="flex items-center gap-0.5 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl text-[11px] font-semibold text-[#6B7280] dark:text-neutral-400 shadow-inner">
                    <button
                      type="button"
                      onClick={() => { setBreakdownType('sector'); setShowAllCategories(false); }}
                      className={`px-2 py-0.5 rounded-lg transition-all ${breakdownType === 'sector' ? 'bg-white dark:bg-neutral-800 text-[#111827] dark:text-white shadow-xs font-bold' : 'hover:text-[#111827] dark:hover:text-white'}`}
                      title="Breakdown by Industry Sector"
                    >
                      Sector
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBreakdownType('geography'); setShowAllCategories(false); }}
                      className={`px-2 py-0.5 rounded-lg transition-all ${breakdownType === 'geography' ? 'bg-white dark:bg-neutral-800 text-[#111827] dark:text-white shadow-xs font-bold' : 'hover:text-[#111827] dark:hover:text-white'}`}
                      title="Breakdown by Global Region"
                    >
                      Region
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBreakdownType('rating'); setShowAllCategories(false); }}
                      className={`px-2 py-0.5 rounded-lg transition-all ${breakdownType === 'rating' ? 'bg-white dark:bg-neutral-800 text-[#111827] dark:text-white shadow-xs font-bold' : 'hover:text-[#111827] dark:hover:text-white'}`}
                      title="Breakdown by Credit Rating"
                    >
                      Rating
                    </button>
                  </div>
                </div>

                {/* Amount & Growth Badge */}
                <div className="flex items-baseline justify-between pt-2 pb-3">
                  <div className="flex items-baseline space-x-3">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111827] dark:text-white font-sans">
                      ${(summary.total_exposure / 1e9).toFixed(1)}B
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1 text-xs font-bold text-[#10B981]">
                      <ArrowUp className="w-3 h-3 fill-current" />
                      <span>15% YoY</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-[#9CA3AF] font-mono hidden sm:inline-block">
                    {summary?.total_loans?.toLocaleString() || '50,000'} facilities
                  </span>
                </div>

                {/* Unified Segmented Allocation Preview Bar */}
                {currentBreakdown.length > 0 && (
                  <div className="w-full bg-[#F3F4F6] dark:bg-white/5 rounded-full h-2 overflow-hidden flex gap-0.5 p-0.5 mb-5 shadow-inner">
                    {currentBreakdown.slice(0, 6).map((seg, idx) => {
                      const theme = colorThemes[idx % colorThemes.length];
                      const isHovered = hoveredCategory === seg.id;
                      return (
                        <div
                          key={seg.id || idx}
                          className={`${theme.stripe} h-full rounded-full transition-all duration-300 cursor-pointer ${isHovered ? 'brightness-125 scale-y-125 shadow-sm' : 'opacity-90'}`}
                          style={{ width: `${Math.max(5, (seg.share * 100))}%` }}
                          onMouseEnter={() => setHoveredCategory(seg.id)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          title={`${seg.name}: ${(seg.share * 100).toFixed(1)}% ($${(seg.exposure / 1e9).toFixed(2)}B)`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Segmented Progress Rows */}
                <div className="space-y-4 pt-1 max-h-[260px] overflow-y-auto pr-1">
                  {displayItems.map((item: any, idx: number) => {
                    const theme = colorThemes[idx % colorThemes.length];
                    const isHovered = hoveredCategory === item.id;
                    // Proportional relative bar width so it nicely fills the bar and gives a meaningful comparative visual
                    const relativeWidth = Math.max(15, Math.round((item.exposure / maxExp) * 100));

                    return (
                      <div
                        className={`space-y-1.5 p-1.5 -mx-1.5 rounded-xl transition-all cursor-pointer ${isHovered ? 'bg-black/[0.02] dark:bg-white/[0.04]' : ''}`}
                        key={item.id || idx}
                        onMouseEnter={() => setHoveredCategory(item.id)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                            <span className="text-[#374151] dark:text-neutral-200 truncate max-w-[170px]">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-[#9CA3AF] font-mono hidden sm:inline">
                              {item.loan_count ? `(${item.loan_count.toLocaleString()})` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#111827] dark:text-white font-bold font-mono">
                              ${(item.exposure / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })}M
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] text-[#4B5563] dark:text-neutral-300">
                              {(item.share * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Enhanced Progress Bar Track & Bar */}
                        <div className="w-full bg-[#F3F4F6] dark:bg-white/5 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                          <div
                            className={`${theme.stripe} h-full rounded-full transition-all duration-500 ease-out ${isHovered ? 'brightness-110 shadow-sm' : ''}`}
                            style={{ width: `${relativeWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show All / Collapse Toggle */}
                {currentBreakdown.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="w-full mt-3 py-1.5 px-3 rounded-lg border border-dashed border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>{showAllCategories ? 'Show Top 3' : `View All ${currentBreakdown.length} Categories`}</span>
                    {showAllCategories ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Quick Basel Capital Ratio Footnote with Interactive Status */}
              <div className="pt-4 border-t border-black/[0.04] dark:border-white/[0.06] flex flex-col gap-2 mt-4">
                <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-medium text-[#4B5563] dark:text-neutral-300">Capital Adequacy Ratio (CAR)</span>
                    <button
                      type="button"
                      onClick={() => setShowCarInfo(!showCarInfo)}
                      className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white transition-colors"
                      title="Toggle Basel III CAR Details"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#10B981] font-mono text-xs">
                      14.2% &bull; Basel III Compliant
                    </span>
                  </div>
                </div>

                {showCarInfo && (
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 rounded-xl p-2.5 text-[11px] text-[#065F46] dark:text-emerald-300 space-y-1 animate-in fade-in duration-200">
                    <div className="font-semibold flex justify-between">
                      <span>Total Regulatory Capital / RWA:</span>
                      <span className="font-mono font-bold">14.20%</span>
                    </div>
                    <div className="text-[10px] text-[#047857] dark:text-emerald-400 flex justify-between">
                      <span>Basel III Minimum Requirement:</span>
                      <span className="font-mono">10.50%</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40 flex justify-between font-medium">
                      <span>Conservation Capital Buffer:</span>
                      <span className="font-mono font-bold">+3.70% ($6.93B headroom)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Lower Row: 3 Columns matching screenshots 2 & 4 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* CARD 3: Retention / Stepped Pink Area Chart (4 cols) */}
        <div className="md:col-span-4 zentra-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[#111827]">Default Trajectory & Loss</h3>
                <p className="text-xs text-[#6B7280]">Cumulative default rate & recovery</p>
              </div>
            </div>

            {/* Stepped Area Pink Chart Canvas Simulation */}
            <div className="relative w-full h-[150px] pt-6 flex items-end">
              {/* Floating 42% Badge */}
              <div className="absolute top-4 left-[40%] transform -translate-x-1/2 bg-white shadow-sm border border-black/[0.08] rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[#111827]">
                4.2% DR
              </div>

              {/* SVG Stepped Line and Drop Lines */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                {/* Vertical drop gridlines */}
                {[20, 50, 80, 110, 140, 170, 200, 230, 260, 290].map((x, i) => (
                  <line
                    key={i}
                    x1={x}
                    y1={30 + (i % 3) * 10}
                    x2={x}
                    y2="120"
                    stroke="#FEE2E2"
                    strokeWidth="1.5"
                  />
                ))}

                {/* Stepped magenta line */}
                <path
                  d="M 10 70 L 40 70 L 40 50 L 70 50 L 70 60 L 100 60 L 100 35 L 130 35 L 130 45 L 160 45 L 160 80 L 190 80 L 190 70 L 220 70 L 220 85 L 250 85 L 250 65 L 290 65"
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Peak dot */}
                <circle cx="120" cy="35" r="3.5" fill="#F43F5E" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Month labels */}
            <div className="flex justify-between text-[11px] text-[#9CA3AF] font-medium pt-3 border-t border-black/[0.04]">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </div>

        {/* CARD 4 & 5: Facilities & Obligors Dot-Matrix Equalizers (4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {/* Subcard 1: Facilities Monitored (Green Dot Matrix) */}
          <div className="zentra-card p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-[#111827]">Facilities Monitored</span>
                <span className="text-[10px] text-[#6B7280] block">Active loans & lines</span>
              </div>
            </div>

            <div className="flex items-end justify-between pt-3">
              <div>
                <span className="text-3xl font-extrabold tracking-tight text-[#111827]">{summary?.total_loans?.toLocaleString() || '0'}</span>
              </div>

              {/* Green Equalizer Dot Columns */}
              <div className="flex items-end space-x-1.5 pb-1">
                {transactionDots.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col-reverse gap-1">
                    {col.map((_, dotIdx) => (
                      <span 
                        key={dotIdx} 
                        className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"
                        style={{ animationDelay: `${colIdx * 100 + dotIdx * 50}ms`, animationDuration: '2s' }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#9CA3AF] block font-mono">active facilities</span>
                <span className="text-xs font-bold text-[#10B981] font-mono">+{summary ? (summary.total_loans * 0.028).toLocaleString(undefined, {maximumFractionDigits: 0}) : '0'} YoY</span>
              </div>
            </div>
          </div>

          {/* Subcard 2: Corporate Obligors (Blue Dot Matrix) */}
          <div className="zentra-card p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-[#111827]">Corporate Obligors</span>
                <span className="text-[10px] text-[#6B7280] block">Unique counterparty entities</span>
              </div>
            </div>

            <div className="flex items-end justify-between pt-3">
              <div>
                <span className="text-3xl font-extrabold tracking-tight text-[#111827]">{summary?.total_loans ? (summary.total_loans * 0.25).toLocaleString(undefined, {maximumFractionDigits: 0}) : '0'}</span>
              </div>

              {/* Blue Equalizer Dot Columns */}
              <div className="flex items-end space-x-1.5 pb-1">
                {customerDots.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col-reverse gap-1">
                    {col.map((_, dotIdx) => (
                      <span 
                        key={dotIdx} 
                        className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"
                        style={{ animationDelay: `${colIdx * 150 + dotIdx * 80}ms`, animationDuration: '2.5s' }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#9CA3AF] block font-mono">HHI Index</span>
                <span className="text-xs font-bold text-[#3B82F6] font-mono">{(0.024).toFixed(3)} Low</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 6: Artistic Gradient Insights Card (4 cols) */}
        <div className="md:col-span-4 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between text-white shadow-lg bg-gradient-to-tr from-[#2563EB] via-[#4338CA] to-[#EC4899]">
          {/* Subtle noise / ambient overlay */}
          <div className="absolute inset-0 bg-black/15 pointer-events-none" />

          {/* Card Top: Glassmorphism Insights Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/25 shadow-xs">
              <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              <span>Risk Insights</span>
            </div>
          </div>

          {/* Center Huge Percentage & Description */}
          <div className="relative z-10 space-y-2 py-4 h-[160px] flex flex-col justify-center">
            <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-sans text-white animate-in fade-in duration-500" key={`val-${activeInsight}`}>
              {activeInsight === 0 && ((summary && summary.total_exposure > 0) ? (100 - (summary.total_expected_loss / summary.total_exposure) * 100).toFixed(1) : 0) + '%'}
              {activeInsight === 1 && (summary ? `$${(summary.var_99 / 1e9).toFixed(1)}B` : '$0B')}
              {activeInsight === 2 && (summary ? (summary.weighted_lgd * 100).toFixed(1) : 0) + '%'}
            </div>
            <h4 className="text-sm font-bold text-white leading-snug animate-in fade-in duration-500" key={`title-${activeInsight}`}>
              {activeInsight === 0 && 'Performing Exposure Ratio against projected defaults.'}
              {activeInsight === 1 && 'Value at Risk (99% Confidence Interval).'}
              {activeInsight === 2 && 'Weighted Average Loss Given Default (LGD).'}
            </h4>
            <p className="text-xs text-white/80 leading-relaxed animate-in fade-in duration-500" key={`desc-${activeInsight}`}>
              {activeInsight === 0 && `Portfolio weighted average PD is currently ${summary ? (summary.weighted_pd * 100).toFixed(2) : 0}%. Expected Loss stands at $${summary ? (summary.total_expected_loss / 1e9).toFixed(2) : 0}B on $${summary ? (summary.total_exposure / 1e9).toFixed(1) : 0}B total exposure.`}
              {activeInsight === 1 && `In a severe stress scenario, unexpected losses could reach $${summary ? (summary.var_99 / 1e9).toFixed(2) : 0}B. Capital buffers should be maintained above this threshold.`}
              {activeInsight === 2 && `On average, ${summary ? (100 - summary.weighted_lgd * 100).toFixed(1) : 0}% of exposure is modeled to be recovered through collateral and workouts across the portfolio.`}
            </p>
          </div>

          {/* Bottom Segmented Progress Indicator */}
          <div className="relative z-10 pt-2 mt-auto">
            <div className="w-full flex gap-1.5">
              {[0, 1, 2].map((idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveInsight(idx)}
                  className={`h-1.5 flex-1 rounded-full cursor-pointer transition-colors duration-300 ${activeInsight === idx ? 'bg-white' : 'bg-white/30 hover:bg-white/50'}`} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
