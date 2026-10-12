"""
End-to-End Pipeline API Endpoint
=================================
Allows triggering the complete risk assessment pipeline from the frontend.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.services.pipeline_service import EndToEndPipeline
from backend.app.core.logging import logger

router = APIRouter(prefix="/pipeline", tags=["Pipeline Execution"])

class PipelineResponse(BaseModel):
    status: str
    portfolio_metrics: Dict[str, Any]
    advanced_analytics: Dict[str, Any]
    regulatory_validation: Dict[str, Any]
    sample_record_output: list


@router.post("/run", response_model=PipelineResponse)
def run_end_to_end_pipeline():
    """
    Executes the entire Credit Portfolio Risk Engine workflow:
    Input -> Processing -> Transformation -> Analysis/ML -> Validation -> Final Output
    """
    try:
        pipeline = EndToEndPipeline()
        result = pipeline.run_pipeline()
        return result
    except Exception as e:
        logger.error(f"Pipeline execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
