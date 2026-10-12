"""
Monte Carlo Credit Loss Simulation API Endpoints
"""

from typing import Dict, Optional
from fastapi import APIRouter, Body, HTTPException, Path
from backend.app.services.monte_carlo_service import MonteCarloService
from backend.app.schemas.monte_carlo import MonteCarloRunRequest, MonteCarloResponse

router = APIRouter(prefix="/monte-carlo", tags=["Monte Carlo Simulation"])


@router.get("", response_model=MonteCarloResponse)
def get_latest_simulation():
    """Returns the latest or default 10,000-iteration Monte Carlo simulation result."""
    service = MonteCarloService()
    result = service.get_latest_or_default_run()
    return MonteCarloResponse(**result)


@router.post("/run", response_model=MonteCarloResponse)
def run_monte_carlo(payload: MonteCarloRunRequest = Body(...)):
    """
    Executes a reproducible Monte Carlo credit loss simulation using a Gaussian Copula latent variable model.
    Calculates:
    - Mean Loss & Standard Deviation
    - Percentiles (50th, 75th, 90th, 95th, 99th, 99.9th)
    - 95% and 99% Credit VaR
    - Expected Shortfall (CVaR)
    - Loss distribution frequency histogram
    """
    service = MonteCarloService()
    result = service.run_simulation(
        n_simulations=payload.n_simulations,
        random_seed=payload.random_seed,
        asset_correlation=payload.asset_correlation,
        stochastic_lgd=payload.stochastic_lgd,
        sample_size=payload.sample_size,
    )
    return MonteCarloResponse(**result)


@router.get("/{run_id}", response_model=MonteCarloResponse)
def get_simulation_run(run_id: str = Path(..., description="Unique simulation run identifier")):
    """Retrieves an existing Monte Carlo simulation run by ID."""
    service = MonteCarloService()
    result = service.get_run_by_id(run_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Simulation run {run_id} not found")
    return MonteCarloResponse(**result)
