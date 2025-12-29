import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CircleStackIcon,
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  PlayIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CubeIcon,
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  TagIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import GlassCard from '../common/GlassCard';
import { helmApi } from '../../services/api';
import type { HelmRelease, HelmChartSearchResult } from '../../types';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Types
interface ChartNode {
  name: string;
  type: 'folder' | 'chart';
  children?: ChartNode[];
  chart?: HelmChartSearchResult;
}

// Default values template (used when no chart is selected)
const defaultValuesTemplate = `# Enter your Helm chart values here
# or select a chart from the left panel

replicaCount: 1

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
`;

// Chart Tree Component
function ChartTree({
  nodes,
  selectedChart,
  onSelectChart,
  level = 0,
}: {
  nodes: ChartNode[];
  selectedChart: string | null;
  onSelectChart: (node: ChartNode) => void;
  level?: number;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['bitnami', 'stable', 'local']));

  const toggleFolder = (name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <div key={node.name}>
          <motion.button
            whileHover={{ x: 2 }}
            onClick={() => {
              if (node.type === 'folder') {
                toggleFolder(node.name);
              } else {
                onSelectChart(node);
              }
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
              selectedChart === node.name
                ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
            }`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
          >
            {node.type === 'folder' ? (
              <>
                <ChevronRightIcon className={`h-3 w-3 text-gray-400 transition-transform ${expandedFolders.has(node.name) ? 'rotate-90' : ''}`} />
                {expandedFolders.has(node.name) ? (
                  <FolderOpenIcon className="h-4 w-4 text-amber-500" />
                ) : (
                  <FolderIcon className="h-4 w-4 text-amber-500" />
                )}
              </>
            ) : (
              <>
                <span className="w-3" />
                <CircleStackIcon className="h-4 w-4 text-blue-500" />
              </>
            )}
            <span className="text-xs truncate">{node.name}</span>
            {node.chart && (
              <span className="ml-auto text-xs text-gray-400">{node.chart.version}</span>
            )}
          </motion.button>
          {node.type === 'folder' && expandedFolders.has(node.name) && node.children && (
            <ChartTree
              nodes={node.children}
              selectedChart={selectedChart}
              onSelectChart={onSelectChart}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// AI Values Analysis Component
function AIValuesAnalysis({ valuesContent, chartName, namespace }: { valuesContent: string; chartName?: string; namespace?: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    riskLevel: 'low' | 'medium' | 'high';
    issues: { severity: 'warning' | 'error' | 'info'; message: string; category?: string }[];
    suggestions: string[];
    productionReady: boolean;
    securityScore: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeValues = async () => {
    if (!valuesContent.trim()) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await helmApi.analyzeConfig(valuesContent, chartName, namespace);

      if (response.data.success) {
        // Map API response to UI format
        const issues = response.data.issues.map(issue => ({
          severity: issue.severity === 'critical' || issue.severity === 'high' ? 'error' :
                    issue.severity === 'medium' ? 'warning' : 'info',
          message: issue.issue,
          category: issue.category,
        })) as { severity: 'warning' | 'error' | 'info'; message: string; category?: string }[];

        const suggestions = response.data.recommendations.map(rec => rec.description);

        // Determine risk level based on security score and production readiness
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (!response.data.production_ready || response.data.security_score < 60) {
          riskLevel = 'high';
        } else if (response.data.security_score < 80) {
          riskLevel = 'medium';
        }

        setAnalysis({
          riskLevel,
          issues,
          suggestions,
          productionReady: response.data.production_ready,
          securityScore: response.data.security_score,
        });
      } else {
        setError('Analysis failed. Please try again.');
      }
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError(err.response?.data?.detail || 'Failed to analyze values. Please check your configuration.');
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColors = {
    low: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    medium: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    high: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  };

  const severityIcons = {
    error: <XCircleIcon className="h-4 w-4 text-red-500" />,
    warning: <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />,
    info: <CheckCircleIcon className="h-4 w-4 text-blue-500" />,
  };

  return (
    <div className="space-y-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={analyzeValues}
        disabled={analyzing || !valuesContent.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-200/50 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 font-medium text-sm hover:from-purple-500/30 hover:to-blue-500/30 disabled:opacity-50 transition-all"
      >
        {analyzing ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
        ) : (
          <SparklesIcon className="h-4 w-4" />
        )}
        {analyzing ? 'Analyzing...' : 'AI Values Analysis'}
      </motion.button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
          >
            <div className="flex items-start gap-2">
              <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
            </div>
          </motion.div>
        )}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Risk Level & Security Score */}
            <div className={`p-3 rounded-xl border ${riskColors[analysis.riskLevel]}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">
                    {analysis.riskLevel} Risk
                  </span>
                </div>
                <span className="text-xs font-semibold">
                  Security: {analysis.securityScore}/100
                </span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.productionReady ? (
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                ) : (
                  <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                )}
                <span className="text-xs">
                  {analysis.productionReady ? 'Production Ready' : 'Not Production Ready'}
                </span>
              </div>
            </div>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Issues Found</p>
                {analysis.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    {severityIcons[issue.severity]}
                    <div className="flex-1">
                      <span className="text-xs text-gray-700 dark:text-gray-300">{issue.message}</span>
                      {issue.category && (
                        <span className="ml-2 text-xs text-gray-400">({issue.category})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Recommendations</p>
                {analysis.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-500/5">
                    <CheckCircleIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Status Badge Component
function ReleaseBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    deployed: { color: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Deployed' },
    'pending-install': { color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Pending' },
    'pending-upgrade': { color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Upgrading' },
    'pending-rollback': { color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Rolling Back' },
    failed: { color: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400', label: 'Failed' },
    uninstalling: { color: 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400', label: 'Uninstalling' },
    superseded: { color: 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400', label: 'Superseded' },
  };

  const config = statusConfig[status] || { color: 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function HelmDeployEnhanced() {
  // UI State
  const [valuesContent, setValuesContent] = useState(defaultValuesTemplate);
  const [selectedChart, setSelectedChart] = useState<ChartNode | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<HelmRelease | null>(null);
  const [releaseName, setReleaseName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [activeEditorTab, setActiveEditorTab] = useState<'values' | 'chart' | 'templates' | 'ai'>('values');
  const [activeLeftTab, setActiveLeftTab] = useState<'charts' | 'releases'>('charts');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Data State
  const [releases, setReleases] = useState<HelmRelease[]>([]);
  const [chartTree, setChartTree] = useState<ChartNode[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const namespaces = ['default', 'production', 'staging', 'development', 'monitoring', 'kube-system'];

  // Load releases from API
  useEffect(() => {
    const loadReleases = async () => {
      try {
        const response = await helmApi.listReleases(undefined, true);
        setReleases(response.data.releases);
        addLog(`Loaded ${response.data.releases.length} releases`);
      } catch (error: any) {
        console.error('Failed to load releases:', error);
        addLog(`Error loading releases: ${error.response?.data?.detail || error.message}`);
      }
    };
    loadReleases();
  }, []);

  // Load chart repositories and build tree
  useEffect(() => {
    const loadCharts = async () => {
      setLoadingData(true);
      try {
        // Get all repositories
        const reposResponse = await helmApi.listRepositories();
        const repos = reposResponse.data.repositories;

        // Build chart tree by repository
        const tree: ChartNode[] = [];

        for (const repo of repos) {
          // Search for charts in this repository
          try {
            const chartsResponse = await helmApi.searchCharts('', repo.name);
            const charts = chartsResponse.data;

            if (charts.length > 0) {
              // Group charts by repository
              const repoNode: ChartNode = {
                name: repo.name,
                type: 'folder',
                children: charts.map(chart => ({
                  name: chart.name,
                  type: 'chart' as const,
                  chart: chart,
                })),
              };
              tree.push(repoNode);
            }
          } catch (error) {
            console.error(`Failed to load charts from ${repo.name}:`, error);
          }
        }

        setChartTree(tree);
        addLog(`Loaded ${tree.length} chart repositories`);
      } catch (error: any) {
        console.error('Failed to load chart repositories:', error);
        addLog(`Error loading charts: ${error.response?.data?.detail || error.message}`);
      } finally {
        setLoadingData(false);
      }
    };
    loadCharts();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleChartSelect = async (node: ChartNode) => {
    if (node.type === 'chart' && node.chart) {
      setSelectedChart(node);
      setReleaseName(node.chart.name + '-release');
      addLog(`Selected chart: ${node.chart.name} v${node.chart.version}`);

      // Load default values for the chart
      try {
        addLog(`Loading default values for ${node.chart.name}...`);
        const valuesResponse = await helmApi.getChartValues(
          `${node.chart.repository}/${node.chart.name}`,
          node.chart.repository
        );

        // Convert object to YAML-like string
        const yamlString = JSON.stringify(valuesResponse.data, null, 2);
        setValuesContent(yamlString);
        addLog(`Loaded default values`);
      } catch (error: any) {
        console.error('Failed to load chart values:', error);
        addLog(`Warning: Could not load default values`);
        setValuesContent(defaultValuesTemplate);
      }
    }
  };

  const handleReleaseSelect = async (release: HelmRelease) => {
    setSelectedRelease(release);
    setReleaseName(release.name);
    setNamespace(release.namespace);
    addLog(`Selected release: ${release.name} (rev ${release.revision})`);

    // Load current values for the release
    try {
      addLog(`Loading current values for ${release.name}...`);
      const valuesResponse = await helmApi.getReleaseValues(release.namespace, release.name, false);
      const yamlString = JSON.stringify(valuesResponse.data.user_supplied, null, 2);
      setValuesContent(yamlString);
      addLog(`Loaded current values`);
    } catch (error: any) {
      console.error('Failed to load release values:', error);
      addLog(`Warning: Could not load release values`);
    }
  };

  const handleInstall = async (dryRun: boolean) => {
    if (!selectedChart || !selectedChart.chart) {
      addLog('Error: No chart selected');
      return;
    }

    setLoading(true);
    setResult(null);
    addLog(`Starting ${dryRun ? 'dry run' : 'installation'} of ${selectedChart.chart.name}...`);

    try {
      // Parse values content as JSON (since we stored it as JSON string)
      let values = {};
      try {
        values = JSON.parse(valuesContent);
      } catch (error) {
        addLog('Warning: Could not parse values as JSON, using as-is');
      }

      const response = await helmApi.installRelease({
        release_name: releaseName,
        chart: `${selectedChart.chart.repository}/${selectedChart.chart.name}`,
        namespace: namespace,
        version: selectedChart.chart.version,
        values: values,
        create_namespace: true,
        wait: false,
        dry_run: dryRun,
        repository: selectedChart.chart.repository,
      });

      if (response.data.success) {
        if (dryRun) {
          addLog('Dry run completed successfully');
          addLog(response.data.message);
          setResult({ success: true, message: 'Dry run completed successfully' });
        } else {
          addLog(`Installing ${selectedChart.chart.name} as ${releaseName}...`);
          addLog(response.data.message);
          setResult({ success: true, message: `Release ${releaseName} installed successfully` });

          // Reload releases
          const releasesResponse = await helmApi.listReleases(undefined, true);
          setReleases(releasesResponse.data.releases);
        }
      } else {
        addLog(`Error: ${response.data.message}`);
        setResult({ success: false, message: response.data.message });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Installation failed';
      addLog(`Error: ${errorMsg}`);
      setResult({ success: false, message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedRelease) {
      addLog('Error: No release selected');
      return;
    }

    setLoading(true);
    setResult(null);
    addLog(`Upgrading release ${selectedRelease.name}...`);

    try {
      // Parse values content
      let values = {};
      try {
        values = JSON.parse(valuesContent);
      } catch (error) {
        addLog('Warning: Could not parse values as JSON, using as-is');
      }

      const response = await helmApi.upgradeRelease(
        selectedRelease.namespace,
        selectedRelease.name,
        {
          values: values,
          reuse_values: false,
          wait: false,
          dry_run: false,
        }
      );

      if (response.data.success) {
        addLog('Upgrade completed successfully!');
        addLog(response.data.message);
        setResult({ success: true, message: `Release ${selectedRelease.name} upgraded successfully` });

        // Reload releases
        const releasesResponse = await helmApi.listReleases(undefined, true);
        setReleases(releasesResponse.data.releases);
      } else {
        addLog(`Error: ${response.data.message}`);
        setResult({ success: false, message: response.data.message });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Upgrade failed';
      addLog(`Error: ${errorMsg}`);
      setResult({ success: false, message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedRelease) {
      addLog('Error: No release selected');
      return;
    }

    if (selectedRelease.revision <= 1) {
      addLog('Error: Cannot rollback - no previous revision available');
      return;
    }

    setLoading(true);
    setResult(null);
    const targetRevision = selectedRelease.revision - 1;
    addLog(`Rolling back release ${selectedRelease.name} to revision ${targetRevision}...`);

    try {
      const response = await helmApi.rollbackRelease(
        selectedRelease.namespace,
        selectedRelease.name,
        targetRevision,
        { wait: false, dry_run: false }
      );

      if (response.data.success) {
        addLog('Rollback completed successfully!');
        addLog(response.data.message);
        setResult({ success: true, message: `Release ${selectedRelease.name} rolled back to revision ${targetRevision}` });

        // Reload releases
        const releasesResponse = await helmApi.listReleases(undefined, true);
        setReleases(releasesResponse.data.releases);
      } else {
        addLog(`Error: ${response.data.message}`);
        setResult({ success: false, message: response.data.message });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Rollback failed';
      addLog(`Error: ${errorMsg}`);
      setResult({ success: false, message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(valuesContent);
    addLog('Values copied to clipboard');
  };

  const editorTabs = [
    { id: 'values', label: 'Values', icon: DocumentTextIcon },
    { id: 'chart', label: 'Chart Info', icon: BookOpenIcon },
    { id: 'templates', label: 'Templates', icon: ListBulletIcon },
    { id: 'ai', label: 'AI Review', icon: SparklesIcon },
  ] as const;

  const filteredReleases = releases.filter(release =>
    release.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    release.chart.toLowerCase().includes(searchQuery.toLowerCase()) ||
    release.namespace.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-50 dark:bg-slate-950 p-4' : ''}`}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <CircleStackIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Helm Deploy</h2>
            <p className="text-xs text-gray-500">Install and manage Helm charts</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
        >
          {isFullscreen ? (
            <ArrowsPointingInIcon className="h-5 w-5" />
          ) : (
            <ArrowsPointingOutIcon className="h-5 w-5" />
          )}
        </motion.button>
      </motion.div>

      {/* Main Content - 3 Panel Layout */}
      <motion.div variants={itemVariants} className="grid grid-cols-5 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Left Panel - Chart Explorer / Releases (20%) */}
        <GlassCard className="col-span-1 overflow-hidden flex flex-col">
          {/* Tab Switcher */}
          <div className="p-2 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center gap-1">
            <button
              onClick={() => setActiveLeftTab('charts')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeLeftTab === 'charts'
                  ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <CubeIcon className="h-3.5 w-3.5" />
              Charts
            </button>
            <button
              onClick={() => setActiveLeftTab('releases')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeLeftTab === 'releases'
                  ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <CloudArrowUpIcon className="h-3.5 w-3.5" />
              Releases
            </button>
          </div>

          {/* Search */}
          {activeLeftTab === 'releases' && (
            <div className="p-2 border-b border-gray-200/50 dark:border-slate-700/50">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search releases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200/50 dark:border-slate-700/50 rounded-lg bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 placeholder-gray-400"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {activeLeftTab === 'charts' ? (
              loadingData ? (
                <div className="flex items-center justify-center h-32">
                  <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : chartTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                  <p className="text-xs text-gray-500 mb-2">No chart repositories found</p>
                  <p className="text-xs text-gray-400">Add repositories via Helm CLI</p>
                </div>
              ) : (
                <ChartTree
                  nodes={chartTree}
                  selectedChart={selectedChart?.name || null}
                  onSelectChart={handleChartSelect}
                />
              )
            ) : (
              <div className="space-y-1">
                {filteredReleases.map((release) => (
                  <motion.button
                    key={release.name}
                    whileHover={{ x: 2 }}
                    onClick={() => handleReleaseSelect(release)}
                    className={`w-full p-2 rounded-lg text-left transition-colors ${
                      selectedRelease?.name === release.name
                        ? 'bg-primary-100 dark:bg-primary-500/20'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{release.name}</span>
                      <ReleaseBadge status={release.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{release.chart}</span>
                      <span>•</span>
                      <span>{release.namespace}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Center Panel - Editor (60%) */}
        <GlassCard className="col-span-3 overflow-hidden flex flex-col">
          {/* Editor Tabs */}
          <div className="p-2 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {editorTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveEditorTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeEditorTab === tab.id
                      ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={copyToClipboard}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
                title="Copy to clipboard"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-hidden">
            {activeEditorTab === 'values' && (
              <textarea
                value={valuesContent}
                onChange={(e) => setValuesContent(e.target.value)}
                placeholder="Enter your values.yaml content here..."
                className="w-full h-full font-mono text-sm p-4 resize-none bg-slate-900 dark:bg-slate-950 text-slate-300 placeholder-slate-500 focus:outline-none"
                spellCheck="false"
              />
            )}
            {activeEditorTab === 'chart' && (
              <div className="h-full p-4 overflow-auto">
                {selectedChart?.chart ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                        <CircleStackIcon className="h-8 w-8 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedChart.chart.name}</h3>
                        <p className="text-sm text-gray-500">{selectedChart.chart.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                        <p className="text-xs text-gray-500 mb-1">Chart Version</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <TagIcon className="h-4 w-4 text-gray-400" />
                          {selectedChart.chart.version}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                        <p className="text-xs text-gray-500 mb-1">App Version</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <CubeIcon className="h-4 w-4 text-gray-400" />
                          {selectedChart.chart.appVersion}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                        <p className="text-xs text-gray-500 mb-1">Repository</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <FolderIcon className="h-4 w-4 text-gray-400" />
                          {selectedChart.chart.repo}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                        <p className="text-xs text-gray-500 mb-1">Maintainers</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Bitnami Team</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p className="text-sm">Select a chart to view details</p>
                  </div>
                )}
              </div>
            )}
            {activeEditorTab === 'templates' && (
              <div className="h-full p-4 overflow-auto">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Templates</p>
                  {['deployment.yaml', 'service.yaml', 'ingress.yaml', 'configmap.yaml', 'secrets.yaml', 'hpa.yaml', 'pdb.yaml', 'serviceaccount.yaml'].map((template) => (
                    <div key={template} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 cursor-pointer">
                      <DocumentTextIcon className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{template}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeEditorTab === 'ai' && (
              <div className="h-full p-4 overflow-auto">
                <AIValuesAnalysis
                  valuesContent={valuesContent}
                  chartName={selectedChart?.chart?.name || selectedRelease?.chart}
                  namespace={namespace}
                />
              </div>
            )}
          </div>

          {/* Editor Footer */}
          <div className="px-4 py-2 border-t border-gray-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs text-gray-500">
            <span>{selectedChart?.chart?.name || selectedRelease?.chart || 'values.yaml'}</span>
            <span>{valuesContent.split('\n').length} lines</span>
          </div>
        </GlassCard>

        {/* Right Panel - Settings & Actions (20%) */}
        <GlassCard className="col-span-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center gap-2">
            <Cog6ToothIcon className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Settings</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Release Name */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Release Name</label>
              <input
                type="text"
                value={releaseName}
                onChange={(e) => setReleaseName(e.target.value)}
                placeholder="my-release"
                className="w-full px-3 py-2 text-sm border border-gray-200/50 dark:border-slate-700/50 rounded-xl bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 placeholder-gray-400"
              />
            </div>

            {/* Namespace Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Namespace</label>
              <select
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200/50 dark:border-slate-700/50 rounded-xl bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300"
              >
                {namespaces.map((ns) => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
            </div>

            {/* Selected Release Info */}
            {selectedRelease && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Release Info</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Revision</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedRelease.revision}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Status</span>
                  <ReleaseBadge status={selectedRelease.status} />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ClockIcon className="h-3 w-3" />
                  <span>{new Date(selectedRelease.updated).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {activeLeftTab === 'charts' ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleInstall(true)}
                    disabled={loading || !selectedChart}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-slate-700/50 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Dry Run
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleInstall(false)}
                    disabled={loading || !selectedChart}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                    {loading ? 'Installing...' : 'Install'}
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpgrade}
                    disabled={loading || !selectedRelease}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <CloudArrowUpIcon className="h-4 w-4" />
                    )}
                    {loading ? 'Upgrading...' : 'Upgrade'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRollback}
                    disabled={loading || !selectedRelease || selectedRelease.revision <= 1}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-slate-700/50 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Rollback
                  </motion.button>
                </>
              )}
            </div>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="pt-4 border-t border-gray-200/50 dark:border-slate-700/50"
                >
                  <div className={`p-3 rounded-xl border ${result.success ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'}`}>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircleIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-xs font-medium ${result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {result.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Analysis */}
            <div className="pt-4 border-t border-gray-200/50 dark:border-slate-700/50">
              <AIValuesAnalysis
                valuesContent={valuesContent}
                chartName={selectedChart?.chart?.name || selectedRelease?.chart}
                namespace={namespace}
              />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Bottom Panel - Logs */}
      <motion.div variants={itemVariants}>
        <GlassCard className="overflow-hidden">
          <div className="p-3 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CodeBracketIcon className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Helm Output</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          <div className="h-32 overflow-y-auto bg-slate-900 dark:bg-slate-950 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-slate-500">No logs yet...</p>
            ) : (
              logs.map((log, idx) => (
                <p key={idx} className="text-slate-400">{log}</p>
              ))
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
