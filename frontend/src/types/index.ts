export interface PortfolioSummary {
  total_exposure: number;
  total_loans: number;
  total_expected_loss: number;
  weighted_pd: number;
  weighted_lgd: number;
  expected_loss_rate: number;
  var_95: number;
  var_99: number;
  expected_shortfall_99: number;
}

export interface ExposureBreakdownItem {
  rating?: string;
  sector?: string;
  geography?: string;
  borrower_id?: string;
  exposure: number;
  share: number;
  loan_count: number;
}

export interface ProductRiskItem {
  product: string;
  facility_type: string;
  exposure: number;
  share: number;
  loan_count: number;
  weighted_pd: number;
  weighted_lgd: number;
  expected_loss: number;
}

export interface GeographyRiskItem {
  geography: string;
  exposure: number;
  share: number;
  loan_count: number;
  weighted_pd: number;
  expected_loss: number;
}

export interface SegmentRiskItem {
  segment: string;
  exposure: number;
  share: number;
  loan_count: number;
  obligor_count: number;
  weighted_pd: number;
  expected_loss: number;
}

export interface HighRiskBorrowerItem {
  borrower_id: string;
  legal_name: string;
  credit_rating: string;
  exposure: number;
  share: number;
  loan_count: number;
  pd: number;
  expected_loss: number;
  risk_tier: string;
}

export interface PortfolioExposures {
  total_exposure: number;
  total_expected_loss?: number;
  default_rate?: number;
  expected_loss_rate?: number;
  by_rating: ExposureBreakdownItem[];
  by_sector: ExposureBreakdownItem[];
  by_geography: GeographyRiskItem[];
  by_product?: ProductRiskItem[];
  by_segment?: SegmentRiskItem[];
  high_risk_borrowers?: HighRiskBorrowerItem[];
  top_borrowers: ExposureBreakdownItem[];
}

export interface PDCalculationResponse {
  method: string;
  rating_mapped_pd: number | null;
  logistic_model_pd: number;
  final_pd: number;
  rating: string | null;
  factors_used: Record<string, number>;
}

export interface LGDCalculationResponse {
  exposure: number;
  collateral_value: number;
  collateral_type: string;
  haircut_applied: number;
  effective_collateral: number;
  seniority: string;
  seniority_recovery_rate: number;
  total_recovery_rate: number;
  lgd: number;
}

export interface EADCalculationResponse {
  drawn_balance: number;
  credit_limit: number;
  undrawn_commitment: number;
  facility_type: string;
  ccf: number;
  ead: number;
}

export interface RiskDistributions {
  pd_distribution: Array<{ bin: string; count: number }>;
  lgd_distribution: Array<{ bin: string; count: number }>;
  ead_distribution: Array<{ bin: string; count: number }>;
}

export interface RatingAnalysisItem {
  rating: string;
  unchanged: number;
  upgrade: number;
  downgrade: number;
  default_prob: number;
}

export interface MigrationResponse {
  periods: number;
  ratings: string[];
  transition_matrix: number[][];
  rating_analysis: RatingAnalysisItem[];
  overall_avg_upgrade: number;
  overall_avg_downgrade: number;
  overall_avg_unchanged: number;
  overall_avg_default: number;
}

export interface ConcentrationResponse {
  total_exposure: number;
  obligor_count: number;
  hhi_borrower: number;
  hhi_borrower_bps: number;
  effective_obligors: number;
  gini_coefficient: number;
  top_5_share: number;
  top_10_share: number;
  top_20_share: number;
  hhi_sector: number;
  hhi_sector_bps: number;
  hhi_geography: number;
  hhi_geography_bps: number;
  sector_breakdown: Array<{ sector: string; exposure: number; share: number }>;
  geography_breakdown: Array<{ geography: string; exposure: number; share: number }>;
  top_borrowers: Array<{ borrower_id: string; exposure: number; share: number }>;
}

export interface StressScenarioResult {
  scenario_name: string;
  description: string;
  macro_inputs: {
    name?: string;
    description?: string;
    gdp_growth: number;
    interest_rate: number;
    unemployment_rate: number;
    collateral_haircut_shock: number;
  };
  weighted_pd: number;
  weighted_lgd: number;
  total_expected_loss: number;
  el_rate: number;
  estimated_var_99: number;
  estimated_es_99: number;
  el_delta_vs_base: number;
  el_pct_change: number;
}

export interface StressTestResponse {
  total_exposure: number;
  scenarios: StressScenarioResult[];
  comparison: Record<string, StressScenarioResult>;
}

export interface MonteCarloDistributionBin {
  bin_start: number;
  bin_end: number;
  frequency: number;
  probability: number;
}

export interface MonteCarloResponse {
  run_id: string;
  n_simulations: number;
  random_seed: number;
  total_ead: number;
  mean_loss: number;
  std_loss: number;
  min_loss: number;
  max_loss: number;
  expected_loss_pct: number;
  var_95: number;
  var_99: number;
  es_95: number;
  es_99: number;
  unexpected_loss_99: number;
  var_metrics: Record<string, number>;
  es_metrics: Record<string, number>;
  percentiles: Record<string, number>;
  distribution: MonteCarloDistributionBin[];
  mean_defaults_count: number;
  execution_time_seconds: number;
}

export interface ValidationResponse {
  disclaimer: string;
  discrimination: {
    roc_auc: number;
    gini: number;
    ks_statistic: number;
    ks_threshold: number;
    roc_curve: Array<{ fpr: number; tpr: number }>;
    sample_size: number;
    default_count: number;
  };
  calibration: {
    brier_score: number;
    calibration_curve: Array<{
      decile: number;
      count: number;
      predicted_pd: number;
      observed_default_rate: number;
      diff: number;
    }>;
  };
  stability: {
    total_psi: number;
    traffic_light: string;
    status: string;
    bin_breakdown: Array<{
      bin: number;
      lower_edge: number;
      upper_edge: number;
      baseline_share: number;
      target_share: number;
      psi_contribution: number;
    }>;
  };
}

export interface PortfolioReport {
  report_title: string;
  generated_at: string;
  regulatory_framework: string;
  executive_summary: PortfolioSummary;
  exposure_breakdowns: PortfolioExposures;
  concentration_metrics: {
    hhi_borrower: number;
    effective_obligors: number;
    top_10_share: number;
    hhi_sector_bps: number;
    hhi_geography_bps: number;
  };
  stress_test_overview: StressScenarioResult[];
  capital_and_tail_risk: {
    var_95: number;
    var_99: number;
    expected_shortfall_99: number;
    unexpected_loss_99: number;
  };
}

export interface LoanItem {
  loan_id: string;
  borrower_id: string;
  credit_rating: string;
  credit_limit: number;
  drawn_balance: number;
  interest_rate: number;
  facility_type: string;
  seniority: string;
  maturity_date: string;
  origination_date: string;
  pd: number;
  lgd: number;
  ead: number;
  expected_loss: number;
  status: string;
}

export interface RatingRWABreakdown {
  rating: string;
  count: number;
  ead: number;
  rwa: number;
  rwa_density_pct: number;
  min_capital: number;
}

export interface BaselCapitalResponse {
  total_ead: number;
  total_rwa: number;
  average_k: number;
  rwa_density_pct: number;
  pillar_1_minimum_capital: number;
  capital_conservation_buffer: number;
  total_regulatory_capital: number;
  tier_1_requirement_6pct: number;
  cet1_requirement_4_5pct: number;
  by_rating: RatingRWABreakdown[];
  regulatory_standards: Record<string, string>;
}

export interface StageDetail {
  stage: number;
  name: string;
  facility_count: number;
  percentage_facilities: number;
  total_exposure: number;
  exposure_share_pct: number;
  total_ecl: number;
  coverage_ratio_pct: number;
}

export interface IFRS9StagingResponse {
  total_facilities: number;
  total_exposure: number;
  total_ecl_provisions: number;
  blended_coverage_ratio_pct: number;
  stages: Record<string, StageDetail>;
}

export interface SpreadSensitivityPoint {
  spread_bps: number;
  raroc_pct: number;
  is_approved: boolean;
  eva: number;
}

export interface RAROCResponse {
  credit_limit: number;
  drawn_balance: number;
  ead: number;
  spread_bps: number;
  total_annual_revenue: number;
  expected_loss: number;
  operating_expense: number;
  net_risk_adjusted_income: number;
  economic_capital: number;
  raroc_pct: number;
  hurdle_rate_pct: number;
  economic_value_added_eva: number;
  breakeven_spread_bps: number;
  is_approved: boolean;
  recommendation: string;
  rwa: number;
  rwa_density_pct: number;
  sensitivity_curve: SpreadSensitivityPoint[];
}

// ── Data Management ─────────────────────────────────────────────────────────

export interface CustomerInfo {
  customer_id: string;
  legal_name: string;
  sector: string;
  geography: string;
  country: string;
  credit_rating: string;
  established_year?: number | null;
  is_active: boolean;
}

export interface LoanInfoItem {
  loan_id: string;
  borrower_id: string;
  facility_type: string;
  seniority: string;
  credit_rating: string;
  sector: string;
  geography: string;
  credit_limit: number;
  drawn_balance: number;
  utilization_rate: number;
  ead: number;
  pd: number;
  lgd: number;
  expected_loss: number;
  interest_rate: number;
  origination_date?: string | null;
  maturity_date?: string | null;
  status: string;
}

export interface IncomeRecord {
  customer_id: string;
  legal_name: string;
  annual_revenue: number;
  total_assets: number;
  profitability: number;
  liquidity: number;
  interest_coverage: number;
  income_tier: string;
}

export interface CreditHistoryRecord {
  customer_id: string;
  legal_name: string;
  credit_rating: string;
  pd: number;
  leverage: number;
  debt_ratio: number;
  interest_coverage: number;
  credit_tier: string;
  num_facilities: number;
}

export interface LiabilityRecord {
  customer_id: string;
  legal_name: string;
  total_drawn: number;
  total_credit_limit: number;
  overall_utilization: number;
  num_facilities: number;
  avg_pd: number;
  avg_lgd: number;
  total_ead: number;
  total_expected_loss: number;
}

export interface RepaymentRecord {
  loan_id: string;
  borrower_id: string;
  facility_type: string;
  credit_rating: string;
  pd: number;
  utilization_rate: number;
  on_time_pct: number;
  missed_payments: number;
  days_past_due: number;
  repayment_status: string;
}

export interface DataPaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  data: T[];
}

export interface DataManagementSummary {
  customers: { total: number; sectors: number; countries: number; active: number };
  loans: { total: number; facility_types: number; total_exposure: number; total_expected_loss: number };
  income: { total_records: number; avg_revenue: number; avg_profitability: number };
  credit_history: { total_records: number; avg_pd: number; ratings_distribution: Record<string, number> };
  liabilities: { total_borrowers_with_loans: number; total_drawn: number; total_credit_limit: number };
  repayment: { total_loan_records: number; avg_pd: number };
}
