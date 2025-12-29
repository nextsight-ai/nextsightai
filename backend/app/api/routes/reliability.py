"""
API routes for Kubernetes reliability analysis.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.reliability import ReliabilityAnalysisResponse
from app.services.reliability_service import reliability_service

router = APIRouter()


@router.get("/analysis", response_model=ReliabilityAnalysisResponse)
async def get_reliability_analysis(
    namespace: Optional[str] = Query(None, description="Filter by namespace")
):
    """
    Analyze cluster reliability and detect potential issues.

    Returns analysis of:
    - Single replica deployments
    - Missing health probes
    - Pod restart loops
    - Missing PodDisruptionBudgets
    """
    try:
        return await reliability_service.analyze_reliability(namespace)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze reliability: {str(e)}")
