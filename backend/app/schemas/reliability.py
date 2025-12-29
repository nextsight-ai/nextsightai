"""
Schemas for Kubernetes reliability analysis.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel


class ReliabilityRisk(BaseModel):
    """A reliability risk detected in the cluster."""

    id: str
    workload_name: str
    workload_type: str
    namespace: str
    severity: Literal['high', 'medium', 'low']
    risk_type: Literal['single_replica', 'missing_probes', 'restart_loop', 'missing_pdb']
    observation: str
    risk: str
    impact: List[str]
    recommendation: str
    recommendation_why: str
    yaml_suggestion: Optional[str] = None
    confidence_level: Literal['high', 'medium', 'low']
    safe_to_apply: bool
    production_impact: Literal['low', 'medium', 'high']
    metadata: Optional[dict] = None


class ReliabilityAnalysisResponse(BaseModel):
    """Complete reliability analysis for the cluster."""

    workloads_analyzed: int
    total_risks: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    potential_outages: int
    risks: List[ReliabilityRisk]
    analyzed_at: str
