import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  CheckCircleIcon,
  FunnelIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CpuChipIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import type { OptimizationDashboardResponse, OptimizationRecommendation } from '../../types';

interface PerformanceRiskPanelProps {
  dashboardData: OptimizationDashboardResponse;
}

const severityColors = {
  critical: 'border-red-300 dark:border-red-700',
  high: 'border-orange-300 dark:border-orange-700',
  medium: 'border-amber-300 dark:border-amber-700',
  low: 'border-blue-300 dark:border-blue-700',
};

interface PodMetrics {
  name: string;
  namespace: string;
  containers: Array<{
    name: string;
    cpu_usage: string;
    cpu_percent: number;
    memory_usage: string;
    memory_percent: number;
  }>;
  total_cpu: string;
  total_memory: string;
  timestamp: string;
}

export default function PerformanceRiskPanel({ dashboardData }: PerformanceRiskPanelProps) {
  const summary = dashboardData.summary;
  const [filterNamespace, setFilterNamespace] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showSystemPods, setShowSystemPods] = useState<boolean>(false);
  const [markedReviewed, setMarkedReviewed] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptimizationRecommendation | null>(null);
  const [podMetrics, setPodMetrics] = useState<PodMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // System namespaces to filter by default (only core K8s namespaces)
  const SYSTEM_NAMESPACES = [
    'kube-system',
    'kube-public',
    'kube-node-lease',
  ];

  const isSystemPod = (namespace: string) => {
    return SYSTEM_NAMESPACES.includes(namespace);
  };

  // Get all recommendations with system pod filtering
  const noLimitsPods = dashboardData.recommendations.filter(
    r => r.type.toLowerCase() === 'no_limits' && (showSystemPods || !isSystemPod(r.namespace))
  );
  const noRequestsPods = dashboardData.recommendations.filter(
    r => r.type.toLowerCase() === 'no_requests' && (showSystemPods || !isSystemPod(r.namespace))
  );

  // Get unique namespaces for filter
  const namespaces = Array.from(
    new Set([
      ...noLimitsPods.map(p => p.namespace),
      ...noRequestsPods.map(p => p.namespace),
    ])
  ).sort();

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyYAML = (rec: OptimizationRecommendation) => {
    const containerName = rec.container_name || 'container-0';

    // Build the limits and requests parameters
    const limitParams: string[] = [];
    const requestParams: string[] = [];

    if (rec.recommended_cpu_limit) limitParams.push(`cpu=${rec.recommended_cpu_limit}`);
    if (rec.recommended_memory_limit) limitParams.push(`memory=${rec.recommended_memory_limit}`);
    if (rec.recommended_cpu_request) requestParams.push(`cpu=${rec.recommended_cpu_request}`);
    if (rec.recommended_memory_request) requestParams.push(`memory=${rec.recommended_memory_request}`);

    // Generate the kubectl set resources command
    let command = `# Apply resource updates to ${rec.resource_kind}/${rec.resource_name}\n`;
    command += `# Container: ${containerName}\n`;
    command += `# Namespace: ${rec.namespace}\n\n`;
    command += `kubectl set resources ${rec.resource_kind.toLowerCase()}/${rec.resource_name} -n ${rec.namespace}`;

    if (containerName) {
      command += ` \\\n  --containers=${containerName}`;
    }

    if (limitParams.length > 0) {
      command += ` \\\n  --limits=${limitParams.join(',')}`;
    }

    if (requestParams.length > 0) {
      command += ` \\\n  --requests=${requestParams.join(',')}`;
    }

    command += `\n\n# Verify the change:\n`;
    command += `kubectl get ${rec.resource_kind.toLowerCase()} ${rec.resource_name} -n ${rec.namespace} -o yaml | grep -A 10 resources:`;

    navigator.clipboard.writeText(command);
    alert('✅ Kubectl command copied to clipboard!');
  };

  const handleMarkReviewed = (id: string) => {
    setMarkedReviewed(prev => new Set([...prev, id]));
  };

  const handleShowMetrics = async (rec: OptimizationRecommendation) => {
    setSelectedRecommendation(rec);
    setShowMetricsModal(true);
    setMetricsLoading(true);
    setPodMetrics(null);

    try {
      // Fetch pod metrics from the API
      const response = await fetch(`http://localhost:8000/api/v1/kubernetes/metrics/pods`);
      const allPodMetrics: PodMetrics[] = await response.json();

      // Find the specific pod's metrics
      // For Deployments/ReplicaSets, the pod name starts with the resource name
      // e.g., deployment "nginx" creates pods "nginx-5d8f7c9b6c-xyz12"
      const podMetric = allPodMetrics.find(
        (m) => m.namespace === rec.namespace && (
          m.name === rec.resource_name || // Exact match for Pods
          m.name.startsWith(rec.resource_name + '-') // Prefix match for Deployments/ReplicaSets
        )
      );

      if (podMetric) {
        setPodMetrics(podMetric);
      }
    } catch (error) {
      console.error('Failed to fetch pod metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const closeMetricsModal = () => {
    setShowMetricsModal(false);
    setSelectedRecommendation(null);
    setPodMetrics(null);
  };

  const totalHighRisk = noLimitsPods.length + noRequestsPods.length;
  const clusterStability = totalHighRisk > 10 ? '🔴 Critical' : totalHighRisk > 5 ? '⚠️ At Risk' : '✅ Stable';

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Risk Analysis</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Real-time cluster metrics</p>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
          <InformationCircleIcon className="h-3 w-3" />
          Review before applying
        </div>
      </div>

      {/* Compact Summary */}
      <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">High-Risk</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{totalHighRisk}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">No Limits</div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">{noLimitsPods.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">No Requests</div>
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{noRequestsPods.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Stability</div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">{clusterStability}</div>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <FunnelIcon className="h-4 w-4 text-gray-500" />
        <select
          value={filterNamespace}
          onChange={(e) => setFilterNamespace(e.target.value)}
          className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
        >
          <option value="all">All Namespaces</option>
          {namespaces.map(ns => (
            <option key={ns} value={ns}>{ns}</option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showSystemPods}
            onChange={(e) => setShowSystemPods(e.target.checked)}
            className="rounded border-gray-300 dark:border-slate-600"
          />
          Show system pods
        </label>
        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {totalHighRisk - markedReviewed.size} pending
        </div>
      </div>

      {/* Compact Cards - Missing Limits */}
      {noLimitsPods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldExclamationIcon className="h-4 w-4 text-red-600" />
            Missing Resource Limits ({noLimitsPods.length})
          </h3>
          {noLimitsPods
            .filter(rec => filterNamespace === 'all' || rec.namespace === filterNamespace)
            .filter(rec => filterSeverity === 'all' || rec.severity === filterSeverity)
            .map((rec, idx) => {
              const isExpanded = expandedCards.has(rec.id);
              const isReviewed = markedReviewed.has(rec.id);

              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`p-3 rounded-lg border ${
                    isReviewed
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700'
                      : 'bg-red-50 dark:bg-red-900/20 ' + (severityColors[rec.severity as keyof typeof severityColors] || severityColors.medium)
                  }`}
                >
                  {/* Compact Header - Always Visible */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                        {rec.severity.toUpperCase()}
                      </span>
                      {isReviewed && (
                        <CheckCircleIcon className="h-3 w-3 text-green-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-bold text-gray-900 dark:text-white truncate">
                          {rec.resource_name}
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">
                          {rec.namespace} • {rec.resource_kind}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleExpand(rec.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Impact - Always Visible */}
                  <div className="mt-2 text-xs text-red-700 dark:text-red-400">
                    ⚠️ Can crash node • Noisy neighbor risk
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 space-y-2"
                    >
                      {/* Observation */}
                      <div>
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">🔍 Observation</div>
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          No resource limits - pod can consume unlimited CPU/Memory
                        </div>
                      </div>

                      {/* Current vs Recommended */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-white/60 dark:bg-slate-800/60">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Current</div>
                          <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400">None</div>
                        </div>
                        <div className="p-2 rounded bg-green-100 dark:bg-green-900/20">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Recommended</div>
                          <div className="text-xs font-mono font-bold text-green-700 dark:text-green-400">
                            {rec.recommended_cpu_limit || '500m'} / {rec.recommended_memory_limit || '512Mi'}
                          </div>
                        </div>
                      </div>

                      {/* Impact */}
                      <div className="p-2 rounded bg-red-100 dark:bg-red-900/30">
                        <div className="text-xs font-bold text-red-700 dark:text-red-300 mb-1">Impact</div>
                        <ul className="text-[10px] text-red-700 dark:text-red-300 space-y-0.5">
                          <li>• Crashes entire node (affects ALL pods)</li>
                          <li>• One app can starve others</li>
                          <li>• No memory leak protection</li>
                        </ul>
                      </div>

                      {/* Confidence */}
                      <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/20">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">🧠 Confidence</span>
                          <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">HIGH</span>
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-300">
                          2x safety margin. Prevents unlimited consumption.
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleShowMetrics(rec)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-medium"
                        >
                          <ChartBarIcon className="h-3 w-3" />
                          Metrics
                        </button>
                        <button
                          onClick={() => handleCopyYAML(rec)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-[10px] font-medium"
                        >
                          <ClipboardDocumentIcon className="h-3 w-3" />
                          Copy YAML
                        </button>
                        {!isReviewed && (
                          <button
                            onClick={() => handleMarkReviewed(rec.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-[10px] font-medium"
                          >
                            <CheckCircleIcon className="h-3 w-3" />
                            Reviewed
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Compact Cards - Missing Requests */}
      {noRequestsPods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
            Missing Resource Requests ({noRequestsPods.length})
          </h3>
          {noRequestsPods
            .filter(rec => filterNamespace === 'all' || rec.namespace === filterNamespace)
            .filter(rec => filterSeverity === 'all' || rec.severity === filterSeverity)
            .map((rec, idx) => {
              const isExpanded = expandedCards.has(rec.id);
              const isReviewed = markedReviewed.has(rec.id);

              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`p-3 rounded-lg border ${
                    isReviewed
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                  }`}
                >
                  {/* Compact Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-600 text-white">
                        {rec.severity.toUpperCase()}
                      </span>
                      {isReviewed && (
                        <CheckCircleIcon className="h-3 w-3 text-green-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-bold text-gray-900 dark:text-white truncate">
                          {rec.resource_name}
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">
                          {rec.namespace} • {rec.resource_kind}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(rec.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Quick Impact */}
                  <div className="mt-2 text-xs text-orange-700 dark:text-orange-400">
                    ⚠️ First to be evicted • QoS BestEffort
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800 space-y-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">🔍 Observation</div>
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          No requests - marked as QoS "BestEffort"
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-white/60 dark:bg-slate-800/60">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Current</div>
                          <div className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">None</div>
                        </div>
                        <div className="p-2 rounded bg-green-100 dark:bg-green-900/20">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Recommended</div>
                          <div className="text-xs font-mono font-bold text-green-700 dark:text-green-400">
                            {rec.recommended_cpu_request || '250m'} / {rec.recommended_memory_request || '256Mi'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-orange-100 dark:bg-orange-900/30">
                        <div className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-1">Impact</div>
                        <ul className="text-[10px] text-orange-700 dark:text-orange-300 space-y-0.5">
                          <li>• First evicted under memory pressure</li>
                          <li>• Random pod failures during peak</li>
                          <li>• Poor scheduling decisions</li>
                        </ul>
                      </div>

                      <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/20">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">🧠 Confidence</span>
                          <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">HIGH</span>
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-300">
                          Requests don't limit usage. Prevents evictions.
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleShowMetrics(rec)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-medium"
                        >
                          <ChartBarIcon className="h-3 w-3" />
                          Metrics
                        </button>
                        <button
                          onClick={() => handleCopyYAML(rec)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-[10px] font-medium"
                        >
                          <ClipboardDocumentIcon className="h-3 w-3" />
                          Copy YAML
                        </button>
                        {!isReviewed && (
                          <button
                            onClick={() => handleMarkReviewed(rec.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-[10px] font-medium"
                          >
                            <CheckCircleIcon className="h-3 w-3" />
                            Reviewed
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Metrics Modal */}
      <AnimatePresence>
        {showMetricsModal && selectedRecommendation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Pod Metrics
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedRecommendation.resource_name} • {selectedRecommendation.namespace}
                  </p>
                </div>
                <button
                  onClick={closeMetricsModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {metricsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : podMetrics ? (
                  <>
                    {/* Current Usage */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                        Current Resource Usage
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <CpuChipIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">CPU Usage</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {podMetrics.total_cpu}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Total across all containers
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-2">
                            <CircleStackIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Memory Usage</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {podMetrics.total_memory}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Total across all containers
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Container Breakdown */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                        Container Breakdown
                      </h4>
                      <div className="space-y-3">
                        {podMetrics.containers.map((container) => (
                          <div
                            key={container.name}
                            className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"
                          >
                            <div className="font-mono text-sm font-bold text-gray-900 dark:text-white mb-3">
                              {container.name}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CPU</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {container.cpu_usage}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ({container.cpu_percent.toFixed(1)}%)
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Memory</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                    {container.memory_usage}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ({container.memory_percent.toFixed(1)}%)
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-bold text-green-700 dark:text-green-300 mb-3">
                        AI Recommendations
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CPU Request</div>
                          <div className="font-mono font-bold text-green-700 dark:text-green-300">
                            {selectedRecommendation.recommended_cpu_request || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CPU Limit</div>
                          <div className="font-mono font-bold text-green-700 dark:text-green-300">
                            {selectedRecommendation.recommended_cpu_limit || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Memory Request</div>
                          <div className="font-mono font-bold text-green-700 dark:text-green-300">
                            {selectedRecommendation.recommended_memory_request || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Memory Limit</div>
                          <div className="font-mono font-bold text-green-700 dark:text-green-300">
                            {selectedRecommendation.recommended_memory_limit || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
                        <strong>Formula:</strong> Request = Usage × 1.3 (safety margin), Limit = Request × 2 (burst capacity)
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Last updated: {new Date(podMetrics.timestamp).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No metrics data available for this pod.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      The pod may not be running or metrics-server is not available.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 p-4 flex justify-end gap-3">
                <button
                  onClick={closeMetricsModal}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 text-sm font-medium"
                >
                  Close
                </button>
                {podMetrics && (
                  <button
                    onClick={() => {
                      handleCopyYAML(selectedRecommendation);
                      closeMetricsModal();
                    }}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    Copy kubectl Command
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
        <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center">
          Based on current metrics • Validate in staging before production
        </p>
      </div>
    </div>
  );
}
