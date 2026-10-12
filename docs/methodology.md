# Credit Portfolio Risk Engine — Quantitative Methodology

This document outlines the mathematical frameworks, statistical assumptions, and regulatory foundations implemented in the quantitative risk engine.

---

## 1. Expected Loss (EL)

Expected Loss represents the statistical expectation of credit losses over a one-year horizon.

### 1.1 Facility-Level Expected Loss
$$\text{EL}_i = \text{PD}_i \times \text{LGD}_i \times \text{EAD}_i$$

Where:
- $\text{PD}_i \in [0, 1]$: One-year Probability of Default.
- $\text{LGD}_i \in [0, 1]$: Loss Given Default.
- $\text{EAD}_i \ge 0$: Exposure at Default in currency units.

### 1.2 Portfolio-Level Expected Loss
$$\text{Portfolio EL} = \sum_{i=1}^N \text{EL}_i = \sum_{i=1}^N (\text{PD}_i \times \text{LGD}_i \times \text{EAD}_i)$$

### 1.3 Exposure-Weighted Metrics
$$\bar{\text{PD}} = \frac{\sum_{i=1}^N \text{PD}_i \cdot \text{EAD}_i}{\sum_{i=1}^N \text{EAD}_i}, \quad \bar{\text{LGD}} = \frac{\sum_{i=1}^N \text{LGD}_i \cdot \text{EAD}_i}{\sum_{i=1}^N \text{EAD}_i}$$

---

## 2. Probability of Default (PD)

### 2.1 Standardized Rating Master Scale (TTC)
Through-the-cycle (TTC) annualized default rates mapped to credit rating grades:
- `AAA`: 0.03%
- `AA`: 0.10%
- `A`: 0.35%
- `BBB`: 1.20%
- `BB`: 3.80%
- `B`: 9.50%
- `CCC`: 24.00%
- `Default`: 100.00%

### 2.2 Point-in-Time (PIT) Vasicek Adjustment
$$\text{PD}_{\text{PIT}} = \Phi\left(\frac{\Phi^{-1}(\text{PD}_{\text{TTC}}) - \sqrt{\rho} Z}{\sqrt{1 - \rho}}\right)$$
Where $Z \sim \mathcal{N}(0, 1)$ is the macroeconomic systematic shock.

### 2.3 Multivariate Logistic Scoring Model
$$\text{logit}(p) = \beta_0 + \sum_{k=1}^K \beta_k X_k$$
Features include leverage ($Debt/Equity$), debt ratio ($Debt/Assets$), interest coverage ratio ($EBIT/Interest$), profitability ($EBITDA/Revenue$), liquidity ($Current\ Ratio$), macro unemployment rate, and benchmark policy rate.

---

## 3. Loss Given Default (LGD)

Loss Given Default incorporates the workout recovery process:
$$\text{Secured Recovery} = \min\left(\text{EAD}, \text{Collateral Value} \times (1 - \text{Haircut})\right)$$
$$\text{Unsecured Exposure} = \max\left(0, \text{EAD} - \text{Secured Recovery}\right)$$
$$\text{Unsecured Recovery} = \text{Unsecured Exposure} \times R_{\text{seniority}}$$
$$\text{Total Recovery Rate} = \frac{\text{Secured Recovery} + \text{Unsecured Recovery}}{\text{EAD}}$$
$$\text{LGD} = 1 - \text{Total Recovery Rate} \in [0.0, 1.0]$$

---

## 4. Exposure at Default (EAD)

$$\text{EAD} = \text{Drawn Balance} + \text{CCF} \times \max(0, \text{Credit Limit} - \text{Drawn Balance})$$
Where $\text{CCF}$ denotes Credit Conversion Factor:
- Term Loans / Mortgages: $\text{CCF} = 0.0$
- Revolving Lines: $\text{CCF} = 0.50$
- Committed Corporate Lines: $\text{CCF} = 0.75$
- Letters of Credit: $\text{CCF} = 0.20$

---

## 5. Credit Rating Migration

Transition dynamics follow a discrete-time Markov chain:
$$P(n) = P^n$$
Where $P$ is the 1-year stochastic matrix with row normalization $\sum_j P_{ij} = 1$ and an absorbing default state $P_{K,K} = 1$.

---

## 6. Concentration Risk (HHI & Gini)

### 6.1 Herfindahl-Hirschman Index
$$\text{HHI} = \sum_{i=1}^N s_i^2, \quad s_i = \frac{\text{EAD}_i}{\sum_j \text{EAD}_j}$$
$$\text{Effective Number of Counterparties: } N_{\text{eff}} = \frac{1}{\text{HHI}}$$

### 6.2 Gini Coefficient
$$G = \frac{2 \sum_{i=1}^N i \cdot y_i}{N \sum_{i=1}^N y_i} - \frac{N + 1}{N}$$

---

## 7. Monte Carlo Simulation (One-Factor Gaussian Copula)

### 7.1 Asset Return Process
$$Y_{i,s} = \sqrt{\rho_i} Z_s + \sqrt{1 - \rho_i} \epsilon_{i,s}$$
Where:
- $Z_s \sim \mathcal{N}(0, 1)$ is the common economic systematic shock for simulation $s$.
- $\epsilon_{i,s} \sim \mathcal{N}(0, 1)$ is the obligor idiosyncratic shock.
- Obligor $i$ defaults if $Y_{i,s} < \Phi^{-1}(\text{PD}_i)$.

### 7.2 Portfolio Loss Realization
$$L_s = \sum_{i=1}^N \mathbb{I}_{\{Y_{i,s} < \Phi^{-1}(\text{PD}_i)\}} \times \text{LGD}_i \times \text{EAD}_i$$

### 7.3 Credit VaR & Expected Shortfall (CVaR)
$$\text{VaR}_\alpha = \inf \{ l \mid \mathbb{P}(L \le l) \ge \alpha \}$$
$$\text{ES}_\alpha = \mathbb{E}[L \mid L \ge \text{VaR}_\alpha]$$
$$\text{Unexpected Loss: } \text{UL}_\alpha = \text{VaR}_\alpha - \mathbb{E}[L]$$

---

## 8. Model Validation Metrics
- **ROC-AUC & Gini (AR)**: $Gini = 2 \times \text{AUC} - 1$
- **Kolmogorov-Smirnov**: $\text{KS} = \max |F_D(s) - F_{ND}(s)|$
- **Brier Score**: $\frac{1}{N} \sum (\hat{p}_i - y_i)^2$
- **Population Stability Index (PSI)**:
$$\text{PSI} = \sum_{b=1}^B (T_b - B_b) \times \ln\left(\frac{T_b}{B_b}\right)$$
Thresholds: $<0.10$ Stable (Green), $0.10-0.25$ Moderate Shift (Amber), $>0.25$ Significant Shift (Red).
