import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowPathIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import type { OptimizationDashboardResponse } from '../../types';

// Reliability Risk Severity
type ReliabilitySeverity = 'high' | 'medium' | 'low';

// Reliability Risk Types
interface ReliabilityRisk {
  id: string;
  workload_name: string;
  workload_type: string;
  namespace: string;
  severity: ReliabilitySeverity;
  risk_type: 'single_replica' | 'missing_probes' | 'restart_loop' | 'missing_pdb';
  observation: string;
  risk: string;
  impact: string[];
  recommendation: string;
  recommendation_why: string;
  yaml_suggestion?: string;
  confidence_level: 'high' | 'medium' | 'low';
  safe_to_apply: boolean;
  production_impact: 'low' | 'medium' | 'high';
}

// Mock data generator
function generateMockReliabilityData(dashboardData: OptimizationDashboardResponse): ReliabilityRisk[] {
  const risks: ReliabilityRisk[] = [];

  // Generate single replica risks
  dashboardData.top_underprovisioned_pods.slice(0, 2).forEach((pod, idx) => {
    risks.push({
      id: `single-replica-${idx}`,
      workload_name: pod.owner_name || pod.name,
      workload_type: pod.owner_kind || 'Pod',
      namespace: pod.namespace,
      severity: 'high',
      risk_type: 'single_replica',
      observation: 'Deployment is running with a single replica.',
      risk: 'Any pod failure will cause full service outage.',
      impact: ['Zero fault tolerance', 'No availability during pod restart or node failure', 'High customer-facing risk'],
      recommendation: 'Increase replicas from 1 → 2',
      recommendation_why: 'Ensures service availability during pod restarts or node disruptions.',
      confidence_level: 'high',
      safe_to_apply: true,
      production_impact: 'low',
      yaml_suggestion: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${pod.owner_name || pod.name}
  namespace: ${pod.namespace}
spec:
  replicas: 2  # Changed from 1`
    });
  });

  // Generate missing probes risks
  dashboardData.top_wasteful_pods.slice(0, 3).forEach((pod, idx) => {
    risks.push({
      id: `missing-probes-${idx}`,
      workload_name: pod.owner_name || pod.name,
      workload_type: pod.owner_kind || 'Pod',
      namespace: pod.namespace,
      severity: 'medium',
      risk_type: 'missing_probes',
      observation: 'Liveness and readiness probes are not configured.',
      risk: 'Kubernetes cannot detect unhealthy pods correctly.',
      impact: ['Traffic may be sent to unhealthy pods', 'Delayed recovery during failures'],
      recommendation: 'Add liveness and readiness probes.',
      recommendation_why: 'Enables Kubernetes to detect and recover from application failures automatically.',
      confidence_level: 'medium',
      safe_to_apply: false,
      production_impact: 'medium',
      yaml_suggestion: `livenessProbe:
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
  periodSeconds: 5`
    });
  });

  // Generate restart loop detection
  if (dashboardData.top_underprovisioned_pods.length > 0) {
    const pod = dashboardData.top_underprovisioned_pods[0];
    risks.push({
      id: 'restart-loop-1',
      workload_name: pod.owner_name || pod.name,
      workload_type: pod.owner_kind || 'Pod',
      namespace: pod.namespace,
      severity: 'high',
      risk_type: 'restart_loop',
      observation: 'Pod restarted 12 times in the last 24 hours.',
      risk: 'Indicates crash loop or unstable application behavior.',
      impact: ['Intermittent service availability', 'Increased error rates', 'Alert fatigue'],
      recommendation: 'Investigate logs and resource limits. Check for OOMKills or startup failures.',
      recommendation_why: 'Frequent restarts indicate underlying issues that need immediate attention.',
      confidence_level: 'high',
      safe_to_apply: false,
      production_impact: 'high'
    });
  }

  // Generate missing PDB risks
  dashboardData.recommendations.slice(0, 2).forEach((rec, idx) => {
    if (rec.resource_kind.toLowerCase() === 'deployment') {
      risks.push({
        id: `missing-pdb-${idx}`,
        workload_name: rec.resource_name,
        workload_type: rec.resource_kind,
        namespace: rec.namespace,
        severity: 'medium',
        risk_type: 'missing_pdb',
        observation: 'No PodDisruptionBudget configured.',
        risk: 'Voluntary disruptions (node drain, upgrades) may bring down all pods.',
        impact: ['Service outage during cluster maintenance', 'No protection during voluntary disruptions'],
        recommendation: 'Add PodDisruptionBudget with minAvailable: 1',
        recommendation_why: 'Protects service availability during planned maintenance operations.',
        confidence_level: 'high',
        safe_to_apply: true,
        production_impact: 'low',
        yaml_suggestion: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ${rec.resource_name}-pdb
  namespace: ${rec.namespace}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: ${rec.resource_name}`
      });
    }
  });

  return risks;
}

// Severity Badge Component
function SeverityBadge({ severity, isReviewed }: { severity: ReliabilitySeverity; isReviewed?: boolean }) {
  if (isReviewed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-600 text-white shadow-lg shadow-green-600/30">
        ✓ REVIEWED
      </span>
    );
  }

  const colors: Record<ReliabilitySeverity, string> = {
    high: 'bg-red-600 text-white shadow-lg shadow-red-600/30',
    medium: 'bg-orange-600 text-white shadow-lg shadow-orange-600/30',
    low: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded ${colors[severity]}`}>
      {severity.toUpperCase()}
    </span>
  );
}

// Copy Button Component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );
}

// Compact Reliability Risk Card Component
function ReliabilityRiskCard({ risk, onMarkReviewed, isReviewed }: {
  risk: ReliabilityRisk;
  onMarkReviewed: () => void;
  isReviewed: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityColors = {
    high: 'border-l-4 border-l-red-500 dark:border-l-red-400 border border-red-100 dark:border-red-900/30',
    medium: 'border-l-4 border-l-orange-500 dark:border-l-orange-400 border border-orange-100 dark:border-orange-900/30',
    low: 'border-l-4 border-l-blue-500 dark:border-l-blue-400 border border-blue-100 dark:border-blue-900/30',
  };

  const severityBgColors = {
    high: 'bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-slate-800',
    medium: 'bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-slate-800',
    low: 'bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-800',
  };

  const riskTypeLabels = {
    single_replica: 'Single Replica',
    missing_probes: 'Missing Probes',
    restart_loop: 'Restart Loop',
    missing_pdb: 'No PDB',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg overflow-hidden ${
        isReviewed
          ? 'border-l-4 border-l-green-500 dark:border-l-green-400 border border-green-100 dark:border-green-900/30 bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-slate-800'
          : `${severityColors[risk.severity]} ${severityBgColors[risk.severity]}`
      }`}
    >
      {/* Compact Header - Always Visible */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SeverityBadge severity={risk.severity} isReviewed={isReviewed} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate">
                {risk.workload_name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {riskTypeLabels[risk.risk_type]}
              </span>
            </div>
            <div className="text-[10px] text-gray-600 dark:text-gray-400">
              {risk.namespace} • {risk.workload_type}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Quick Preview - Always Visible */}
      <div className="px-3 pb-3">
        <div className="text-xs text-gray-700 dark:text-gray-300">
          <span className="font-medium">⚠️ {risk.risk}</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
          {/* Observation */}
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <EyeIcon className="h-3.5 w-3.5" />
              Observation
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{risk.observation}</div>
          </div>

          {/* Impact */}
          <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
            <div className="text-xs font-bold text-red-700 dark:text-red-300 mb-1">📉 Impact</div>
            <ul className="text-[10px] text-red-700 dark:text-red-300 space-y-0.5">
              {risk.impact.map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* AI Recommendation */}
          <div className="p-2 rounded bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200/50 dark:border-purple-700/50">
            <div className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">💡 AI Recommendation</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">
              {risk.recommendation}
            </div>
            <div className="text-[10px] text-purple-700 dark:text-purple-400">
              <strong>Why:</strong> {risk.recommendation_why}
            </div>
          </div>

          {/* Confidence */}
          <div className="flex gap-2 text-[10px]">
            <div className="flex-1 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">Confidence</div>
              <div className={`font-bold ${
                risk.confidence_level === 'high' ? 'text-green-600' : 'text-amber-600'
              }`}>
                {risk.confidence_level.toUpperCase()}
              </div>
            </div>
            <div className="flex-1 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">Safe to Apply</div>
              <div className={`font-bold ${risk.safe_to_apply ? 'text-green-600' : 'text-orange-600'}`}>
                {risk.safe_to_apply ? 'YES' : 'NEEDS REVIEW'}
              </div>
            </div>
            <div className="flex-1 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">Impact</div>
              <div className={`font-bold ${
                risk.production_impact === 'low' ? 'text-green-600' :
                risk.production_impact === 'medium' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {risk.production_impact.toUpperCase()}
              </div>
            </div>
          </div>

          {/* YAML Suggestion */}
          {risk.yaml_suggestion && (
            <div className="relative">
              <pre className="p-3 rounded-lg bg-gray-900 dark:bg-gray-950 text-gray-100 text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto">
                {risk.yaml_suggestion}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={risk.yaml_suggestion} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {risk.yaml_suggestion && (
              <button
                onClick={() => navigator.clipboard.writeText(risk.yaml_suggestion!)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-medium"
              >
                <ClipboardDocumentIcon className="h-3 w-3" />
                Copy YAML
              </button>
            )}
            {!isReviewed && (
              <button
                onClick={onMarkReviewed}
                className="flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-[10px] font-medium"
              >
                <CheckCircleIcon className="h-3 w-3" />
                Mark Reviewed
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Main Component
export default function ReliabilityOptimizationDashboard({
  dashboardData,
  isAnalyzing = false,
}: {
  dashboardData: OptimizationDashboardResponse;
  isAnalyzing?: boolean;
}) {
  const [reliabilityRisks, setReliabilityRisks] = useState<ReliabilityRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<ReliabilitySeverity | 'all'>('all');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [selectedWorkloadType, setSelectedWorkloadType] = useState<string>('all');
  const [safeToApplyFilter, setSafeToApplyFilter] = useState<'all' | 'yes' | 'needs_review'>('all');
  const [markedReviewed, setMarkedReviewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Generate base risks from dashboard data
    const risks = generateMockReliabilityData(dashboardData);
    setReliabilityRisks(risks);
    setLoading(false);
  }, [dashboardData]);

  // Calculate summary stats
  const summary = {
    workloads_analyzed: new Set(reliabilityRisks.map(r => `${r.namespace}/${r.workload_name}`)).size,
    total_risks: reliabilityRisks.length,
    high_risk: reliabilityRisks.filter(r => r.severity === 'high').length,
    potential_outages: reliabilityRisks.filter(r => r.risk_type === 'single_replica' || r.risk_type === 'restart_loop').length,
  };

  // Get unique values for filters
  const namespaces = ['all', ...new Set(reliabilityRisks.map(r => r.namespace))];
  const workloadTypes = ['all', ...new Set(reliabilityRisks.map(r => r.workload_type))];

  // Apply filters
  const filteredRisks = reliabilityRisks.filter(risk => {
    if (selectedSeverity !== 'all' && risk.severity !== selectedSeverity) return false;
    if (selectedNamespace !== 'all' && risk.namespace !== selectedNamespace) return false;
    if (selectedWorkloadType !== 'all' && risk.workload_type !== selectedWorkloadType) return false;
    if (safeToApplyFilter === 'yes' && !risk.safe_to_apply) return false;
    if (safeToApplyFilter === 'needs_review' && risk.safe_to_apply) return false;
    return true;
  });

  const handleMarkReviewed = (id: string) => {
    setMarkedReviewed(prev => new Set([...prev, id]));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reliability Risk Analysis</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Detect configuration and runtime risks</p>
        </div>
        {isAnalyzing ? (
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
            <ArrowPathIcon className="h-3 w-3 animate-spin" />
            Analyzing...
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
            <ShieldCheckIcon className="h-3 w-3" />
            {summary.high_risk} high-risk workloads
          </div>
        )}
      </div>

      {/* Compact Summary */}
      <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Workloads</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{summary.workloads_analyzed}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Risks</div>
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{summary.total_risks}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">High-Risk</div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">{summary.high_risk}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Outage Risk</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{summary.potential_outages}</div>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <FunnelIcon className="h-4 w-4 text-gray-500" />
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value as ReliabilitySeverity | 'all')}
          className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
        >
          <option value="all">All Severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={selectedNamespace}
          onChange={(e) => setSelectedNamespace(e.target.value)}
          className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
        >
          {namespaces.map(ns => (
            <option key={ns} value={ns}>{ns === 'all' ? 'All Namespaces' : ns}</option>
          ))}
        </select>
        <select
          value={selectedWorkloadType}
          onChange={(e) => setSelectedWorkloadType(e.target.value)}
          className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
        >
          {workloadTypes.map(type => (
            <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
          ))}
        </select>
        <select
          value={safeToApplyFilter}
          onChange={(e) => setSafeToApplyFilter(e.target.value as 'all' | 'yes' | 'needs_review')}
          className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
        >
          <option value="all">All</option>
          <option value="yes">Safe to Apply</option>
          <option value="needs_review">Needs Review</option>
        </select>
        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {filteredRisks.length - markedReviewed.size} pending
        </div>
      </div>

      {/* Reliability Risk Cards */}
      <div className="space-y-2">
        {filteredRisks.length > 0 ? (
          filteredRisks.map((risk) => (
            <ReliabilityRiskCard
              key={risk.id}
              risk={risk}
              onMarkReviewed={() => handleMarkReviewed(risk.id)}
              isReviewed={markedReviewed.has(risk.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-gray-600 dark:text-gray-400">No reliability risks found with the current filters</p>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
        <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center">
          Reliability recommendations based on Kubernetes best practices • Validate in staging before production
        </p>
      </div>
    </div>
  );
}
