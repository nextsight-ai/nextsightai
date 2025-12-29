"""
Service for analyzing Kubernetes cluster reliability.
"""

from datetime import datetime, timezone
from typing import List, Optional

from kubernetes import client

from app.schemas.reliability import ReliabilityAnalysisResponse, ReliabilityRisk


class ReliabilityService:
    """Service for analyzing cluster reliability and detecting potential issues."""

    async def analyze_reliability(self, namespace: Optional[str] = None) -> ReliabilityAnalysisResponse:
        """Analyze cluster reliability and detect potential issues."""
        risks: List[ReliabilityRisk] = []
        workloads_analyzed = 0

        # Analyze deployments for single replica and missing probes
        deployment_risks, deployment_count = await self._analyze_deployments(namespace)
        risks.extend(deployment_risks)
        workloads_analyzed += deployment_count

        # Analyze statefulsets
        statefulset_risks, statefulset_count = await self._analyze_statefulsets(namespace)
        risks.extend(statefulset_risks)
        workloads_analyzed += statefulset_count

        # Analyze pods for restart loops
        restart_risks = await self._analyze_pod_restarts(namespace)
        risks.extend(restart_risks)

        # Analyze PodDisruptionBudgets
        pdb_risks = await self._analyze_missing_pdbs(namespace)
        risks.extend(pdb_risks)

        # Calculate summary stats
        high_risk_count = len([r for r in risks if r.severity == 'high'])
        medium_risk_count = len([r for r in risks if r.severity == 'medium'])
        low_risk_count = len([r for r in risks if r.severity == 'low'])
        potential_outages = len([r for r in risks if r.risk_type in ['single_replica', 'restart_loop']])

        return ReliabilityAnalysisResponse(
            workloads_analyzed=workloads_analyzed,
            total_risks=len(risks),
            high_risk_count=high_risk_count,
            medium_risk_count=medium_risk_count,
            low_risk_count=low_risk_count,
            potential_outages=potential_outages,
            risks=risks,
            analyzed_at=datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        )

    async def _analyze_deployments(self, namespace: Optional[str] = None) -> tuple[List[ReliabilityRisk], int]:
        """Analyze deployments for reliability issues."""
        risks: List[ReliabilityRisk] = []
        apps_v1 = client.AppsV1Api()

        try:
            if namespace:
                deployments = apps_v1.list_namespaced_deployment(namespace).items
            else:
                deployments = apps_v1.list_deployment_for_all_namespaces().items

            for deployment in deployments:
                name = deployment.metadata.name
                ns = deployment.metadata.namespace
                replicas = deployment.spec.replicas or 0

                # Check for single replica
                if replicas == 1:
                    risks.append(
                        ReliabilityRisk(
                            id=f"single-replica-{ns}-{name}",
                            workload_name=name,
                            workload_type="Deployment",
                            namespace=ns,
                            severity='high',
                            risk_type='single_replica',
                            observation=f'Deployment is running with a single replica (replicas={replicas}).',
                            risk='Any pod failure will cause full service outage.',
                            impact=[
                                'Zero fault tolerance',
                                'No availability during pod restart or node failure',
                                'High customer-facing risk',
                            ],
                            recommendation=f'Increase replicas from {replicas} → 2 or more',
                            recommendation_why='Ensures service availability during pod restarts or node disruptions.',
                            yaml_suggestion=f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: {name}
  namespace: {ns}
spec:
  replicas: 2  # Changed from {replicas}""",
                            confidence_level='high',
                            safe_to_apply=True,
                            production_impact='low',
                            metadata={'current_replicas': replicas},
                        )
                    )

                # Check for missing health probes
                containers = deployment.spec.template.spec.containers
                for container in containers:
                    has_liveness = container.liveness_probe is not None
                    has_readiness = container.readiness_probe is not None

                    if not has_liveness or not has_readiness:
                        missing_probes = []
                        if not has_liveness:
                            missing_probes.append('liveness')
                        if not has_readiness:
                            missing_probes.append('readiness')

                        risks.append(
                            ReliabilityRisk(
                                id=f"missing-probes-{ns}-{name}-{container.name}",
                                workload_name=name,
                                workload_type="Deployment",
                                namespace=ns,
                                severity='medium',
                                risk_type='missing_probes',
                                observation=f"Container '{container.name}' is missing {' and '.join(missing_probes)} probe(s).",
                                risk='Kubernetes cannot detect unhealthy pods correctly.',
                                impact=[
                                    'Traffic may be sent to unhealthy pods',
                                    'Delayed recovery during failures',
                                    'Increased mean time to recovery (MTTR)',
                                ],
                                recommendation=f"Add {' and '.join(missing_probes)} probe(s) to container '{container.name}'.",
                                recommendation_why='Enables Kubernetes to detect and recover from application failures automatically.',
                                yaml_suggestion=f"""# Add to container '{container.name}' spec:
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5""",
                                confidence_level='high',
                                safe_to_apply=False,
                                production_impact='medium',
                                metadata={
                                    'container': container.name,
                                    'has_liveness': has_liveness,
                                    'has_readiness': has_readiness,
                                },
                            )
                        )

            return risks, len(deployments)

        except Exception as e:
            print(f"Error analyzing deployments: {e}")
            return risks, 0

    async def _analyze_statefulsets(self, namespace: Optional[str] = None) -> tuple[List[ReliabilityRisk], int]:
        """Analyze statefulsets for reliability issues."""
        risks: List[ReliabilityRisk] = []
        apps_v1 = client.AppsV1Api()

        try:
            if namespace:
                statefulsets = apps_v1.list_namespaced_stateful_set(namespace).items
            else:
                statefulsets = apps_v1.list_stateful_set_for_all_namespaces().items

            for sts in statefulsets:
                name = sts.metadata.name
                ns = sts.metadata.namespace
                replicas = sts.spec.replicas or 0

                # Check for single replica
                if replicas == 1:
                    risks.append(
                        ReliabilityRisk(
                            id=f"single-replica-{ns}-{name}",
                            workload_name=name,
                            workload_type="StatefulSet",
                            namespace=ns,
                            severity='high',
                            risk_type='single_replica',
                            observation=f'StatefulSet is running with a single replica (replicas={replicas}).',
                            risk='Any pod failure will cause full service outage.',
                            impact=[
                                'Zero fault tolerance',
                                'No availability during pod restart or node failure',
                                'Data service disruption',
                            ],
                            recommendation=f'Increase replicas from {replicas} → 3 or more (odd number)',
                            recommendation_why='Ensures service availability and data redundancy.',
                            yaml_suggestion=f"""apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {name}
  namespace: {ns}
spec:
  replicas: 3  # Changed from {replicas}""",
                            confidence_level='high',
                            safe_to_apply=True,
                            production_impact='low',
                            metadata={'current_replicas': replicas},
                        )
                    )

            return risks, len(statefulsets)

        except Exception as e:
            print(f"Error analyzing statefulsets: {e}")
            return risks, 0

    async def _analyze_pod_restarts(self, namespace: Optional[str] = None) -> List[ReliabilityRisk]:
        """Analyze pods for excessive restarts."""
        risks: List[ReliabilityRisk] = []
        core_v1 = client.CoreV1Api()

        try:
            if namespace:
                pods = core_v1.list_namespaced_pod(namespace).items
            else:
                pods = core_v1.list_pod_for_all_namespaces().items

            for pod in pods:
                if not pod.status or not pod.status.container_statuses:
                    continue

                total_restarts = sum(cs.restart_count for cs in pod.status.container_statuses)

                # Flag pods with more than 10 restarts
                if total_restarts > 10:
                    name = pod.metadata.name
                    ns = pod.metadata.namespace

                    # Try to get owner reference
                    owner_name = name
                    owner_kind = "Pod"
                    if pod.metadata.owner_references:
                        owner_ref = pod.metadata.owner_references[0]
                        owner_name = owner_ref.name
                        owner_kind = owner_ref.kind

                    risks.append(
                        ReliabilityRisk(
                            id=f"restart-loop-{ns}-{name}",
                            workload_name=owner_name,
                            workload_type=owner_kind,
                            namespace=ns,
                            severity='high',
                            risk_type='restart_loop',
                            observation=f'Pod restarted {total_restarts} times.',
                            risk='Indicates crash loop or unstable application behavior.',
                            impact=[
                                'Intermittent service availability',
                                'Increased error rates',
                                'Alert fatigue',
                                'Resource waste from constant restarts',
                            ],
                            recommendation='Investigate logs and resource limits. Check for OOMKills or startup failures.',
                            recommendation_why='Frequent restarts indicate underlying issues that need immediate attention.',
                            yaml_suggestion=None,
                            confidence_level='high',
                            safe_to_apply=False,
                            production_impact='high',
                            metadata={
                                'pod_name': name,
                                'restart_count': total_restarts,
                                'phase': pod.status.phase,
                            },
                        )
                    )

            return risks

        except Exception as e:
            print(f"Error analyzing pod restarts: {e}")
            return risks

    async def _analyze_missing_pdbs(self, namespace: Optional[str] = None) -> List[ReliabilityRisk]:
        """Analyze for missing PodDisruptionBudgets."""
        risks: List[ReliabilityRisk] = []
        apps_v1 = client.AppsV1Api()
        policy_v1 = client.PolicyV1Api()

        try:
            # Get all deployments
            if namespace:
                deployments = apps_v1.list_namespaced_deployment(namespace).items
                pdbs = policy_v1.list_namespaced_pod_disruption_budget(namespace).items
            else:
                deployments = apps_v1.list_deployment_for_all_namespaces().items
                pdbs = policy_v1.list_pod_disruption_budget_for_all_namespaces().items

            # Build set of deployments with PDBs
            pdb_covered = set()
            for pdb in pdbs:
                if pdb.spec.selector and pdb.spec.selector.match_labels:
                    # Simple check - in production, would need more sophisticated matching
                    pdb_covered.add((pdb.metadata.namespace, pdb.metadata.name))

            # Check deployments for missing PDBs
            for deployment in deployments:
                name = deployment.metadata.name
                ns = deployment.metadata.namespace
                replicas = deployment.spec.replicas or 0

                # Only flag deployments with 2+ replicas
                if replicas >= 2 and (ns, name) not in pdb_covered:
                    risks.append(
                        ReliabilityRisk(
                            id=f"missing-pdb-{ns}-{name}",
                            workload_name=name,
                            workload_type="Deployment",
                            namespace=ns,
                            severity='medium',
                            risk_type='missing_pdb',
                            observation='No PodDisruptionBudget configured.',
                            risk='Voluntary disruptions (node drain, upgrades) may bring down all pods.',
                            impact=[
                                'Service outage during cluster maintenance',
                                'No protection during voluntary disruptions',
                                'Potential downtime during upgrades',
                            ],
                            recommendation='Add PodDisruptionBudget with minAvailable: 1',
                            recommendation_why='Protects service availability during planned maintenance operations.',
                            yaml_suggestion=f"""apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {name}-pdb
  namespace: {ns}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: {name}""",
                            confidence_level='high',
                            safe_to_apply=True,
                            production_impact='low',
                            metadata={'replicas': replicas},
                        )
                    )

            return risks

        except Exception as e:
            print(f"Error analyzing PDBs: {e}")
            return risks


reliability_service = ReliabilityService()
