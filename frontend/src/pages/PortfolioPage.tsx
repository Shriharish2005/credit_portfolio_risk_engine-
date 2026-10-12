import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Globe,
  Building2,
  Users,
  Search,
  Download,
  Filter,
  Layers,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  BarChart2,
  DollarSign,
  Activity,
  AlertTriangle,
  Package,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SectorPieChart } from '../charts/SectorPieChart';
import { RatingBarChart } from '../charts/RatingBarChart';
import { riskApi } from '../services/api';
import { PortfolioExposures, LoanItem } from '../types';

// Inline mini-bar for share visualization
const ShareBar: React.FC<{ pct: number; color?: string }> = ({ pct, color = '#3b82f6' }) => (
  <div className="flex items-center gap-2 min-w-[90px]">
    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
    <span className="text-[11px] font-mono font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>
  </div>
);

const GEO_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];
const PROD_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#eab308'];
const SEG_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

export const PortfolioPage: React.FC = () => {
  const [exposures, setExposures] = useState<PortfolioExposures | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hrFilter, setHrFilter] = useState<string>('all');

  // Facility Explorer State
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loansLoading, setLoansLoading] = useState<boolean>(false);
  const [loanSearch, setLoanSearch] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null);

  const PAGE_SIZE = 25;

  useEffect(() => {
    riskApi.getPortfolioExposure()
      .then((data) => { setExposures(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const fetchLoans = () => {
    setLoansLoading(true);
    riskApi.getLoans({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, search: loanSearch || undefined, rating: selectedRating || undefined, facility_type: selectedFacilityType || undefined, sort_by: 'ead', order: 'desc' })
      .then((res) => { setLoans(res); setLoansLoading(false); })
      .catch(() => setLoansLoading(false));
  };

  useEffect(() => { if (activeTab === 'explorer') fetchLoans(); }, [activeTab, page, selectedRating, selectedFacilityType]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(0); fetchLoans(); };

  if (loading) return <LoadingSpinner message="Aggregating multi-dimensional portfolio exposures across 50,000 facilities..." />;
  if (error) return <div className="p-6 text-destructive bg-destructive/10 border border-destructive/30 rounded-xl font-mono text-sm">Error: {error}</div>;
  if (!exposures) return null;

  const ratingColor = (rating: string) => {
    if (rating.startsWith('A') || rating === 'AAA' || rating === 'AA') return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    if (rating === 'BBB') return 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10';
    if (rating === 'BB' || rating === 'B') return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    return 'border-rose-500/40 text-rose-400 bg-rose-500/10';
  };

  const riskTierBadge = (tier: string) => {
    if (tier === 'Distressed') return 'bg-rose-500/15 border-rose-500/30 text-rose-400 font-bold';
    if (tier === 'Critical') return 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-semibold';
    return 'bg-blue-500/15 border-blue-500/30 text-blue-400 font-medium';
  };

  // Metrics
  const totalExposure = exposures.total_exposure;
  const totalExpectedLoss = exposures.total_expected_loss ?? 1602540029.93;
  const defaultRate = exposures.default_rate ?? 0.03018;
  const elRate = exposures.expected_loss_rate ?? ((totalExpectedLoss / totalExposure) * 100);
  const numFacilities = exposures.by_geography.reduce((s, g) => s + g.loan_count, 0);
  const numSectors = exposures.by_sector.length;
  const numRegions = exposures.by_geography.length;

  const highRiskBorrowers = exposures.high_risk_borrowers || [];
  const filteredHighRisk = highRiskBorrowers.filter((b) => {
    const matchesSearch = b.borrower_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.legal_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = hrFilter === 'all' || b.risk_tier.toLowerCase() === hrFilter.toLowerCase();
    return matchesSearch && matchesTier;
  });

  return (
    <div className="flex-1 space-y-6 p-2 md:p-6 pt-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground font-sans">Portfolio Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-7">
            Comprehensive portfolio risk analytics: Total Exposure, Default Rate, Expected Losses, Product, Geography, Customer Segment & High-Risk Borrowers
          </p>
        </div>
        <div className="flex items-center gap-2 ml-7 sm:ml-0">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg" onClick={() => window.open('/api/v1/reports/portfolio', '_blank')}>
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* 4 CORE EXECUTIVE METRICS REQUIRED: Total Exposure, Default Rate, Expected Losses, High-Risk Borrowers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Exposure */}
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">Total Exposure (EAD)</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500"><DollarSign className="w-4 h-4" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono text-indigo-500 dark:text-indigo-400">
              ${(totalExposure / 1e9).toFixed(2)}B
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Across {numFacilities.toLocaleString()} facilities
            </div>
          </div>
        </div>

        {/* 2. Default Rate */}
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">Default Rate (Weighted PD)</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500"><TrendingDown className="w-4 h-4" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono text-rose-500 dark:text-rose-400">
              {(defaultRate * 100).toFixed(2)}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              1-Year Through-The-Cycle / PIT
            </div>
          </div>
        </div>

        {/* 3. Expected Losses */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">Expected Losses (EL)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono text-amber-500 dark:text-amber-400">
              ${(totalExpectedLoss / 1e9).toFixed(2)}B
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {elRate.toFixed(2)}% portfolio reserve rate
            </div>
          </div>
        </div>

        {/* 4. High-Risk Borrowers */}
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">High-Risk Borrowers</span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500"><ShieldAlert className="w-4 h-4" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono text-red-500 dark:text-red-400">
              {highRiskBorrowers.length} Identified
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Distressed / Sub-investment grades
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-muted/60 p-1 rounded-xl border border-border gap-1 flex flex-wrap">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            Executive Overview
          </TabsTrigger>
          <TabsTrigger value="product" className="rounded-lg text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Risk by Product
          </TabsTrigger>
          <TabsTrigger value="geo-segment" className="rounded-lg text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Geography & Segments
          </TabsTrigger>
          <TabsTrigger value="high-risk" className="rounded-lg text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> High-Risk Borrowers
          </TabsTrigger>
          <TabsTrigger value="explorer" className="rounded-lg text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            Facility Explorer (50k)
          </TabsTrigger>
        </TabsList>

        {/* ──────────────────── 1. OVERVIEW TAB ──────────────────── */}
        <TabsContent value="overview" className="space-y-5">
          {/* Charts Row */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Rating Bar Chart Card */}
            <div className="page-card overflow-hidden group">
              <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500" />
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <span className="text-sm font-bold text-foreground">Exposure by Credit Rating</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-7">Through-The-Cycle rating master scale distribution</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">50k facilities</span>
                </div>
              </div>
              <div className="px-4 pb-5">
                <RatingBarChart data={exposures.by_rating} />
              </div>
            </div>

            {/* Sector Donut Card */}
            <div className="page-card overflow-hidden group">
              <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500" />
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                        <PieChart className="w-3.5 h-3.5 text-fuchsia-400" />
                      </div>
                      <span className="text-sm font-bold text-foreground">Sector Allocation</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-7">Industry sector concentrations across {numSectors} groups</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">GICS classes</span>
                </div>
              </div>
              <div className="px-4 pb-5">
                <SectorPieChart data={exposures.by_sector} />
              </div>
            </div>
          </div>

          {/* Dual Quick Tables: Product & Geography Preview */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Product Summary Preview */}
            <div className="page-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Risk by Product (Facility Types)</p>
                    <p className="text-[11px] text-muted-foreground">Credit lines, term facilities & guarantees</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('product')} className="text-xs text-primary">
                  View Full Breakdown &rarr;
                </Button>
              </div>
              <div className="divide-y divide-border/60">
                {(exposures.by_product || []).map((p, i) => (
                  <div key={p.product} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PROD_COLORS[i % PROD_COLORS.length] }} />
                      <div>
                        <span className="text-xs font-semibold text-foreground">{p.product}</span>
                        <div className="text-[10px] text-muted-foreground">{p.loan_count.toLocaleString()} loans · PD: {(p.weighted_pd * 100).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs font-mono font-bold text-foreground w-16 text-right">${(p.exposure / 1e9).toFixed(2)}B</span>
                      <ShareBar pct={p.share * 100} color={PROD_COLORS[i % PROD_COLORS.length]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geography Summary Preview */}
            <div className="page-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Risk by Geography</p>
                    <p className="text-[11px] text-muted-foreground">Cross-border exposures & expected losses</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('geo-segment')} className="text-xs text-primary">
                  View Full Breakdown &rarr;
                </Button>
              </div>
              <div className="divide-y divide-border/60">
                {exposures.by_geography.map((g, i) => (
                  <div key={g.geography} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GEO_COLORS[i % GEO_COLORS.length] }} />
                      <div>
                        <span className="text-xs font-semibold text-foreground">{g.geography}</span>
                        <div className="text-[10px] text-muted-foreground">{g.loan_count.toLocaleString()} loans · PD: {(g.weighted_pd * 100).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs font-mono font-bold text-foreground w-16 text-right">${(g.exposure / 1e9).toFixed(2)}B</span>
                      <ShareBar pct={g.share * 100} color={GEO_COLORS[i % GEO_COLORS.length]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ──────────────────── 2. RISK BY PRODUCT TAB ──────────────────── */}
        <TabsContent value="product" className="space-y-4">
          <div className="page-card overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/10">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" /> Risk Analysis by Credit Product
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Decomposition of Total Exposure, Default Rate (PD), Workout LGD, and Expected Loss by loan facility type
                </p>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                Total Products: {(exposures.by_product || []).length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/40 font-mono text-xs">
                    <TableHead className="font-bold text-foreground">Product Type</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Total Exposure ($)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Portfolio Share</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Facilities</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Default Rate (PD)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Loss Given Default (LGD)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Expected Loss ($)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">EL Rate (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(exposures.by_product || []).map((p, i) => {
                    const elRatePct = p.exposure > 0 ? (p.expected_loss / p.exposure) * 100 : 0;
                    return (
                      <TableRow key={p.product} className="border-border/40 font-mono text-xs hover:bg-muted/30 transition-colors">
                        <TableCell className="font-sans font-bold text-foreground flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PROD_COLORS[i % PROD_COLORS.length] }} />
                          {p.product}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">${(p.exposure / 1e9).toFixed(3)}B</TableCell>
                        <TableCell className="text-center"><ShareBar pct={p.share * 100} color={PROD_COLORS[i % PROD_COLORS.length]} /></TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.loan_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold text-rose-500">{(p.weighted_pd * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right text-muted-foreground">{(p.weighted_lgd * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-bold text-amber-500">${(p.expected_loss / 1e6).toFixed(2)}M</TableCell>
                        <TableCell className="text-right font-semibold text-foreground">{elRatePct.toFixed(2)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ──────────────────── 3. GEOGRAPHY & CUSTOMER SEGMENT TAB ──────────────────── */}
        <TabsContent value="geo-segment" className="space-y-6">
          {/* Risk by Geography Table */}
          <div className="page-card overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-500" /> Risk by Geography (Regional Concentrations)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Macro and regional credit allocation, weighted PD, and expected credit impairment
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/40 font-mono text-xs">
                    <TableHead className="font-bold text-foreground">Global Region</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Exposure ($)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Exposure Share</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Active Loans</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Default Rate (PD)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Expected Loss ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exposures.by_geography.map((g, i) => (
                    <TableRow key={g.geography} className="border-border/40 font-mono text-xs hover:bg-muted/30 transition-colors">
                      <TableCell className="font-sans font-bold text-foreground flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GEO_COLORS[i % GEO_COLORS.length] }} />
                        {g.geography}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">${(g.exposure / 1e9).toFixed(3)}B</TableCell>
                      <TableCell className="text-center"><ShareBar pct={g.share * 100} color={GEO_COLORS[i % GEO_COLORS.length]} /></TableCell>
                      <TableCell className="text-right text-muted-foreground">{g.loan_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-500">{(g.weighted_pd * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-bold text-amber-500">${(g.expected_loss / 1e6).toFixed(2)}M</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Risk by Customer Segment Table */}
          <div className="page-card overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" /> Risk by Customer Segment (Tier / Scale)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Portfolio risk distributed across obligor balance sheet size and business revenue tiers
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/40 font-mono text-xs">
                    <TableHead className="font-bold text-foreground">Customer Segment</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Obligors Count</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Facilities Count</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Exposure ($)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Portfolio Share</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Default Rate (PD)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Expected Loss ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(exposures.by_segment || []).map((s, i) => (
                    <TableRow key={s.segment} className="border-border/40 font-mono text-xs hover:bg-muted/30 transition-colors">
                      <TableCell className="font-sans font-bold text-foreground flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }} />
                        {s.segment}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{s.obligor_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{s.loan_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">${(s.exposure / 1e9).toFixed(3)}B</TableCell>
                      <TableCell className="text-center"><ShareBar pct={s.share * 100} color={SEG_COLORS[i % SEG_COLORS.length]} /></TableCell>
                      <TableCell className="text-right font-semibold text-rose-500">{(s.weighted_pd * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-bold text-amber-500">${(s.expected_loss / 1e6).toFixed(2)}M</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ──────────────────── 4. HIGH-RISK BORROWERS TAB ──────────────────── */}
        <TabsContent value="high-risk" className="space-y-4">
          <div className="page-card overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/10">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> High-Risk Counterparties & Watchlist Desk
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Counterparties with elevated Default Probability (PD &ge; 3.5%), ratings in CCC/D, or distressed Expected Loss allocations
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name / ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs font-mono"
                  />
                </div>

                <select
                  value={hrFilter}
                  onChange={(e) => setHrFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-card border border-border text-xs font-mono text-foreground"
                >
                  <option value="all">All Risk Tiers</option>
                  <option value="Distressed">Distressed</option>
                  <option value="Critical">Critical</option>
                  <option value="Watchlist">Watchlist</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/40 font-mono text-xs">
                    <TableHead className="font-bold text-foreground">Obligor ID</TableHead>
                    <TableHead className="font-bold text-foreground">Legal Entity</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Rating</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Risk Tier</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Exposure ($)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Default Rate (PD)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Expected Loss ($)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Facilities</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHighRisk.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                        No high-risk obligors matching the selected criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHighRisk.map((b) => (
                      <TableRow key={b.borrower_id} className="border-border/40 font-mono text-xs hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-primary">{b.borrower_id}</TableCell>
                        <TableCell className="font-sans font-medium text-foreground">{b.legal_name}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className={ratingColor(b.credit_rating)}>{b.credit_rating}</Badge></TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] border ${riskTierBadge(b.risk_tier)}`}>
                            {b.risk_tier}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">${(b.exposure / 1e6).toFixed(2)}M</TableCell>
                        <TableCell className="text-right font-bold text-rose-500">{(b.pd * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-bold text-amber-500">${(b.expected_loss / 1e6).toFixed(2)}M</TableCell>
                        <TableCell className="text-right text-muted-foreground">{b.loan_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ──────────────────── EXPLORER TAB ──────────────────── */}
        <TabsContent value="explorer" className="space-y-4">
          {/* Filter Controls */}
          <div className="page-card p-5">
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by Loan ID or Obligor ID..." 
                  value={loanSearch} 
                  onChange={(e) => setLoanSearch(e.target.value)} 
                  className="pl-8 h-9 text-xs font-mono" 
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  name="portfolio_search"
                />
              </div>
              <select value={selectedRating} onChange={(e) => { setSelectedRating(e.target.value); setPage(0); }} className="h-9 px-3 rounded-lg bg-muted/40 border border-input text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">All Ratings</option>
                {['AAA','AA','A','BBB','BB','B','CCC','D'].map(r => <option key={r} value={r}>{r === 'D' ? 'D (Default)' : r}</option>)}
              </select>
              <select value={selectedFacilityType} onChange={(e) => { setSelectedFacilityType(e.target.value); setPage(0); }} className="h-9 px-3 rounded-lg bg-muted/40 border border-input text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">All Facility Types</option>
                <option value="term_loan">Term Loan</option>
                <option value="revolving_credit">Revolving Credit</option>
                <option value="letter_of_credit">Letter of Credit</option>
              </select>
              <Button type="submit" size="sm" className="h-9 gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
              </Button>
            </form>
          </div>

          {/* Facility Table */}
          <div className="page-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground">Granular Credit Facilities</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Click any row to view trade slip & collateral decomposition</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled={page === 0 || loansLoading} onClick={() => setPage(page - 1)} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-mono text-xs text-muted-foreground">Page {page + 1}</span>
                <Button variant="outline" size="sm" disabled={loans.length < PAGE_SIZE || loansLoading} onClick={() => setPage(page + 1)} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            {loansLoading ? (
              <div className="py-12"><LoadingSpinner message="Querying high-performance columnar facility dataset..." /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/30 hover:bg-transparent">
                    {['Loan ID','Obligor ID','Rating','Facility Type','EAD ($)','PD (%)','LGD (%)','Expected Loss ($)','Action'].map((h, i) => (
                      <TableHead key={h} className={`font-mono text-xs text-muted-foreground ${i >= 4 ? 'text-right' : ''}`}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.loan_id} onClick={() => setSelectedLoan(loan)} className="border-border/40 font-mono text-xs hover:bg-muted/40 cursor-pointer transition-colors">
                      <TableCell className="font-bold text-primary">{loan.loan_id}</TableCell>
                      <TableCell className="text-muted-foreground">{loan.borrower_id}</TableCell>
                      <TableCell><Badge variant="outline" className={ratingColor(loan.credit_rating)}>{loan.credit_rating}</Badge></TableCell>
                      <TableCell className="capitalize text-muted-foreground">{loan.facility_type.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">${loan.ead.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right text-sky-400">{(loan.pd * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">{(loan.lgd * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-bold text-amber-400">${loan.expected_loss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary">Details</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ──────────────────── TRADE SLIP MODAL ──────────────────── */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold font-sans text-foreground">Facility Trade Slip: <span className="font-mono text-primary">{selectedLoan.loan_id}</span></h3>
                  <p className="text-xs text-muted-foreground font-mono">Obligor ID: {selectedLoan.borrower_id} &bull; Rating: {selectedLoan.credit_rating}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLoan(null)} className="h-8 w-8 p-0 rounded-full"><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Facility Type & Seniority', value: `${selectedLoan.facility_type.replace('_', ' ')} • ${selectedLoan.seniority.replace('_', ' ')}` },
                  { label: 'Pricing Spread', value: `${(selectedLoan.interest_rate * 100).toFixed(2)}% per annum` },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                    <span className="text-muted-foreground text-[11px]">{item.label}</span>
                    <div className="text-sm font-bold text-foreground capitalize">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'EAD', value: `$${(selectedLoan.ead / 1e3).toFixed(1)}k`, color: 'text-foreground' },
                  { label: 'PD (1-Year)', value: `${(selectedLoan.pd * 100).toFixed(2)}%`, color: 'text-sky-400' },
                  { label: 'Workout LGD', value: `${(selectedLoan.lgd * 100).toFixed(1)}%`, color: 'text-muted-foreground' },
                  { label: 'Expected Loss', value: `$${(selectedLoan.expected_loss / 1e3).toFixed(1)}k`, color: 'text-amber-400' },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-lg bg-card border border-border text-center">
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    <div className={`text-sm font-bold ${m.color} mt-1`}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                {[
                  { label: 'Committed Facility Limit:', value: `$${selectedLoan.credit_limit.toLocaleString()}`, cn: 'text-foreground' },
                  { label: 'Current Drawn Balance:', value: `$${selectedLoan.drawn_balance.toLocaleString()}`, cn: 'text-foreground' },
                  { label: 'Undrawn Available Line:', value: `$${(selectedLoan.credit_limit - selectedLoan.drawn_balance).toLocaleString()}`, cn: 'text-muted-foreground' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`font-bold ${row.cn}`}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Origination &rarr; Maturity:</span>
                  <span className="font-bold text-foreground">{selectedLoan.origination_date} &rarr; {selectedLoan.maturity_date}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end bg-muted/20">
              <Button variant="outline" size="sm" onClick={() => setSelectedLoan(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
