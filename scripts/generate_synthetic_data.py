"""
Synthetic Credit Portfolio Data Generator
=========================================
SYNTHETIC DATA — NOT REAL CUSTOMER/BANK DATA
Generates realistic corporate credit risk datasets with correlated financial relationships:
- 10,000 borrowers
- 50,000 loans
- Collateral, rating histories, payments, financial statements, macro data, scenarios.
"""

import os
import sys

# Ensure repository root is on sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import argparse
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# Benchmark constants
SECTORS = [
    "Technology", "Healthcare", "Energy", "Financials", 
    "Consumer Discretionary", "Industrials", "Real Estate", 
    "Telecommunications", "Materials", "Utilities"
]

GEOGRAPHIES = ["North America", "Europe", "Asia-Pacific", "Latin America", "Middle East"]

COUNTRIES_BY_GEO = {
    "North America": ["United States", "Canada"],
    "Europe": ["United Kingdom", "Germany", "France", "Netherlands", "Switzerland"],
    "Asia-Pacific": ["Japan", "Singapore", "Australia", "South Korea"],
    "Latin America": ["Brazil", "Mexico", "Chile"],
    "Middle East": ["UAE", "Saudi Arabia", "Qatar"],
}

RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC"]
RATING_WEIGHTS = [0.03, 0.08, 0.22, 0.35, 0.20, 0.09, 0.03]  # Realistic corporate portfolio distribution

FACILITY_TYPES = ["TERM_LOAN", "REVOLVING_CREDIT", "COMMERCIAL_LINE", "LETTER_OF_CREDIT", "MORTGAGE"]
FACILITY_WEIGHTS = [0.45, 0.25, 0.15, 0.08, 0.07]

SENIORITIES = ["SENIOR_SECURED", "SENIOR_UNSECURED", "SUBORDINATED", "JUNIOR"]
SENIORITY_WEIGHTS = [0.40, 0.45, 0.12, 0.03]

COLLATERAL_TYPES = [
    "COMMERCIAL_REAL_ESTATE", "RESIDENTIAL_REAL_ESTATE", "EQUIPMENT", 
    "RECEIVABLES", "INVENTORY", "CASH", "GOVERNMENT_BONDS"
]


def generate_all_datasets(output_dir: str, processed_dir: str, n_borrowers: int = 10000, n_loans: int = 50000, seed: int = 42):
    print(f"Generating synthetic credit portfolio: {n_borrowers} borrowers, {n_loans} loans (seed={seed})...")
    rng = np.random.default_rng(seed)
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)

    header_comment = "# SYNTHETIC DATA — NOT REAL CUSTOMER/BANK DATA\n"

    # =========================================================================
    # 1. BORROWERS (10,000)
    # =========================================================================
    print("Generating borrowers...")
    borrower_ids = [f"BORR-{i+1:06d}" for i in range(n_borrowers)]
    borrower_sectors = rng.choice(SECTORS, size=n_borrowers)
    borrower_geos = rng.choice(GEOGRAPHIES, size=n_borrowers, p=[0.40, 0.30, 0.18, 0.07, 0.05])
    borrower_countries = [rng.choice(COUNTRIES_BY_GEO[g]) for g in borrower_geos]
    
    # Financial indicators correlated with rating
    base_ratings = rng.choice(RATINGS, size=n_borrowers, p=RATING_WEIGHTS)
    rating_score_map = {"AAA": 1, "AA": 2, "A": 3, "BBB": 4, "BB": 5, "B": 6, "CCC": 7}
    r_scores = np.array([rating_score_map[r] for r in base_ratings])

    # Higher rating score (worse credit) -> higher leverage, lower coverage, lower liquidity
    leverage = np.clip(0.5 + 0.6 * r_scores + rng.normal(0, 0.5, size=n_borrowers), 0.3, 10.0).round(2)
    debt_ratio = np.clip(0.15 + 0.08 * r_scores + rng.normal(0, 0.06, size=n_borrowers), 0.05, 0.95).round(3)
    interest_coverage = np.clip(12.0 - 1.4 * r_scores + rng.normal(0, 1.2, size=n_borrowers), 0.2, 25.0).round(2)
    profitability = np.clip(0.20 - 0.025 * r_scores + rng.normal(0, 0.03, size=n_borrowers), -0.25, 0.35).round(3)
    liquidity = np.clip(3.0 - 0.28 * r_scores + rng.normal(0, 0.3, size=n_borrowers), 0.4, 5.5).round(2)

    annual_revenue = np.round(np.exp(rng.normal(16.5, 1.2, size=n_borrowers)), -3)  # ~10M - 500M
    total_assets = np.round(annual_revenue * rng.uniform(0.8, 1.8, size=n_borrowers), -3)

    borrowers_df = pd.DataFrame({
        "borrower_id": borrower_ids,
        "legal_name": [f"Enterprise Corp {i+1}" for i in range(n_borrowers)],
        "sector": borrower_sectors,
        "geography": borrower_geos,
        "country": borrower_countries,
        "credit_rating": base_ratings,
        "annual_revenue": annual_revenue,
        "total_assets": total_assets,
        "leverage": leverage,
        "debt_ratio": debt_ratio,
        "interest_coverage": interest_coverage,
        "profitability": profitability,
        "liquidity": liquidity,
        "established_year": rng.integers(1960, 2021, size=n_borrowers),
        "is_active": True,
    })
    borrowers_path = os.path.join(output_dir, "borrowers.csv")
    borrowers_df.to_csv(borrowers_path, index=False)

    # =========================================================================
    # 2. LOANS & FACILITIES (50,000)
    # =========================================================================
    print("Generating loans...")
    loan_ids = [f"LN-{i+1:07d}" for i in range(n_loans)]
    # Distribute loans across borrowers (on average 5 per borrower)
    assigned_borrower_idx = rng.choice(n_borrowers, size=n_loans)
    loan_borrowers = [borrower_ids[idx] for idx in assigned_borrower_idx]
    loan_ratings = base_ratings[assigned_borrower_idx]
    loan_sectors = borrower_sectors[assigned_borrower_idx]
    loan_geos = borrower_geos[assigned_borrower_idx]

    facility_types = rng.choice(FACILITY_TYPES, size=n_loans, p=FACILITY_WEIGHTS)
    seniorities = rng.choice(SENIORITIES, size=n_loans, p=SENIORITY_WEIGHTS)

    # Loan size based on borrower assets
    borrower_asset_ref = total_assets[assigned_borrower_idx]
    credit_limits = np.round(borrower_asset_ref * rng.uniform(0.02, 0.20, size=n_loans), -3)
    credit_limits = np.clip(credit_limits, 50000.0, 50000000.0)

    # Utilization: term loans = 1.0, revolving = 0.3 - 0.95
    utilization = np.where(
        np.isin(facility_types, ["TERM_LOAN", "MORTGAGE"]),
        1.0,
        rng.uniform(0.25, 0.90, size=n_loans)
    ).round(3)
    outstanding_balances = np.round(credit_limits * utilization, 2)

    # Interest rates: benchmark risk-free ~4.5% + spread based on rating
    rating_spread_map = {"AAA": 0.012, "AA": 0.018, "A": 0.026, "BBB": 0.038, "BB": 0.058, "B": 0.088, "CCC": 0.135}
    spreads = np.array([rating_spread_map[r] for r in loan_ratings])
    interest_rates = (0.045 + spreads + rng.normal(0, 0.005, size=n_loans)).clip(0.04, 0.24).round(4)

    # Realistic PD and LGD calculation
    from backend.risk_engine.pd.rating_pd import RatingPDMapper
    from backend.risk_engine.lgd.lgd_model import LGDModel
    from backend.risk_engine.ead.ead_model import EADModel

    pd_mapper = RatingPDMapper()
    lgd_engine = LGDModel()
    ead_engine = EADModel()

    # CCF mapping
    ccf_map = {"TERM_LOAN": 0.0, "MORTGAGE": 0.0, "REVOLVING_CREDIT": 0.50, "COMMERCIAL_LINE": 0.75, "LETTER_OF_CREDIT": 0.20}
    loan_ccf = np.array([ccf_map.get(ft, 0.50) for ft in facility_types])

    calc_ead = ead_engine.calculate_portfolio_ead(outstanding_balances, credit_limits, loan_ccf).round(2)
    base_pd_vals = np.array([pd_mapper.get_pd(r) for r in loan_ratings])
    # Add slight idiosyncratic variation around rating PD
    loan_pds = np.clip(base_pd_vals * rng.uniform(0.85, 1.25, size=n_loans), 0.0001, 0.9999).round(5)

    # Term, origination, maturity
    base_date = datetime(2024, 1, 1)
    origination_offsets = rng.integers(-1000, -30, size=n_loans)
    origination_dates = [(base_date + timedelta(days=int(off))).strftime("%Y-%m-%d") for off in origination_offsets]
    tenors = rng.choice([12, 24, 36, 48, 60, 84, 120], size=n_loans)
    maturity_dates = [(datetime.strptime(origination_dates[i], "%Y-%m-%d") + timedelta(days=int(tenors[i] * 30))).strftime("%Y-%m-%d") for i in range(n_loans)]

    loans_df = pd.DataFrame({
        "loan_id": loan_ids,
        "borrower_id": loan_borrowers,
        "facility_type": facility_types,
        "seniority": seniorities,
        "credit_rating": loan_ratings,
        "sector": loan_sectors,
        "geography": loan_geos,
        "credit_limit": credit_limits,
        "drawn_balance": outstanding_balances,
        "utilization_rate": utilization,
        "ccf": loan_ccf,
        "ead": calc_ead,
        "pd": loan_pds,
        "interest_rate": interest_rates,
        "origination_date": origination_dates,
        "maturity_date": maturity_dates,
        "tenor_months": tenors,
        "status": "ACTIVE",
    })

    # =========================================================================
    # 3. COLLATERAL (for ~50% of loans, especially secured)
    # =========================================================================
    print("Generating collateral...")
    secured_mask = np.isin(seniorities, ["SENIOR_SECURED", "SUBORDINATED"]) | (rng.random(size=n_loans) < 0.25)
    secured_loan_indices = np.where(secured_mask)[0]
    n_collateral = len(secured_loan_indices)

    col_types = rng.choice(COLLATERAL_TYPES, size=n_collateral)
    haircut_map = lgd_engine.haircuts
    col_haircuts = np.array([haircut_map.get(ct, 0.30) for ct in col_types])
    
    # Collateral coverage: between 60% and 150% of credit limit
    col_coverage = rng.uniform(0.60, 1.50, size=n_collateral)
    col_values = np.round(credit_limits[secured_loan_indices] * col_coverage, -2)

    collateral_df = pd.DataFrame({
        "collateral_id": [f"COL-{i+1:06d}" for i in range(n_collateral)],
        "loan_id": [loan_ids[idx] for idx in secured_loan_indices],
        "collateral_type": col_types,
        "valuation_amount": col_values,
        "valuation_currency": "USD",
        "haircut": col_haircuts,
        "valuation_date": "2024-01-15",
        "is_perfected": True,
    })
    collateral_path = os.path.join(output_dir, "collateral.csv")
    collateral_df.to_csv(collateral_path, index=False)

    # Merge collateral back to compute exact LGD for each loan
    loan_col_val = np.zeros(n_loans)
    loan_col_haircut = np.ones(n_loans) * 0.40
    loan_col_type = np.array(["UNSECURED"] * n_loans)

    for i, idx in enumerate(secured_loan_indices):
        loan_col_val[idx] = col_values[i]
        loan_col_haircut[idx] = col_haircuts[i]
        loan_col_type[idx] = col_types[i]

    rec_rates = np.array([lgd_engine.seniority_recoveries.get(s, 0.35) for s in seniorities])
    loan_lgds = lgd_engine.calculate_portfolio_lgd(
        calc_ead, loan_col_val, loan_col_haircut, rec_rates
    ).round(4)
    loans_df["lgd"] = loan_lgds

    # Expected Loss per loan
    loans_df["expected_loss"] = (loans_df["pd"] * loans_df["lgd"] * loans_df["ead"]).round(2)
    loans_path = os.path.join(output_dir, "loans.csv")
    loans_df.to_csv(loans_path, index=False)

    # =========================================================================
    # 4. RATINGS HISTORY (transitions over 3-5 years)
    # =========================================================================
    print("Generating rating history...")
    history_records = []
    from backend.risk_engine.migration.transition_matrix import CreditMigrationEngine
    mig_engine = CreditMigrationEngine()
    t_mat = mig_engine.matrix

    # Generate historical migrations for a subset of active borrowers over 3 annual cycles
    sample_size = min(len(borrower_ids), 4000)
    sample_borrowers = rng.choice(borrower_ids, size=sample_size, replace=False)
    for b_id in sample_borrowers:
        b_idx = int(b_id.split("-")[1]) - 1
        curr_rating = base_ratings[b_idx]
        for yr in [2021, 2022, 2023]:
            r_idx = CreditMigrationEngine.RATING_ORDER.index(curr_rating)
            next_r_idx = rng.choice(len(CreditMigrationEngine.RATING_ORDER), p=t_mat[r_idx])
            next_rating = CreditMigrationEngine.RATING_ORDER[next_r_idx]
            history_records.append({
                "borrower_id": b_id,
                "review_date": f"{yr}-12-31",
                "initial_rating": curr_rating,
                "final_rating": next_rating,
                "is_upgrade": next_r_idx < r_idx,
                "is_downgrade": next_r_idx > r_idx,
                "is_unchanged": next_r_idx == r_idx,
            })
            curr_rating = next_rating
            if curr_rating == "Default":
                break

    ratings_history_df = pd.DataFrame(history_records)
    ratings_history_path = os.path.join(output_dir, "ratings_history.csv")
    ratings_history_df.to_csv(ratings_history_path, index=False)

    # =========================================================================
    # 5. DEFAULTS & RECOVERIES
    # =========================================================================
    print("Generating defaults...")
    # Simulate historical default records (~1.8% cumulative historical default rate)
    def_candidates = np.where(loans_df["pd"] > 0.02)[0]
    n_defaults = min(len(def_candidates), 1200)
    default_indices = rng.choice(def_candidates, size=n_defaults, replace=False)
    
    defaults_records = []
    for idx in default_indices:
        l_row = loans_df.iloc[idx]
        ead_val = l_row["ead"]
        realized_rec_rate = np.clip(1.0 - l_row["lgd"] + rng.normal(0, 0.08), 0.0, 0.95)
        rec_amount = round(ead_val * realized_rec_rate, 2)
        realized_loss = round(ead_val - rec_amount, 2)
        def_date = base_date - timedelta(days=int(rng.integers(30, 720)))
        defaults_records.append({
            "default_id": f"DEF-{len(defaults_records)+1:06d}",
            "loan_id": l_row["loan_id"],
            "borrower_id": l_row["borrower_id"],
            "default_date": def_date.strftime("%Y-%m-%d"),
            "default_trigger": rng.choice(["BANKRUPTCY", "DAYS_PAST_DUE_90", "DISTRESSED_RESTRUCTURING"]),
            "exposure_at_default": ead_val,
            "recovery_amount": rec_amount,
            "realized_loss": realized_loss,
            "recovery_rate": round(realized_rec_rate, 4),
            "resolution_status": rng.choice(["RESOLVED", "IN_WORKOUT", "LIQUIDATING"]),
        })

    defaults_df = pd.DataFrame(defaults_records)
    defaults_path = os.path.join(output_dir, "defaults.csv")
    defaults_df.to_csv(defaults_path, index=False)

    # =========================================================================
    # 6. PAYMENTS HISTORY
    # =========================================================================
    print("Generating payments history sample...")
    payment_records = []
    # Sample 5,000 active loans for monthly payment trace
    sample_loans = loans_df.sample(n=min(5000, n_loans), random_state=seed)
    for _, l_row in sample_loans.iterrows():
        rate = l_row["interest_rate"]
        balance = l_row["drawn_balance"]
        monthly_interest = balance * (rate / 12.0)
        principal_due = balance / 60.0
        
        # 12 monthly payments
        for m in range(1, 13):
            due_date = datetime(2023, m, 15)
            # Higher rating / lower PD has near 100% on-time, CCC has delinquencies
            is_delinquent = rng.random() < (l_row["pd"] * 1.5)
            days_late = int(rng.exponential(15)) if is_delinquent else 0
            payment_records.append({
                "payment_id": f"PMT-{len(payment_records)+1:07d}",
                "loan_id": l_row["loan_id"],
                "borrower_id": l_row["borrower_id"],
                "due_date": due_date.strftime("%Y-%m-%d"),
                "payment_date": (due_date + timedelta(days=days_late)).strftime("%Y-%m-%d"),
                "scheduled_amount": round(monthly_interest + principal_due, 2),
                "actual_amount_paid": round(0.0 if days_late > 60 else (monthly_interest + principal_due), 2),
                "days_past_due": days_late,
                "status": "PAID" if days_late <= 30 else ("DELINQUENT" if days_late <= 90 else "DEFAULTED"),
            })

    payments_df = pd.DataFrame(payment_records)
    payments_path = os.path.join(output_dir, "payments.csv")
    payments_df.to_csv(payments_path, index=False)

    # =========================================================================
    # 7. FINANCIAL STATEMENTS
    # =========================================================================
    print("Generating financial statements...")
    fs_records = []
    for _, b_row in borrowers_df.iterrows():
        b_id = b_row["borrower_id"]
        rev = b_row["annual_revenue"]
        assets = b_row["total_assets"]
        lev = b_row["leverage"]
        
        ebitda = rev * b_row["profitability"]
        interest_exp = max(10000.0, ebitda / max(0.1, b_row["interest_coverage"]))
        total_debt = assets * b_row["debt_ratio"]
        total_equity = total_debt / max(0.1, lev)
        curr_assets = assets * 0.45
        curr_liab = curr_assets / max(0.2, b_row["liquidity"])

        fs_records.append({
            "statement_id": f"FS-{b_id}-2023",
            "borrower_id": b_id,
            "fiscal_year": 2023,
            "period_end_date": "2023-12-31",
            "revenue": round(rev, 2),
            "ebitda": round(ebitda, 2),
            "interest_expense": round(interest_exp, 2),
            "total_assets": round(assets, 2),
            "total_debt": round(total_debt, 2),
            "total_equity": round(total_equity, 2),
            "current_assets": round(curr_assets, 2),
            "current_liabilities": round(curr_liab, 2),
            "operating_cash_flow": round(ebitda * 0.85, 2),
            "audit_opinion": "UNQUALIFIED",
        })

    financial_statements_df = pd.DataFrame(fs_records)
    financial_statements_path = os.path.join(output_dir, "financial_statements.csv")
    financial_statements_df.to_csv(financial_statements_path, index=False)

    # =========================================================================
    # 8. MACROECONOMIC DATA
    # =========================================================================
    print("Generating macroeconomic history...")
    dates = pd.date_range(start="2015-01-01", end="2024-03-31", freq="QE")
    macro_records = []
    gdp_val = 2.4
    unemp_val = 5.2
    ir_val = 4.0

    for d in dates:
        # Realistic macroeconomic mean-reverting series
        gdp_val = np.clip(0.7 * gdp_val + 0.3 * 2.2 + rng.normal(0, 0.6), -3.0, 7.5)
        unemp_val = np.clip(0.85 * unemp_val + 0.15 * 5.0 + rng.normal(0, 0.4), 3.2, 14.5)
        ir_val = np.clip(0.9 * ir_val + 0.1 * 4.5 + rng.normal(0, 0.3), 0.5, 12.0)
        cpi = np.clip(2.5 + 0.4 * (ir_val - 4.0) + rng.normal(0, 0.3), 0.5, 9.5)

        macro_records.append({
            "reporting_quarter": f"{d.year}-Q{d.quarter}",
            "date": d.strftime("%Y-%m-%d"),
            "gdp_growth_rate": round(gdp_val, 2),
            "unemployment_rate": round(unemp_val, 2),
            "central_bank_policy_rate": round(ir_val, 2),
            "cpi_inflation": round(cpi, 2),
            "commercial_property_index": round(100.0 + rng.normal(0, 3.0), 2),
            "credit_spread_bbb_bps": round(150.0 + unemp_val * 20.0 + rng.normal(0, 15.0), 1),
        })

    macro_df = pd.DataFrame(macro_records)
    macro_path = os.path.join(output_dir, "macroeconomic_data.csv")
    macro_df.to_csv(macro_path, index=False)

    # =========================================================================
    # 9. SCENARIOS DEFINITIONS
    # =========================================================================
    print("Generating stress scenarios...")
    scenarios_df = pd.DataFrame([
        {
            "scenario_id": "SCEN-BASE",
            "scenario_name": "Base",
            "description": "Baseline macroeconomic environment representing steady economic growth",
            "gdp_growth": 6.0,
            "interest_rate": 6.5,
            "unemployment_rate": 5.0,
            "collateral_haircut_shock": 0.0,
            "is_standard": True,
        },
        {
            "scenario_id": "SCEN-MODERATE",
            "scenario_name": "Moderate",
            "description": "Moderate stagflationary slowdown with rising interest rates and softening asset prices",
            "gdp_growth": 3.0,
            "interest_rate": 8.0,
            "unemployment_rate": 8.0,
            "collateral_haircut_shock": 0.10,
            "is_standard": True,
        },
        {
            "scenario_id": "SCEN-SEVERE",
            "scenario_name": "Severe",
            "description": "Severe global recession crisis with liquidity freeze, property devaluation, and high defaults",
            "gdp_growth": -2.0,
            "interest_rate": 10.0,
            "unemployment_rate": 14.0,
            "collateral_haircut_shock": 0.25,
            "is_standard": True,
        },
    ])
    scenarios_path = os.path.join(output_dir, "scenarios.csv")
    scenarios_df.to_csv(scenarios_path, index=False)

    # Save fast Parquet versions in data/processed/
    print("Saving processed Parquet caches for accelerated analytics...")
    borrowers_df.to_parquet(os.path.join(processed_dir, "borrowers.parquet"), index=False)
    loans_df.to_parquet(os.path.join(processed_dir, "loans.parquet"), index=False)
    collateral_df.to_parquet(os.path.join(processed_dir, "collateral.parquet"), index=False)
    macro_df.to_parquet(os.path.join(processed_dir, "macroeconomic_data.parquet"), index=False)

    print("\nSUCCESS: All 9 synthetic datasets successfully generated!")
    print(f"Data directory: {os.path.abspath(output_dir)}")
    print(f"Processed parquet directory: {os.path.abspath(processed_dir)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic corporate credit risk data")
    parser.add_argument("--borrowers", type=int, default=10000, help="Number of borrowers")
    parser.add_argument("--loans", type=int, default=50000, help="Number of loans")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output-dir", type=str, default="data/synthetic", help="Output directory for CSVs")
    parser.add_argument("--processed-dir", type=str, default="data/processed", help="Output directory for Parquet")
    args = parser.parse_args()

    generate_all_datasets(
        output_dir=args.output_dir,
        processed_dir=args.processed_dir,
        n_borrowers=args.borrowers,
        n_loans=args.loans,
        seed=args.seed,
    )
