import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  Sliders,
  Calculator,
  ArrowRight,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { riskApi } from '../services/api';
import { RAROCResponse } from '../types';

export const UnderwritingPage: React.FC = () => {
  // Input parameters
  const [creditLimit, setCreditLimit] = useState<number>(5000000);
  const [drawnBalance, setDrawnBalance] = useState<number>(4000000);
  const [interestSpreadBps, setInterestSpreadBps] = useState<number>(275);
  const [selectedRating, setSelectedRating] = useState<string>('BBB');
  const [pd, setPd] = useState<number>(0.018);
  const [lgd, setLgd] = useState<number>(0.40);
  const [tenor, setTenor] = useState<number>(3.0);
  const [upfrontFeeBps, setUpfrontFeeBps] = useState<number>(50);

  const [result, setResult] = useState<RAROCResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Rating to standard PD mapping
  const ratingPdMap: Record<string, number> = {
    'AAA': 0.0003,
    'AA': 0.0010,
    'A': 0.0040,
    'BBB': 0.0180,
    'BB': 0.0450,
    'B': 0.1050,
    'CCC': 0.2200,
  };

  const handleRatingChange = (rating: string) => {
    setSelectedRating(rating);
    if (ratingPdMap[rating]) {
      setPd(ratingPdMap[rating]);
    }
  };

  const runCalculation = () => {
    const validLimit = Math.max(1000, Number(creditLimit) || 1000);
    const validDrawn = Math.max(0, Number(drawnBalance) || 0);
    const sanitizedLimit = Math.max(validLimit, validDrawn);

    setLoading(true);
    setError(null);
    riskApi.calculateRAROC({
      credit_limit: sanitizedLimit,
      drawn_balance: validDrawn,
      interest_spread_bps: Number(interestSpreadBps) || 200,
      pd: Number(pd) || 0.02,
      lgd: Number(lgd) || 0.40,
      maturity_years: Number(tenor) || 3.0,
      upfront_fee_pct: (Number(upfrontFeeBps) || 0) / 10000,
      ccf: 0.50,
    })
      .then((res) => {
        setResult(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to calculate RAROC.');
        setLoading(false);
      });
  };

  const resetToInstitutionalSample = () => {
    setCreditLimit(5000000);
    setDrawnBalance(4000000);
    setInterestSpreadBps(275);
    setSelectedRating('BBB');
    setPd(0.018);
    setLgd(0.40);
    setTenor(3.0);
    setUpfrontFeeBps(50);
  };

  useEffect(() => {
    runCalculation();
  }, []);

  return (
    <div className="flex-1 space-y-6 p-2 md:p-6 pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-3xl font-bold tracking-tight font-sans">Deal Underwriting & RAROC Desk</h2>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-mono">
              Hurdle: 15.0%
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Single-facility risk-adjusted pricing, economic capital allocation, and underwriting authorization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={runCalculation}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Recalculate Deal</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Deal Parameters & Underwriting Decision */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Deal Input Form (5 Cols) */}
        <Card className="md:col-span-5 border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Credit Facility Parameters</span>
            </CardTitle>
            <CardDescription>
              Configure loan structure, pricing margin, and obligor credit profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Limit and Drawn */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-muted-foreground font-mono">Credit Limit ($)</label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ${(Number(creditLimit) || 0).toLocaleString()}
                  </span>
                </div>
                <Input
                  type="number"
                  min="1000"
                  step="50000"
                  value={creditLimit || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    setCreditLimit(val);
                  }}
                  className="font-mono text-xs"
                  placeholder="e.g. 5,000,000"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-muted-foreground font-mono">Drawn Balance ($)</label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ${(Number(drawnBalance) || 0).toLocaleString()}
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={creditLimit || undefined}
                  step="50000"
                  value={drawnBalance || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    setDrawnBalance(val);
                  }}
                  className={`font-mono text-xs ${
                    drawnBalance > creditLimit ? 'border-amber-500 focus-visible:ring-amber-500' : ''
                  }`}
                  placeholder="e.g. 4,000,000"
                />
                {drawnBalance > creditLimit && creditLimit > 0 && (
                  <p className="text-[10px] text-amber-500 font-mono">
                    * Drawn exceeds limit; limit auto-raised to match drawn.
                  </p>
                )}
              </div>
            </div>

            {/* Interest Spread & Tenor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground font-mono">Spread (bps over SOFR)</label>
                <Input
                  type="number"
                  value={interestSpreadBps}
                  onChange={(e) => setInterestSpreadBps(Number(e.target.value))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground font-mono">Tenor (Years)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={tenor}
                  onChange={(e) => setTenor(Number(e.target.value))}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Rating Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground font-mono">Obligor Basel Rating Grade</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(ratingPdMap).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRatingChange(r)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all border ${
                      selectedRating === r
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Factors (PD & LGD) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">PD:</span>
                  <span className="font-bold text-foreground">{(pd * 100).toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0003"
                  max="0.25"
                  step="0.001"
                  value={pd}
                  onChange={(e) => setPd(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">LGD:</span>
                  <span className="font-bold text-foreground">{(lgd * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={lgd}
                  onChange={(e) => setLgd(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Upfront fee */}
            <div className="space-y-1 pt-1">
              <label className="text-xs font-medium text-muted-foreground font-mono">Upfront Origination Fee (bps)</label>
              <Input
                type="number"
                value={upfrontFeeBps}
                onChange={(e) => setUpfrontFeeBps(Number(e.target.value))}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetToInstitutionalSample}
                className="w-1/3 text-xs font-mono"
              >
                Reset
              </Button>
              <Button
                onClick={runCalculation}
                disabled={loading}
                className="w-2/3 gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner message="" />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Simulate Pricing & RAROC</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Underwriting Decision & Economics (7 Cols) */}
        <div className="md:col-span-7 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-mono">
              Error: {error}
            </div>
          )}

          {result && (
            <>
              {/* Decision Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-center justify-between ${
                  result.is_approved
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : result.raroc_pct >= 12
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {result.is_approved ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold font-sans">
                      {result.is_approved ? 'DEAL APPROVED' : 'UNDERWRITING DECLINE / REPRICING REQUIRED'}
                    </h3>
                    <p className="text-xs opacity-90 font-mono mt-0.5">{result.recommendation}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-3xl font-extrabold font-mono">
                    {result.raroc_pct.toFixed(2)}%
                  </div>
                  <div className="text-[11px] font-mono opacity-80">
                    Hurdle: {result.hurdle_rate_pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Economic Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-border/60 bg-card/60 p-3 font-mono">
                  <span className="text-[11px] text-muted-foreground">Annual Revenue</span>
                  <div className="text-base font-bold text-foreground mt-1">
                    ${(result.total_annual_revenue / 1e3).toFixed(1)}k
                  </div>
                </Card>

                <Card className="border-border/60 bg-card/60 p-3 font-mono">
                  <span className="text-[11px] text-muted-foreground">Expected Loss</span>
                  <div className="text-base font-bold text-amber-400 mt-1">
                    ${(result.expected_loss / 1e3).toFixed(1)}k
                  </div>
                </Card>

                <Card className="border-border/60 bg-card/60 p-3 font-mono">
                  <span className="text-[11px] text-muted-foreground">Economic Capital</span>
                  <div className="text-base font-bold text-cyan-400 mt-1">
                    ${(result.economic_capital / 1e3).toFixed(1)}k
                  </div>
                </Card>

                <Card className="border-border/60 bg-card/60 p-3 font-mono">
                  <span className="text-[11px] text-muted-foreground">Economic Value (EVA)</span>
                  <div className={`text-base font-bold mt-1 ${result.economic_value_added_eva >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${(result.economic_value_added_eva / 1e3).toFixed(1)}k
                  </div>
                </Card>
              </div>

              {/* Spread Sensitivity Table */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Margin & RAROC Sensitivity Matrix</CardTitle>
                      <CardDescription>
                        Breakeven spread required to meet 15.0% hurdle: <span className="font-bold text-foreground font-mono">{result.breakeven_spread_bps.toFixed(0)} bps</span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      EAD: ${(result.ead / 1e6).toFixed(2)}M
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-mono text-xs">Spread</TableHead>
                        <TableHead className="font-mono text-xs text-right">RAROC</TableHead>
                        <TableHead className="font-mono text-xs text-right">Economic Value (EVA)</TableHead>
                        <TableHead className="font-mono text-xs text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.sensitivity_curve.map((pt) => (
                        <TableRow
                          key={pt.spread_bps}
                          className={`border-border/40 font-mono text-xs hover:bg-muted/40 ${
                            pt.spread_bps === interestSpreadBps ? 'bg-primary/10 font-bold' : ''
                          }`}
                        >
                          <TableCell>
                            {pt.spread_bps} bps {pt.spread_bps === interestSpreadBps && '(Selected)'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={pt.raroc_pct >= 15 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                              {pt.raroc_pct.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={pt.eva >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              ${(pt.eva / 1e3).toFixed(1)}k
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                pt.is_approved
                                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                  : 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                              }
                            >
                              {pt.is_approved ? 'PASS' : 'FAIL'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
