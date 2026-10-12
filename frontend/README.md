# Credit Portfolio Risk Engine - Frontend

Modern Institutional Risk Dashboard built with React, TypeScript, Tailwind CSS, and Apache ECharts.

## Tech Stack
- **React 18** with TypeScript
- **Tailwind CSS** for institutional dark financial theme
- **Apache ECharts** (`echarts-for-react`) for high-performance interactive risk visualizations
- **Vite** for fast HMR and optimized builds
- **Lucide Icons**

## Key Features
- **Executive Dashboard**: Real-time calculated portfolio metrics (Total EAD, EL, Weighted PD/LGD, 95%/99% VaR, Expected Shortfall)
- **Portfolio Analytics**: Interactive exposure distributions by rating, industry sector, geographic region, and top obligor table
- **Credit Risk Parameter Studio**: Live interactive single-loan Expected Loss calculator (`EL = PD × LGD × EAD`) plus portfolio PD, LGD, EAD histograms
- **Rating Migration**: 8x8 Markov transition matrix heatmap, multi-period matrix power calculations ($P(n) = P^n$), upgrade/downgrade decomposition
- **Concentration Risk**: Herfindahl-Hirschman Index (HHI) for obligors, sectors, and geographies, $N_{eff} = 1 / HHI$, Gini concentration index, and top obligor shares
- **Macroeconomic Stress Testing**: Side-by-side comparison of Base, Moderate, and Severe scenarios, plus an interactive form to simulate custom macro shocks
- **Monte Carlo Simulation**: Interactive execution of 10,000 Vasicek Gaussian copula iterations, loss distribution frequency histogram, and tail quantiles
- **Model Validation**: ROC curve, ROC-AUC, Gini accuracy ratio, Kolmogorov-Smirnov (KS) statistic, Hosmer-Lemeshow decile calibration curve, and Population Stability Index (PSI)
- **Portfolio Reports**: Comprehensive consolidated portfolio risk & capital adequacy report with JSON export and print view

## Setup and Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
