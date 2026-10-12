import {
  PortfolioSummary,
  PortfolioExposures,
  PDCalculationResponse,
  LGDCalculationResponse,
  EADCalculationResponse,
  RiskDistributions,
  MigrationResponse,
  ConcentrationResponse,
  StressTestResponse,
  MonteCarloResponse,
  ValidationResponse,
  PortfolioReport,
  LoanItem,
  BaselCapitalResponse,
  IFRS9StagingResponse,
  RAROCResponse,
  CustomerInfo,
  LoanInfoItem,
  IncomeRecord,
  CreditHistoryRecord,
  LiabilityRecord,
  RepaymentRecord,
  DataPaginatedResponse,
  DataManagementSummary,
} from '../types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error [${res.status}]: ${errorText || res.statusText}`);
  }
  return res.json();
}

export const riskApi = {
  // Portfolio
  getPortfolioSummary: () => fetchJson<PortfolioSummary>(`${API_BASE}/portfolio/summary`),
  getPortfolioExposure: () => fetchJson<PortfolioExposures>(`${API_BASE}/portfolio/exposure`),

  // Core Risk Calculators
  calculatePD: (params: {
    rating?: string;
    leverage?: number;
    debt_ratio?: number;
    interest_coverage?: number;
    profitability?: number;
    liquidity?: number;
    unemployment_rate?: number;
    interest_rate?: number;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
    return fetchJson<PDCalculationResponse>(`${API_BASE}/risk/pd?${query.toString()}`);
  },

  calculateLGD: (params: {
    exposure: number;
    collateral_value: number;
    collateral_type: string;
    seniority: string;
    haircut_override?: number;
    downturn_multiplier?: number;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
    return fetchJson<LGDCalculationResponse>(`${API_BASE}/risk/lgd?${query.toString()}`);
  },

  calculateEAD: (params: {
    drawn_balance: number;
    credit_limit: number;
    facility_type: string;
    ccf_override?: number;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) query.append(k, String(v));
    });
    return fetchJson<EADCalculationResponse>(`${API_BASE}/risk/ead?${query.toString()}`);
  },

  calculateSingleEL: (pd: number, lgd: number, ead: number) =>
    fetchJson<{ pd: number; lgd: number; ead: number; expected_loss: number; expected_loss_rate: number }>(
      `${API_BASE}/risk/expected-loss`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pd, lgd, ead }),
      }
    ),

  getRiskDistributions: () => fetchJson<RiskDistributions>(`${API_BASE}/risk/distributions`),

  // Migration
  getMigration: (periods: number = 1) =>
    fetchJson<MigrationResponse>(`${API_BASE}/risk/migration?periods=${periods}`),

  // Concentration
  getConcentration: () => fetchJson<ConcentrationResponse>(`${API_BASE}/risk/concentration`),

  // Stress Testing
  getStressTests: () => fetchJson<StressTestResponse>(`${API_BASE}/stress-tests`),
  runCustomStressTest: (scenario: {
    name: string;
    description: string;
    gdp_growth: number;
    interest_rate: number;
    unemployment_rate: number;
    collateral_haircut_shock: number;
  }) =>
    fetchJson<StressTestResponse>(`${API_BASE}/stress-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    }),

  // Monte Carlo
  getLatestMonteCarlo: () => fetchJson<MonteCarloResponse>(`${API_BASE}/monte-carlo`),
  runMonteCarlo: (params: {
    n_simulations: number;
    random_seed: number;
    asset_correlation: number;
    stochastic_lgd: boolean;
    sample_size?: number;
  }) =>
    fetchJson<MonteCarloResponse>(`${API_BASE}/monte-carlo/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),

  // Validation
  runModelValidation: (sample_size: number = 5000, n_bins: number = 10) =>
    fetchJson<ValidationResponse>(`${API_BASE}/models/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_size, n_bins }),
    }),

  // Report
  getPortfolioReport: () => fetchJson<PortfolioReport>(`${API_BASE}/reports/portfolio`),

  // Loans Explorer
  getLoans: (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    rating?: string;
    facility_type?: string;
    sort_by?: string;
    order?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
    }
    return fetchJson<LoanItem[]>(`${API_BASE}/loans?${query.toString()}`);
  },

  getLoanById: (loanId: string) => fetchJson<LoanItem>(`${API_BASE}/loans/${loanId}`),

  // Regulatory Capital & Basel III/IV
  getBaselCapital: (sample_size: number = 50000) =>
    fetchJson<BaselCapitalResponse>(`${API_BASE}/regulatory/capital?sample_size=${sample_size}`),

  // IFRS 9 / CECL Multi-Stage Provisioning
  getIFRS9Staging: (sample_size: number = 50000) =>
    fetchJson<IFRS9StagingResponse>(`${API_BASE}/regulatory/ifrs9?sample_size=${sample_size}`),

  // RAROC & Deal Underwriting
  calculateRAROC: (params: {
    credit_limit: number;
    drawn_balance: number;
    interest_spread_bps: number;
    pd: number;
    lgd: number;
    maturity_years: number;
    upfront_fee_pct: number;
    ccf: number;
  }) =>
    fetchJson<RAROCResponse>(`${API_BASE}/pricing/raroc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),

  // ML Credit Risk
  getMLOverview: () => fetchJson<any>(`${API_BASE}/ml/overview`),

  // ── Data Management ────────────────────────────────────────────────────────
  getDataSummary: () =>
    fetchJson<DataManagementSummary>(`${API_BASE}/data-management/summary`),

  getCustomers: (params?: { page?: number; page_size?: number; search?: string; sector?: string; rating?: string; country?: string }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.append(k, String(v)); });
    return fetchJson<DataPaginatedResponse<CustomerInfo>>(`${API_BASE}/data-management/customers?${q}`);
  },

  getLoanData: (params?: { page?: number; page_size?: number; search?: string; facility_type?: string; rating?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.append(k, String(v)); });
    return fetchJson<DataPaginatedResponse<LoanInfoItem>>(`${API_BASE}/data-management/loans?${q}`);
  },

  getIncomeData: (params?: { page?: number; page_size?: number; search?: string; income_tier?: string }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.append(k, String(v)); });
    return fetchJson<DataPaginatedResponse<IncomeRecord>>(`${API_BASE}/data-management/income?${q}`);
  },

  getCreditHistory: (params?: { page?: number; page_size?: number; search?: string; credit_tier?: string; rating?: string }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.append(k, String(v)); });
    return fetchJson<DataPaginatedResponse<CreditHistoryRecord>>(`${API_BASE}/data-management/credit-history?${q}`);
  },

  getLiabilities: (params?: { page?: number; page_size?: number; search?: string; min_ead?: number; max_ead?: number }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.append(k, String(v)); });
    return fetchJson<DataPaginatedResponse<LiabilityRecord>>(`${API_BASE}/data-management/liabilities?${q}`);
  },

  getRepaymentHistory: (params?: { page?: number; page_size?: number; search?: string; status?: string; rating?: string }) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.append(k, String(v)); });
    return fetchJson<DataPaginatedResponse<RepaymentRecord>>(`${API_BASE}/data-management/repayment-history?${q}`);
  },

  // Apache Kafka Real-Time Streaming Layer
  getKafkaStatus: () => fetchJson<{
    kafka_enabled: boolean;
    bootstrap_servers: string;
    topic: string;
    consumer_group: string;
    producer_status: {
      connected: boolean;
      published_count: number;
      failed_count: number;
    };
    consumer_status: {
      running: boolean;
      processed_count: number;
      error_count: number;
      last_event_time: string | null;
    };
  }>(`${API_BASE}/kafka/status`),

  emitKafkaEvent: (data: { event_type?: string; loan_id?: string; borrower_id?: string; payload?: Record<string, any> }) =>
    fetchJson<{ status: string; published_to_kafka: boolean; event: any; risk_engine_result: any }>(
      `${API_BASE}/kafka/emit-event`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    ),

  simulateKafkaStream: (count = 5, interval_seconds = 0.5) =>
    fetchJson<{ message: string; interval_seconds: number; topic: string }>(
      `${API_BASE}/kafka/simulate-stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, interval_seconds }),
      }
    ),

  getKafkaEvents: (limit = 30) =>
    fetchJson<Array<{
      event_id: string;
      timestamp: string;
      event_type: string;
      loan_id: string;
      borrower_id: string;
      published_to_kafka: boolean;
      payload: Record<string, any>;
      risk_impact: any;
    }>>(`${API_BASE}/kafka/events?limit=${limit}`),
};
