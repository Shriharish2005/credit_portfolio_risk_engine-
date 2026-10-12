import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, FileText, TrendingUp, History, AlertTriangle, RefreshCcw,
  Search, ChevronLeft, ChevronRight, Database, Building2, CreditCard,
  DollarSign, BarChart2, Clock, CheckCircle, XCircle, AlertCircle,
  Filter, Download
} from 'lucide-react';
import { riskApi } from '../services/api';
import {
  CustomerInfo, LoanInfoItem, IncomeRecord,
  CreditHistoryRecord, LiabilityRecord, RepaymentRecord,
  DataManagementSummary,
} from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number, dec = 2) => n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtCr = (n: number) => `₹${(n / 1e7).toFixed(1)} Cr`;
const fmtM = (n: number) => `$${(n / 1e6).toFixed(1)}M`;
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

const RATING_COLOR: Record<string, string> = {
  AAA: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
  AA:  'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
  A:   'text-blue-600   bg-blue-50   dark:bg-blue-900/20   dark:text-blue-400',
  BBB: 'text-blue-500   bg-blue-50   dark:bg-blue-900/20   dark:text-blue-400',
  BB:  'text-amber-600  bg-amber-50  dark:bg-amber-900/20  dark:text-amber-400',
  B:   'text-amber-500  bg-amber-50  dark:bg-amber-900/20  dark:text-amber-400',
  CCC: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  CC:  'text-rose-600   bg-rose-50   dark:bg-rose-900/20   dark:text-rose-400',
  D:   'text-red-700    bg-red-50    dark:bg-red-900/20    dark:text-red-400',
};
const ratingBadge = (r: string) =>
  `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${RATING_COLOR[r] ?? 'bg-gray-100 text-gray-600'}`;

const statusBadge = (s: string) => {
  const c: Record<string, string> = {
    'Excellent':       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Good':            'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400',
    'Fair':            'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400',
    'Watchlist':       'bg-orange-100  text-orange-700  dark:bg-orange-900/30  dark:text-orange-400',
    'Non-Performing':  'bg-rose-100    text-rose-700    dark:bg-rose-900/30    dark:text-rose-400',
    'ACTIVE':          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'DEFAULTED':       'bg-rose-100    text-rose-700    dark:bg-rose-900/30    dark:text-rose-400',
  };
  return `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${c[s] ?? 'bg-gray-100 text-gray-500'}`;
};

// ── Reusable sub-components ──────────────────────────────────────────────────

const PageControls: React.FC<{
  page: number; total: number; pageSize: number;
  onPrev: () => void; onNext: () => void;
}> = ({ page, total, pageSize, onPrev, onNext }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-xs text-muted-foreground font-mono">
        {total.toLocaleString()} records · page {page}/{totalPages}
      </span>
      <div className="flex gap-1.5">
        <button onClick={onPrev} disabled={page <= 1}
          className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={onNext} disabled={page >= totalPages}
          className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <div className="relative flex-1 min-w-[180px] max-w-xs">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
    <input
      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
      placeholder={placeholder ?? 'Search…'}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const SelectFilter: React.FC<{ value: string; onChange: (v: string) => void; options: string[]; label: string }> = ({ value, onChange, options, label }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition text-foreground"
  >
    <option value="">{label}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
    <table className="min-w-full text-xs">{children}</table>
  </div>
);

const TH: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 whitespace-nowrap ${className}`}>{children}</th>
);
const TD: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2.5 border-t border-border/30 align-middle ${className}`}>{children}</td>
);

const LoadingRows = ({ cols }: { cols: number }) => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={j} className="px-3 py-2.5 border-t border-border/30">
            <div className="h-3 bg-muted rounded w-3/4" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

const ErrorState = ({ msg, onRetry }: { msg: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
    <AlertCircle className="w-8 h-8 text-rose-400" />
    <p className="text-sm font-medium">{msg}</p>
    <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
      <RefreshCcw className="w-3.5 h-3.5" /> Retry
    </button>
  </div>
);

// ── Tab definitions ──────────────────────────────────────────────────────────

type Tab = 'customers' | 'loans' | 'income' | 'credit-history' | 'liabilities' | 'repayment';

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'customers',      label: 'Customer Information', icon: <Users className="w-3.5 h-3.5" />,       color: 'blue'    },
  { id: 'loans',          label: 'Loan Information',     icon: <FileText className="w-3.5 h-3.5" />,    color: 'purple'  },
  { id: 'income',         label: 'Income',               icon: <DollarSign className="w-3.5 h-3.5" />,  color: 'emerald' },
  { id: 'credit-history', label: 'Credit History',       icon: <BarChart2 className="w-3.5 h-3.5" />,   color: 'amber'   },
  { id: 'liabilities',    label: 'Existing Liabilities', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'rose'  },
  { id: 'repayment',      label: 'Repayment History',    icon: <Clock className="w-3.5 h-3.5" />,        color: 'cyan'   },
];

const TAB_ACTIVE: Record<string, string> = {
  blue:    'border-blue-500    bg-blue-500/10    text-blue-600    dark:text-blue-400',
  purple:  'border-purple-500  bg-purple-500/10  text-purple-600  dark:text-purple-400',
  emerald: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber:   'border-amber-500   bg-amber-500/10   text-amber-600   dark:text-amber-400',
  rose:    'border-rose-500    bg-rose-500/10    text-rose-600    dark:text-rose-400',
  cyan:    'border-cyan-500    bg-cyan-500/10    text-cyan-600    dark:text-cyan-400',
};

// ── SUMMARY CARDS ────────────────────────────────────────────────────────────

const SummaryCards: React.FC<{ summary: DataManagementSummary }> = ({ summary }) => {
  const cards = [
    { label: 'Total Customers',   value: summary.customers.total.toLocaleString(),         sub: `${summary.customers.sectors} sectors · ${summary.customers.countries} countries`, icon: <Users className="w-4 h-4" />,        bg: 'bg-blue-500/10',    txt: 'text-blue-500'    },
    { label: 'Total Loans',       value: summary.loans.total.toLocaleString(),              sub: `${summary.loans.facility_types} facility types`,                                  icon: <FileText className="w-4 h-4" />,     bg: 'bg-purple-500/10',  txt: 'text-purple-500'  },
    { label: 'Total Exposure',    value: fmtCr(summary.loans.total_exposure),               sub: `EL: ${fmtCr(summary.loans.total_expected_loss)}`,                                 icon: <Database className="w-4 h-4" />,     bg: 'bg-emerald-500/10', txt: 'text-emerald-500' },
    { label: 'Avg Annual Revenue',value: fmtM(summary.income.avg_revenue),                  sub: `Avg profitability ${pct(summary.income.avg_profitability)}`,                      icon: <DollarSign className="w-4 h-4" />,   bg: 'bg-amber-500/10',   txt: 'text-amber-500'   },
    { label: 'Avg PD (Portfolio)',value: pct(summary.credit_history.avg_pd),                sub: 'Probability of Default',                                                           icon: <TrendingUp className="w-4 h-4" />,   bg: 'bg-rose-500/10',    txt: 'text-rose-500'    },
    { label: 'Total Drawn',       value: fmtCr(summary.liabilities.total_drawn),            sub: `Limit: ${fmtCr(summary.liabilities.total_credit_limit)}`,                         icon: <CreditCard className="w-4 h-4" />,   bg: 'bg-cyan-500/10',    txt: 'text-cyan-500'    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-all">
          <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2.5 ${c.txt}`}>{c.icon}</div>
          <div className={`text-lg font-bold font-mono ${c.txt}`}>{c.value}</div>
          <div className="text-[10px] font-semibold text-foreground mt-0.5 truncate">{c.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
        </div>
      ))}
    </div>
  );
};

// ── TAB PANELS ───────────────────────────────────────────────────────────────

// 1. Customers
const CustomersPanel: React.FC = () => {
  const [data, setData] = useState<CustomerInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [rating, setRating] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    riskApi.getCustomers({ page, page_size: 20, search, sector, rating })
      .then(r => { setData(r.data as CustomerInfo[]); setTotal(r.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, sector, rating]);

  useEffect(() => { setPage(1); }, [search, sector, rating]);
  useEffect(() => { load(); }, [load]);

  const sectors = ['Technology','Financial Services','Healthcare','Energy','Consumer','Industrial','Real Estate','Utilities'];
  const ratings = ['AAA','AA','A','BBB','BB','B','CCC','CC'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ID or name…" />
        <SelectFilter value={sector} onChange={setSector} options={sectors} label="All Sectors" />
        <SelectFilter value={rating} onChange={setRating} options={ratings} label="All Ratings" />
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error ? <ErrorState msg={error} onRetry={load} /> : (
        <>
          <TableWrapper>
            <thead>
              <tr>
                <TH>Customer ID</TH><TH>Legal Name</TH><TH>Sector</TH>
                <TH>Geography</TH><TH>Country</TH><TH>Rating</TH>
                <TH>Est. Year</TH><TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows cols={8} /> : data.map(c => (
                <tr key={c.customer_id} className="hover:bg-muted/30 transition-colors">
                  <TD><span className="font-mono text-primary text-[11px]">{c.customer_id}</span></TD>
                  <TD><span className="font-medium text-foreground">{c.legal_name}</span></TD>
                  <TD><span className="text-muted-foreground">{c.sector}</span></TD>
                  <TD><span className="text-muted-foreground">{c.geography}</span></TD>
                  <TD>{c.country}</TD>
                  <TD><span className={ratingBadge(c.credit_rating)}>{c.credit_rating}</span></TD>
                  <TD><span className="font-mono text-muted-foreground">{c.established_year ?? '—'}</span></TD>
                  <TD>
                    {c.is_active
                      ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold"><CheckCircle className="w-3 h-3" />Active</span>
                      : <span className="flex items-center gap-1 text-rose-500 text-[11px] font-semibold"><XCircle className="w-3 h-3" />Inactive</span>}
                  </TD>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PageControls page={page} total={total} pageSize={20} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
};

// 2. Loans
const LoansPanel: React.FC = () => {
  const [data, setData] = useState<LoanInfoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [rating, setRating] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    riskApi.getLoanData({ page, page_size: 20, search, facility_type: facilityType, rating })
      .then(r => { setData(r.data as LoanInfoItem[]); setTotal(r.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, facilityType, rating]);

  useEffect(() => { setPage(1); }, [search, facilityType, rating]);
  useEffect(() => { load(); }, [load]);

  const facilities = ['Term Loan','Revolving Credit','Bond','Overdraft','Letters of Credit','Project Finance'];
  const ratings = ['AAA','AA','A','BBB','BB','B','CCC','CC'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search loan/borrower ID…" />
        <SelectFilter value={facilityType} onChange={setFacilityType} options={facilities} label="All Types" />
        <SelectFilter value={rating} onChange={setRating} options={ratings} label="All Ratings" />
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {error ? <ErrorState msg={error} onRetry={load} /> : (
        <>
          <TableWrapper>
            <thead>
              <tr>
                <TH>Loan ID</TH><TH>Borrower</TH><TH>Type</TH><TH>Rating</TH>
                <TH>Limit</TH><TH>Drawn</TH><TH>Util%</TH>
                <TH>PD</TH><TH>LGD</TH><TH>EAD</TH><TH>EL</TH>
                <TH>Rate</TH><TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows cols={13} /> : data.map(l => (
                <tr key={l.loan_id} className="hover:bg-muted/30 transition-colors">
                  <TD><span className="font-mono text-primary text-[11px]">{l.loan_id}</span></TD>
                  <TD><span className="font-mono text-muted-foreground text-[11px]">{l.borrower_id}</span></TD>
                  <TD><span className="text-muted-foreground">{l.facility_type}</span></TD>
                  <TD><span className={ratingBadge(l.credit_rating)}>{l.credit_rating}</span></TD>
                  <TD><span className="font-mono text-[11px]">{fmtCr(l.credit_limit)}</span></TD>
                  <TD><span className="font-mono text-[11px]">{fmtCr(l.drawn_balance)}</span></TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${l.utilization_rate > 0.85 ? 'bg-rose-500' : l.utilization_rate > 0.65 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, l.utilization_rate * 100)}%` }} />
                      </div>
                      <span className="font-mono text-[10px]">{pct(l.utilization_rate)}</span>
                    </div>
                  </TD>
                  <TD><span className="font-mono text-rose-500 text-[11px]">{pct(l.pd)}</span></TD>
                  <TD><span className="font-mono text-amber-500 text-[11px]">{pct(l.lgd)}</span></TD>
                  <TD><span className="font-mono text-[11px]">{fmtCr(l.ead)}</span></TD>
                  <TD><span className="font-mono text-rose-500 text-[11px]">{fmtCr(l.expected_loss)}</span></TD>
                  <TD><span className="font-mono text-[11px]">{pct(l.interest_rate)}</span></TD>
                  <TD><span className={statusBadge(l.status)}>{l.status}</span></TD>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PageControls page={page} total={total} pageSize={20} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
};

// 3. Income
const IncomePanel: React.FC = () => {
  const [data, setData] = useState<IncomeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    riskApi.getIncomeData({ page, page_size: 20, search, income_tier: tier })
      .then(r => { setData(r.data as IncomeRecord[]); setTotal(r.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, tier]);

  useEffect(() => { setPage(1); }, [search, tier]);
  useEffect(() => { load(); }, [load]);

  const tiers = ['Large Corporate','Upper Mid-Market','Mid-Market','Lower Mid-Market','SME'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search customer…" />
        <SelectFilter value={tier} onChange={setTier} options={tiers} label="All Income Tiers" />
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {error ? <ErrorState msg={error} onRetry={load} /> : (
        <>
          <TableWrapper>
            <thead>
              <tr>
                <TH>Customer ID</TH><TH>Legal Name</TH><TH>Income Tier</TH>
                <TH>Annual Revenue</TH><TH>Total Assets</TH>
                <TH>Profitability</TH><TH>Liquidity</TH><TH>Interest Coverage</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows cols={8} /> : data.map(r => (
                <tr key={r.customer_id} className="hover:bg-muted/30 transition-colors">
                  <TD><span className="font-mono text-primary text-[11px]">{r.customer_id}</span></TD>
                  <TD><span className="font-medium text-foreground">{r.legal_name}</span></TD>
                  <TD>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.income_tier === 'Large Corporate' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      r.income_tier === 'Upper Mid-Market' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      r.income_tier === 'Mid-Market' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {r.income_tier}
                    </span>
                  </TD>
                  <TD><span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">{fmtM(r.annual_revenue)}</span></TD>
                  <TD><span className="font-mono text-[11px]">{fmtM(r.total_assets)}</span></TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${r.profitability > 0.1 ? 'bg-emerald-500' : r.profitability > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                      <span className={`font-mono text-[11px] ${r.profitability > 0.1 ? 'text-emerald-600 dark:text-emerald-400' : r.profitability > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {pct(r.profitability)}
                      </span>
                    </div>
                  </TD>
                  <TD><span className="font-mono text-[11px]">{fmt(r.liquidity, 2)}x</span></TD>
                  <TD><span className={`font-mono text-[11px] ${r.interest_coverage >= 2 ? 'text-emerald-600 dark:text-emerald-400' : r.interest_coverage >= 1 ? 'text-amber-500' : 'text-rose-500'}`}>{fmt(r.interest_coverage, 2)}x</span></TD>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PageControls page={page} total={total} pageSize={20} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
};

// 4. Credit History
const CreditHistoryPanel: React.FC = () => {
  const [data, setData] = useState<CreditHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [creditTier, setCreditTier] = useState('');
  const [rating, setRating] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    riskApi.getCreditHistory({ page, page_size: 20, search, credit_tier: creditTier, rating })
      .then(r => { setData(r.data as CreditHistoryRecord[]); setTotal(r.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, creditTier, rating]);

  useEffect(() => { setPage(1); }, [search, creditTier, rating]);
  useEffect(() => { load(); }, [load]);

  const tiers = ['Investment Grade – Prime','Investment Grade','Sub-Investment Grade','Distressed'];
  const ratings = ['AAA','AA','A','BBB','BB','B','CCC','CC'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search customer…" />
        <SelectFilter value={rating} onChange={setRating} options={ratings} label="All Ratings" />
        <SelectFilter value={creditTier} onChange={setCreditTier} options={tiers} label="All Credit Tiers" />
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {error ? <ErrorState msg={error} onRetry={load} /> : (
        <>
          <TableWrapper>
            <thead>
              <tr>
                <TH>Customer ID</TH><TH>Legal Name</TH><TH>Rating</TH><TH>Credit Tier</TH>
                <TH>PD</TH><TH>Leverage</TH><TH>Debt Ratio</TH>
                <TH>Int. Coverage</TH><TH>Facilities</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows cols={9} /> : data.map(r => (
                <tr key={r.customer_id} className="hover:bg-muted/30 transition-colors">
                  <TD><span className="font-mono text-primary text-[11px]">{r.customer_id}</span></TD>
                  <TD><span className="font-medium text-foreground">{r.legal_name}</span></TD>
                  <TD><span className={ratingBadge(r.credit_rating)}>{r.credit_rating}</span></TD>
                  <TD><span className="text-muted-foreground text-[11px]">{r.credit_tier}</span></TD>
                  <TD><span className={`font-mono font-semibold text-[11px] ${r.pd > 0.08 ? 'text-rose-500' : r.pd > 0.03 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{pct(r.pd)}</span></TD>
                  <TD><span className="font-mono text-[11px]">{fmt(r.leverage, 2)}x</span></TD>
                  <TD><span className="font-mono text-[11px]">{pct(r.debt_ratio)}</span></TD>
                  <TD><span className={`font-mono text-[11px] ${r.interest_coverage >= 2 ? 'text-emerald-600 dark:text-emerald-400' : r.interest_coverage >= 1 ? 'text-amber-500' : 'text-rose-500'}`}>{fmt(r.interest_coverage, 2)}x</span></TD>
                  <TD><span className="font-mono text-center text-[11px] text-muted-foreground">{r.num_facilities}</span></TD>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PageControls page={page} total={total} pageSize={20} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
};

// 5. Liabilities
const LiabilitiesPanel: React.FC = () => {
  const [data, setData] = useState<LiabilityRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    riskApi.getLiabilities({ page, page_size: 20, search })
      .then(r => { setData(r.data as LiabilityRecord[]); setTotal(r.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search borrower…" />
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {error ? <ErrorState msg={error} onRetry={load} /> : (
        <>
          <TableWrapper>
            <thead>
              <tr>
                <TH>Customer ID</TH><TH>Legal Name</TH>
                <TH>Total Drawn</TH><TH>Credit Limit</TH>
                <TH>Utilization</TH><TH>Facilities</TH>
                <TH>Avg PD</TH><TH>Avg LGD</TH>
                <TH>Total EAD</TH><TH>Expected Loss</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows cols={10} /> : data.map(r => (
                <tr key={r.customer_id} className="hover:bg-muted/30 transition-colors">
                  <TD><span className="font-mono text-primary text-[11px]">{r.customer_id}</span></TD>
                  <TD><span className="font-medium text-foreground">{r.legal_name}</span></TD>
                  <TD><span className="font-mono text-[11px]">{fmtCr(r.total_drawn)}</span></TD>
                  <TD><span className="font-mono text-[11px]">{fmtCr(r.total_credit_limit)}</span></TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.overall_utilization > 0.85 ? 'bg-rose-500' : r.overall_utilization > 0.65 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, r.overall_utilization * 100)}%` }} />
                      </div>
                      <span className="font-mono text-[10px]">{pct(r.overall_utilization)}</span>
                    </div>
                  </TD>
                  <TD><span className="font-mono text-muted-foreground text-[11px]">{r.num_facilities}</span></TD>
                  <TD><span className={`font-mono font-semibold text-[11px] ${r.avg_pd > 0.08 ? 'text-rose-500' : r.avg_pd > 0.03 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{pct(r.avg_pd)}</span></TD>
                  <TD><span className="font-mono text-amber-500 text-[11px]">{pct(r.avg_lgd)}</span></TD>
                  <TD><span className="font-mono font-semibold text-[11px]">{fmtCr(r.total_ead)}</span></TD>
                  <TD><span className="font-mono text-rose-500 text-[11px]">{fmtCr(r.total_expected_loss)}</span></TD>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PageControls page={page} total={total} pageSize={20} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
};

// 6. Repayment History
const RepaymentPanel: React.FC = () => {
  const [data, setData] = useState<RepaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    riskApi.getRepaymentHistory({ page, page_size: 20, search, status, rating })
      .then(r => { setData(r.data as RepaymentRecord[]); setTotal(r.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, status, rating]);

  useEffect(() => { setPage(1); }, [search, status, rating]);
  useEffect(() => { load(); }, [load]);

  const statuses = ['Excellent','Good','Fair','Watchlist','Non-Performing'];
  const ratings = ['AAA','AA','A','BBB','BB','B','CCC','CC'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search loan/borrower…" />
        <SelectFilter value={rating} onChange={setRating} options={ratings} label="All Ratings" />
        <SelectFilter value={status} onChange={setStatus} options={statuses} label="All Statuses" />
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {error ? <ErrorState msg={error} onRetry={load} /> : (
        <>
          <TableWrapper>
            <thead>
              <tr>
                <TH>Loan ID</TH><TH>Borrower</TH><TH>Type</TH><TH>Rating</TH>
                <TH>On-Time %</TH><TH>Missed Pmts</TH><TH>DPD</TH>
                <TH>PD</TH><TH>Util%</TH><TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows cols={10} /> : data.map(r => (
                <tr key={r.loan_id} className="hover:bg-muted/30 transition-colors">
                  <TD><span className="font-mono text-primary text-[11px]">{r.loan_id}</span></TD>
                  <TD><span className="font-mono text-muted-foreground text-[11px]">{r.borrower_id}</span></TD>
                  <TD><span className="text-muted-foreground text-[11px]">{r.facility_type}</span></TD>
                  <TD><span className={ratingBadge(r.credit_rating)}>{r.credit_rating}</span></TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.on_time_pct >= 90 ? 'bg-emerald-500' : r.on_time_pct >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${r.on_time_pct}%` }} />
                      </div>
                      <span className={`font-mono text-[10px] font-semibold ${r.on_time_pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : r.on_time_pct >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {r.on_time_pct.toFixed(1)}%
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <span className={`font-mono font-bold text-[11px] ${r.missed_payments === 0 ? 'text-emerald-600 dark:text-emerald-400' : r.missed_payments <= 2 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {r.missed_payments}
                    </span>
                  </TD>
                  <TD>
                    <span className={`font-mono text-[11px] ${r.days_past_due === 0 ? 'text-emerald-600 dark:text-emerald-400' : r.days_past_due <= 30 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {r.days_past_due}d
                    </span>
                  </TD>
                  <TD><span className="font-mono text-rose-500 text-[11px]">{pct(r.pd)}</span></TD>
                  <TD><span className="font-mono text-[11px]">{pct(r.utilization_rate)}</span></TD>
                  <TD><span className={statusBadge(r.repayment_status)}>{r.repayment_status}</span></TD>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PageControls page={page} total={total} pageSize={20} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export const DataManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [summary, setSummary] = useState<DataManagementSummary | null>(null);
  const [sumErr, setSumErr] = useState(false);

  useEffect(() => {
    riskApi.getDataSummary()
      .then(setSummary)
      .catch(() => setSumErr(true));
  }, []);

  const PANEL_MAP: Record<Tab, React.ReactNode> = {
    'customers':      <CustomersPanel />,
    'loans':          <LoansPanel />,
    'income':         <IncomePanel />,
    'credit-history': <CreditHistoryPanel />,
    'liabilities':    <LiabilitiesPanel />,
    'repayment':      <RepaymentPanel />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Data Management</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Comprehensive view of all institutional data — customer profiles, loan facilities, income records,
            credit history, existing liabilities, and repayment performance.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary ? (
        <SummaryCards summary={summary} />
      ) : !sumErr ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-muted mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-border/60 bg-muted/20">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all
                  ${isActive
                    ? `${TAB_ACTIVE[tab.color]} border-current`
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
              >
                <span className={isActive ? '' : 'text-muted-foreground'}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Panel Content */}
        <div className="p-5">
          {PANEL_MAP[activeTab]}
        </div>
      </div>
    </div>
  );
};
