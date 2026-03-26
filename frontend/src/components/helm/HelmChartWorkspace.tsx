import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { helmApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import type { HelmRelease, HelmReleaseHistory } from '../../types';
import {
  CubeIcon,
  RocketLaunchIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  DocumentTextIcon,

  CodeBracketIcon,
  ClockIcon,
  SparklesIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
  DocumentDuplicateIcon,
  BeakerIcon,
  MagnifyingGlassCircleIcon,
  HeartIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

type TabType = 'values' | 'rendered' | 'diff' | 'history' | 'resources' | 'ai' | 'health';

interface AIInsight {
  type: 'warning' | 'suggestion' | 'info';
  message: string;
  fix?: string;
}

const DEFAULT_VALUES = `# Default values for chart
replicaCount: 3

image:
  repository: nginx
  tag: stable
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific

resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}
`;


function StatusBadge({ status }: { status: string }) {
  const isHealthy = status === 'deployed';
  const isFailed = status === 'failed';
  const bg = isHealthy ? 'rgba(16,185,129,0.1)' : isFailed ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)';
  const color = isHealthy ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 500, background: bg, color }}>
      {isHealthy ? <CheckCircleIcon style={{ width: 12, height: 12 }} /> : isFailed ? <XCircleIcon style={{ width: 12, height: 12 }} /> : <ClockIcon style={{ width: 12, height: 12 }} />}
      {isHealthy ? 'Healthy' : isFailed ? 'Failed' : 'Pending'}
    </span>
  );
}

function AIInsightCard({ insight, onApplyFix, isDark }: { insight: AIInsight; onApplyFix?: () => void; isDark: boolean }) {
  const cfgs = {
    warning: { Icon: ExclamationTriangleIcon, color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.08)' : '#FFFBEB', border: isDark ? 'rgba(245,158,11,0.2)' : '#FDE68A' },
    suggestion: { Icon: LightBulbIcon, color: '#8B5CF6', bg: isDark ? 'rgba(139,92,246,0.08)' : '#F5F3FF', border: isDark ? 'rgba(139,92,246,0.2)' : '#DDD6FE' },
    info: { Icon: SparklesIcon, color: '#3b82f6', bg: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', border: isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE' },
  };
  const cfg = cfgs[insight.type];
  return (
    <div style={{ padding: 8, borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <cfg.Icon style={{ width: 13, height: 13, color: cfg.color, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: isDark ? '#D1D5DB' : '#374151' }}>{insight.message}</p>
          {insight.fix && onApplyFix && (
            <button onClick={onApplyFix} style={{ marginTop: 6, fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
              Apply Fix
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HelmChartWorkspace() {
  const navigate = useNavigate();
  const { namespace, releaseName } = useParams<{ namespace: string; releaseName: string }>();
  const [searchParams] = useSearchParams();
  const chartParam = searchParams.get('chart');
  const modeParam = searchParams.get('mode') || 'edit';

  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabType>('values');
  const [selectedFile, setSelectedFile] = useState<string>('values.yaml');
  const [valuesContent, setValuesContent] = useState(DEFAULT_VALUES);
  const [release, setRelease] = useState<HelmRelease | null>(null);
  const [history, setHistory] = useState<HelmReleaseHistory[]>([]);
  const [chartInfo, setChartInfo] = useState<{ name: string; version: string; repository: string; description?: string } | null>(null);
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState<{
    show: boolean;
    message: string;
    stage: 'validating' | 'deploying' | 'verifying' | 'success' | 'error';
    error?: string;
    isRepoError?: boolean;
    missingRepo?: string;
  }>({ show: false, message: '', stage: 'validating' });

  const [installNamespace, setInstallNamespace] = useState('default');
  const [installReleaseName, setInstallReleaseName] = useState('');

  const [manifest, setManifest] = useState<string>('');
  const [loadingManifest, setLoadingManifest] = useState(false);

  const [testInProgress, setTestInProgress] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; notes?: string } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewManifest, setPreviewManifest] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [troubleshootData, setTroubleshootData] = useState<any>(null);
  const [troubleshootLoading, setTroubleshootLoading] = useState(false);

  useEffect(() => {
    if (chartParam) {
      const parts = chartParam.split('/');
      if (parts.length >= 2) {
        const chartName = parts[1];
        setChartInfo({ repository: parts[0], name: chartName, version: searchParams.get('version') || 'latest', description: 'Helm chart' });
        setInstallReleaseName(chartName);
      }
    }
  }, [chartParam, searchParams]);

  const fetchRelease = useCallback(async () => {
    if (!namespace || !releaseName) return;
    logger.debug('[FetchRelease] Fetching release data for', { releaseName, namespace });
    setLoading(true);
    setError(null);
    try {
      const [releaseRes, valuesRes, historyRes] = await Promise.all([
        helmApi.getRelease(namespace, releaseName),
        helmApi.getReleaseValues(namespace, releaseName),
        helmApi.getReleaseHistory(namespace, releaseName),
      ]);
      setRelease(releaseRes.data);
      setHistory(historyRes.data || []);
      setChartInfo({ name: releaseRes.data.chart, version: releaseRes.data.chart_version, repository: 'installed', description: releaseRes.data.description });
      const values = valuesRes.data?.user_supplied || valuesRes.data?.computed || {};
      if (Object.keys(values).length > 0) {
        const yaml = await import('js-yaml');
        setValuesContent(yaml.dump(values, { indent: 2, lineWidth: -1 }));
      }
    } catch (err) {
      logger.error('[FetchRelease] Failed', err);
      setError('Failed to fetch release details');
    } finally {
      setLoading(false);
    }
  }, [namespace, releaseName]);

  const fetchManifest = useCallback(async () => {
    if (!namespace || !releaseName) return;
    setLoadingManifest(true);
    try {
      const res = await helmApi.getManifest(namespace, releaseName);
      setManifest(res.data.manifest || '');
    } catch (err) {
      logger.error('Failed to fetch manifest', err);
      setError('Failed to fetch manifest');
    } finally {
      setLoadingManifest(false);
    }
  }, [namespace, releaseName]);

  const fetchHealth = useCallback(async () => {
    if (!namespace || !releaseName) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await helmApi.getReleaseHealth(namespace, releaseName);
      setHealthData(res.data);
    } catch (err: any) {
      logger.error('Failed to fetch health', err);
      setHealthError(err.response?.data?.detail || 'Failed to fetch health data');
    } finally {
      setHealthLoading(false);
    }
  }, [namespace, releaseName]);

  const analyzeConfig = useCallback(async () => {
    if (!valuesContent) { setAiError('No configuration to analyze'); return; }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await helmApi.analyzeConfig(valuesContent, chartInfo?.name, namespace || installNamespace);
      setAiAnalysis(res.data);
      setActiveTab('ai');
    } catch (err: any) {
      logger.error('Failed to analyze config', err);
      setAiError(err.response?.data?.detail || 'Failed to analyze configuration');
    } finally {
      setAiLoading(false);
    }
  }, [valuesContent, chartInfo?.name, namespace, installNamespace]);

  const troubleshootRelease = useCallback(async () => {
    if (!namespace || !releaseName || !healthData) { setAiError('Health data required for troubleshooting'); return; }
    setTroubleshootLoading(true);
    setAiError(null);
    try {
      const res = await helmApi.troubleshoot(releaseName, namespace, healthData, manifest || undefined);
      setTroubleshootData(res.data);
      setAiAnalysis(null);
      setActiveTab('ai');
    } catch (err: any) {
      logger.error('Failed to troubleshoot', err);
      setAiError(err.response?.data?.detail || 'Failed to troubleshoot release');
    } finally {
      setTroubleshootLoading(false);
    }
  }, [namespace, releaseName, healthData, manifest]);

  useEffect(() => {
    if (namespace && releaseName) fetchRelease();
  }, [fetchRelease, namespace, releaseName]);

  useEffect(() => {
    const fetchChartValues = async () => {
      if (modeParam !== 'install' || !chartInfo) return;
      setLoading(true);
      try {
        const response = await helmApi.getChartValues(`${chartInfo.repository}/${chartInfo.name}`);
        if (response.data && Object.keys(response.data).length > 0) {
          const yaml = await import('js-yaml');
          setValuesContent(yaml.dump(response.data, { indent: 2, lineWidth: -1 }));
        }
      } catch (err) {
        logger.error('[FetchChartValues] Failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChartValues();
  }, [modeParam, chartInfo]);

  const handleInstall = async () => {
    if (!chartInfo) { setError('No chart information available.'); return; }
    if (!installReleaseName.trim()) { setError('Please enter a release name.'); return; }
    setDeploymentProgress({ show: true, message: 'Validating YAML configuration...', stage: 'validating' });
    setSaving(true);
    setError(null);
    try {
      let valuesObj = {};
      try {
        const yaml = await import('js-yaml');
        valuesObj = yaml.load(valuesContent) as Record<string, unknown>;
      } catch { throw new Error('Invalid YAML syntax. Please fix the configuration and try again.'); }
      setDeploymentProgress({ show: true, message: `Installing ${chartInfo.name} to ${installNamespace} namespace...`, stage: 'deploying' });
      await helmApi.installRelease({ release_name: installReleaseName, chart: `${chartInfo.repository}/${chartInfo.name}`, namespace: installNamespace, version: chartInfo.version, values: valuesObj });
      setDeploymentProgress({ show: true, message: `Successfully installed ${chartInfo.name}!`, stage: 'success' });
      setTimeout(() => navigate('/deploy/helm'), 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to install chart';
      const repoError = errorMessage.includes('repo') && errorMessage.includes('not found');
      const repoMatch = errorMessage.match(/repo ([a-zA-Z0-9-]+) not found/);
      setDeploymentProgress({
        show: true, message: 'Installation failed', stage: 'error',
        error: errorMessage.includes('cluster unreachable') || errorMessage.includes('connection refused')
          ? 'Kubernetes cluster is not running. Please start your cluster and try again.'
          : repoError ? `The repository "${repoMatch ? repoMatch[1] : chartInfo?.repository}" is not configured.` : errorMessage,
        isRepoError: repoError, missingRepo: repoMatch ? repoMatch[1] : chartInfo?.repository,
      });
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    if (!namespace || !releaseName) return;
    setDeploymentProgress({ show: true, message: 'Validating YAML configuration...', stage: 'validating' });
    setSaving(true);
    setError(null);
    try {
      let valuesObj = {};
      try {
        const yaml = await import('js-yaml');
        valuesObj = yaml.load(valuesContent) as Record<string, unknown>;
      } catch { throw new Error('Invalid YAML syntax. Please fix the configuration and try again.'); }
      setDeploymentProgress({ show: true, message: `Upgrading ${releaseName} in ${namespace} namespace...`, stage: 'deploying' });
      const response = await helmApi.upgradeRelease(namespace, releaseName, { values: valuesObj, reuse_values: false });
      if (!response.data.success) throw new Error(response.data.message || 'Upgrade failed');
      setDeploymentProgress({ show: true, message: `Successfully upgraded ${releaseName}!`, stage: 'success' });
      setTimeout(async () => {
        setDeploymentProgress({ show: false, message: '', stage: 'validating' });
        await fetchRelease();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to upgrade release';
      setDeploymentProgress({
        show: true, message: 'Upgrade failed', stage: 'error',
        error: errorMessage.includes('cluster unreachable') || errorMessage.includes('connection refused')
          ? 'Kubernetes cluster is not running. Please start your cluster and try again.' : errorMessage,
      });
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!namespace || !releaseName) return;
    setTestInProgress(true);
    setTestResult(null);
    setShowTestModal(true);
    try {
      const response = await helmApi.testRelease(namespace, releaseName);
      setTestResult({ success: response.data.success, message: response.data.message || (response.data.success ? 'All tests passed' : 'Tests failed'), notes: response.data.notes });
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.detail || err.message || 'Failed to run tests', notes: err.response?.data?.notes });
    } finally {
      setTestInProgress(false);
    }
  };

  const handlePreviewUpgrade = async () => {
    if (!namespace || !releaseName) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setShowPreviewModal(true);
    setPreviewManifest('');
    try {
      let valuesObj = {};
      try { const yaml = await import('js-yaml'); valuesObj = yaml.load(valuesContent) as Record<string, unknown>; }
      catch { throw new Error('Invalid YAML syntax.'); }
      const response = await helmApi.upgradeRelease(namespace, releaseName, { values: valuesObj, reuse_values: false, dry_run: true });
      if (!response.data.success) setPreviewError(response.data.message || 'Preview failed');
      else setPreviewManifest(response.data.manifest || 'No manifest returned');
    } catch (err: any) {
      setPreviewError(err.response?.data?.detail || err.message || 'Failed to preview changes');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewInstall = async () => {
    if (!installNamespace || !installReleaseName || !chartInfo) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setShowPreviewModal(true);
    setPreviewManifest('');
    try {
      let valuesObj = {};
      try { const yaml = await import('js-yaml'); valuesObj = yaml.load(valuesContent) as Record<string, unknown>; }
      catch { throw new Error('Invalid YAML syntax.'); }
      const response = await helmApi.installRelease({ release_name: installReleaseName, chart: `${chartInfo.repository}/${chartInfo.name}`, namespace: installNamespace, version: chartInfo.version !== 'latest' ? chartInfo.version : undefined, values: valuesObj, create_namespace: true, dry_run: true });
      if (!response.data.success) setPreviewError(response.data.message || 'Preview failed');
      else setPreviewManifest(response.data.manifest || 'No manifest returned');
    } catch (err: any) {
      setPreviewError(err.response?.data?.detail || err.message || 'Failed to preview installation');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRollback = async (targetRevision?: number) => {
    if (!namespace || !releaseName || !release) return;
    const revision = targetRevision || (release.revision - 1);
    if (revision < 1) return;
    const revisionInfo = history.find(h => h.revision === revision);
    const confirmMessage = targetRevision
      ? `Are you sure you want to rollback to revision ${revision}?\n\nChart: ${revisionInfo?.chart} v${revisionInfo?.chart_version}\nDeployed: ${revisionInfo?.updated}`
      : `Are you sure you want to rollback to the previous revision?`;
    if (!confirm(confirmMessage)) return;
    setSaving(true);
    setError(null);
    try {
      await helmApi.rollbackRelease(namespace, releaseName, revision);
      await fetchRelease();
    } catch (err) {
      logger.error('Failed to rollback', err);
      setError('Failed to rollback release');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!namespace || !releaseName) return;
    if (!confirm(`Are you sure you want to delete release "${releaseName}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await helmApi.uninstallRelease(namespace, releaseName);
      navigate('/deploy/helm');
    } catch (err) {
      logger.error('Failed to delete', err);
      setError('Failed to delete release');
    } finally {
      setSaving(false);
    }
  };

  const isInstallMode = modeParam === 'install' || (!namespace && !releaseName);

  const tabs = isInstallMode
    ? [{ id: 'values' as TabType, label: 'Configure', icon: DocumentTextIcon }, { id: 'ai' as TabType, label: 'AI Assistant', icon: SparklesIcon }]
    : [
        { id: 'values' as TabType, label: 'Values', icon: DocumentTextIcon },
        { id: 'diff' as TabType, label: 'Preview Changes', icon: CodeBracketIcon },
        { id: 'resources' as TabType, label: 'Resources', icon: ServerStackIcon },
        { id: 'health' as TabType, label: 'Health', icon: HeartIcon },
        { id: 'history' as TabType, label: 'History', icon: ClockIcon },
        { id: 'ai' as TabType, label: 'AI Review', icon: SparklesIcon },
      ];

  const useFullWidth = activeTab === 'diff';

  // Style helpers
  const border = `1px solid ${t.cardBorder}`;
  const sectionBg = isDark ? 'rgba(0,0,0,0.15)' : '#F9FAFB';
  const labelColor = isDark ? '#9CA3AF' : '#6B7280';
  const valueColor = isDark ? '#E5E7EB' : '#111827';
  const subText = isDark ? '#9CA3AF' : '#4B5563';

  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    background: isDark ? t.navHoverBg : '#F3F4F6',
    color: isDark ? '#E5E7EB' : '#374151',
    border: `1px solid ${t.cardBorder}`,
  };

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: '#3b82f6', color: '#fff', border: 'none',
    boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
  };

  const btnDanger: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
    color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)',
  };

  const btnPurple: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)',
    color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)',
  };

  return (
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.cardBg, color: t.text }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, borderBottom: border, flexShrink: 0, background: t.cardBg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/deploy/helm')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'transparent', border: `1px solid ${t.cardBorder}`, cursor: 'pointer', color: t.textMuted }}
            onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
          >
            <ArrowLeftIcon style={{ width: 16, height: 16 }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CubeIcon style={{ width: 18, height: 18, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                {chartInfo ? `${chartInfo.repository}/${chartInfo.name}` : 'Helm Chart Workspace'}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted }}>
                {isInstallMode ? 'Install new chart' : `Editing ${releaseName}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isInstallMode ? (
            <>
              <button onClick={handlePreviewInstall} disabled={saving || previewLoading} style={btnSecondary}>
                {previewLoading ? <ArrowPathIcon style={{ width: 14, height: 14 }} /> : <MagnifyingGlassCircleIcon style={{ width: 14, height: 14 }} />}
                Preview
              </button>
              <button onClick={handleInstall} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? <ArrowPathIcon style={{ width: 14, height: 14 }} /> : <RocketLaunchIcon style={{ width: 14, height: 14 }} />}
                Install
              </button>
            </>
          ) : (
            <>
              <button onClick={handlePreviewUpgrade} disabled={saving || previewLoading} style={btnSecondary}>
                {previewLoading ? <ArrowPathIcon style={{ width: 14, height: 14 }} /> : <MagnifyingGlassCircleIcon style={{ width: 14, height: 14 }} />}
                Preview
              </button>
              <button onClick={handleUpgrade} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? <ArrowPathIcon style={{ width: 14, height: 14 }} /> : <ArrowUpTrayIcon style={{ width: 14, height: 14 }} />}
                Upgrade
              </button>
              <button onClick={() => handleRollback()} disabled={saving || !release || release.revision <= 1} style={{ ...btnSecondary, opacity: (!release || release.revision <= 1) ? 0.4 : 1 }}>
                <ArrowUturnLeftIcon style={{ width: 14, height: 14 }} />
                Rollback
              </button>
              <button onClick={handleTest} disabled={saving || testInProgress} style={btnPurple}>
                {testInProgress ? <ArrowPathIcon style={{ width: 14, height: 14 }} /> : <BeakerIcon style={{ width: 14, height: 14 }} />}
                Test
              </button>
              <button onClick={handleDelete} disabled={saving} style={btnDanger}>
                <TrashIcon style={{ width: 14, height: 14 }} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ margin: '0 24px', marginTop: 8, padding: '8px 12px', background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#EF4444', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 24px', height: 44, borderBottom: border, background: t.cardBg, flexShrink: 0 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6,
                fontSize: 12, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                background: isActive ? (isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF') : 'transparent',
                color: isActive ? '#3b82f6' : t.textMuted,
                border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}
            >
              <tab.icon style={{ width: 13, height: 13 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left Sidebar */}
        {!useFullWidth && (
          <div style={{ width: 220, display: 'flex', flexDirection: 'column', borderRight: border, background: t.cardBg, flexShrink: 0 }}>
            {/* Chart Info */}
            <div style={{ padding: 12, borderBottom: border, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Chart Info</div>
              <div style={{ padding: 8, background: sectionBg, borderRadius: 8, border }}>
                {[
                  { label: 'Name', value: chartInfo?.name || 'N/A' },
                  { label: 'Version', value: chartInfo?.version || 'N/A', color: '#3b82f6' },
                  { label: 'Repo', value: chartInfo?.repository || 'N/A' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: labelColor }}>{label}:</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: color || valueColor, ...mono, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ padding: 12, borderBottom: border }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Import Values', icon: CloudArrowUpIcon, onClick: () => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = '.yaml,.yml';
                    input.onchange = (e: any) => {
                      const file = e.target.files[0];
                      if (file) { const reader = new FileReader(); reader.onload = (ev) => setValuesContent(ev.target?.result as string); reader.readAsText(file); }
                    };
                    input.click();
                  }},
                  { label: 'Export Values', icon: ArrowPathIcon, onClick: () => {
                    const blob = new Blob([valuesContent], { type: 'text/yaml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `${chartInfo?.name || 'chart'}-values.yaml`; a.click();
                    URL.revokeObjectURL(url);
                  }},
                  { label: 'Reset to Default', icon: ArrowPathIcon, onClick: () => setValuesContent(DEFAULT_VALUES) },
                ].map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: isDark ? t.navHoverBg : '#F3F4F6', color: isDark ? '#9CA3AF' : '#374151', border }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isDark ? t.navHoverBg : '#F3F4F6'; }}
                  >
                    <Icon style={{ width: 12, height: 12 }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* YAML Status */}
            <div style={{ flex: 1, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>YAML Status</div>
              <div style={{ padding: 8, background: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <CheckCircleIcon style={{ width: 14, height: 14, color: '#10B981' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>Valid YAML</span>
                </div>
                <p style={{ fontSize: 11, color: isDark ? '#6EE7B7' : '#059669' }}>No syntax errors detected</p>
              </div>
            </div>
          </div>
        )}

        {/* Center - Editor/Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {activeTab === 'values' && (
            <Editor
              height="100%"
              defaultLanguage="yaml"
              value={valuesContent}
              onChange={(value) => setValuesContent(value || '')}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: true }, fontSize: 13, lineNumbers: 'on',
                scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: 'on',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                fontLigatures: true, smoothScrolling: true, cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on', renderLineHighlight: 'all',
                padding: { top: 16, bottom: 16 },
              }}
            />
          )}

          {activeTab === 'rendered' && (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Rendered template list */}
              <div style={{ width: 220, display: 'flex', flexDirection: 'column', borderRight: border, background: t.cardBg }}>
                <div style={{ padding: '8px 12px', borderBottom: border }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Rendered Templates</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                  {['deployment.yaml', 'service.yaml', 'ingress.yaml', 'configmap.yaml', 'hpa.yaml', 'secret.yaml'].map((template) => (
                    <button
                      key={template}
                      onClick={() => setSelectedFile(template)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', marginBottom: 2,
                        background: selectedFile === template ? (isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF') : 'transparent',
                        color: selectedFile === template ? '#3b82f6' : subText,
                      }}
                      onMouseEnter={e => { if (selectedFile !== template) e.currentTarget.style.background = t.navHoverBg; }}
                      onMouseLeave={e => { if (selectedFile !== template) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <DocumentIcon style={{ width: 13, height: 13, color: '#3b82f6', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template}</span>
                      </div>
                      {template === 'hpa.yaml' && <span style={{ fontSize: 10, color: '#8B5CF6', ...mono }}>AI</span>}
                    </button>
                  ))}
                </div>
                <div style={{ padding: 12, borderTop: border }}>
                  {[['Show empty manifests', true], ['Collapse YAML sections', false], ['Highlight changes', false]].map(([label, checked]) => (
                    <label key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: subText, cursor: 'pointer', marginBottom: 4 }}>
                      <input type="checkbox" defaultChecked={checked as boolean} style={{ borderRadius: 3 }} />
                      {label as string}
                    </label>
                  ))}
                </div>
              </div>
              {/* YAML Viewer */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', borderBottom: border, background: sectionBg, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.text, ...mono }}>FILE: {selectedFile || 'deployment.yaml'}</span>
                  <button style={{ ...btnSecondary, fontSize: 11 }}>Copy YAML</button>
                </div>
                <Editor height="100%" defaultLanguage="yaml" value={`apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-prod`} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 16, bottom: 16 } }} />
              </div>
              {/* AI Insights */}
              <div style={{ width: 260, display: 'flex', flexDirection: 'column', borderLeft: border, background: t.cardBg }}>
                <div style={{ padding: '8px 12px', borderBottom: border, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SparklesIcon style={{ width: 13, height: 13, color: '#8B5CF6' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>AI Insights</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                  {aiAnalysis?.issues?.map((issue: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: 6 }}>
                      <AIInsightCard isDark={isDark} insight={{ type: issue.severity === 'critical' || issue.severity === 'high' ? 'warning' : issue.severity === 'medium' ? 'suggestion' : 'info', message: `[${issue.severity?.toUpperCase()}] ${issue.issue || issue.description || issue.message}`, fix: issue.fix }} />
                    </div>
                  ))}
                  {!aiAnalysis && <div style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', padding: '24px 8px' }}>Click "Analyze Config" to get AI insights</div>}
                </div>
                <div style={{ padding: 10, borderTop: border }}>
                  <button onClick={analyzeConfig} disabled={aiLoading || !valuesContent} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#8B5CF6,#EC4899)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: aiLoading ? 0.6 : 1 }}>
                    <SparklesIcon style={{ width: 13, height: 13 }} />
                    {aiLoading ? 'Analyzing...' : 'Analyze Config'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Diff file list */}
              <div style={{ width: 220, display: 'flex', flexDirection: 'column', borderRight: border, background: t.cardBg }}>
                <div style={{ padding: '8px 12px', borderBottom: border }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Diff Files</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                  {[
                    { name: 'deployment.yaml', changes: 4, type: 'modified' },
                    { name: 'service.yaml', changes: 0, type: 'unchanged' },
                    { name: 'ingress.yaml', changes: 1, type: 'modified' },
                    { name: 'configmap.yaml', changes: 2, type: 'modified' },
                    { name: 'hpa.yaml', changes: 0, type: 'added' },
                    { name: 'pdb.yaml', changes: 0, type: 'added-ai' },
                  ].map((file) => (
                    <button
                      key={file.name}
                      onClick={() => setSelectedFile(file.name)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', marginBottom: 2,
                        background: selectedFile === file.name ? (isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF') : 'transparent',
                        color: selectedFile === file.name ? '#3b82f6' : subText,
                      }}
                      onMouseEnter={e => { if (selectedFile !== file.name) e.currentTarget.style.background = t.navHoverBg; }}
                      onMouseLeave={e => { if (selectedFile !== file.name) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <DocumentIcon style={{ width: 13, height: 13, color: file.type === 'added' || file.type === 'added-ai' ? '#10B981' : file.type === 'modified' ? '#F59E0B' : t.textMuted, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, ...mono }}>
                        {file.type === 'added-ai' && <span style={{ color: '#8B5CF6' }}>AI</span>}
                        {file.changes > 0 ? <span style={{ color: '#F59E0B' }}>{file.changes}</span> : file.type === 'unchanged' ? <span style={{ color: t.textMuted }}>—</span> : <span style={{ color: '#10B981' }}>new</span>}
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ padding: 12, borderTop: border }}>
                  {[['Show only changed files', true], ['Group by resource', false], ['Hide added/removed', false]].map(([label, checked]) => (
                    <label key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: subText, cursor: 'pointer', marginBottom: 4 }}>
                      <input type="checkbox" defaultChecked={checked as boolean} />
                      {label as string}
                    </label>
                  ))}
                </div>
              </div>

              {/* Diff Viewer */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', borderBottom: border, background: sectionBg, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.text, ...mono }}>FILE: {selectedFile || 'deployment.yaml'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', background: sectionBg, borderRadius: 6, border, overflow: 'hidden' }}>
                      <button style={{ padding: '3px 10px', fontSize: 11, background: t.cardBg, color: t.text, border: 'none', cursor: 'pointer' }}>Unified</button>
                      <button style={{ padding: '3px 10px', fontSize: 11, background: 'transparent', color: t.textMuted, border: 'none', cursor: 'pointer' }}>Split</button>
                    </div>
                    <button style={btnSecondary}>Copy Diff</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', background: '#0D1117', padding: 16, ...mono, fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ color: '#6B7280', marginBottom: 12 }}>
                    <div>--- BEFORE (running)</div>
                    <div>+++ AFTER (new update)</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#60A5FA', marginBottom: 4 }}>@@ spec.replicas @@</div>
                    <div style={{ color: '#F87171' }}>- replicas: 2</div>
                    <div style={{ color: '#4ADE80' }}>+ replicas: 3</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#60A5FA', marginBottom: 4 }}>@@ container resources @@</div>
                    <div style={{ color: '#D1D5DB' }}>            resources:</div>
                    <div style={{ color: '#F87171' }}>-              limits: {'{}'}</div>
                    <div style={{ color: '#4ADE80' }}>+              limits:</div>
                    <div style={{ color: '#4ADE80' }}>+                cpu: 200m</div>
                    <div style={{ color: '#4ADE80' }}>+                memory: 256Mi</div>
                  </div>
                </div>
              </div>

              {/* AI Diff Summary */}
              <div style={{ width: 260, display: 'flex', flexDirection: 'column', borderLeft: border, background: t.cardBg }}>
                <div style={{ padding: '8px 12px', borderBottom: border, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SparklesIcon style={{ width: 13, height: 13, color: '#8B5CF6' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>AI Summary</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                  {[
                    'Increased replicas from 2 → 3 to improve resilience',
                    'Added CPU/Mem limits (200m / 256Mi) to prevent overuse',
                    'Added missing livenessProbe for better health monitoring',
                    'Added PodDisruptionBudget (recommended for HA)',
                  ].map((msg) => (
                    <div key={msg} style={{ marginBottom: 6, padding: 8, background: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <CheckCircleIcon style={{ width: 13, height: 13, color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11, color: isDark ? '#D1D5DB' : '#374151' }}>{msg}</p>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 10, borderTop: border, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button style={{ ...btnPurple, justifyContent: 'center', width: '100%' }}>Explain Each Change</button>
                  <button style={{ ...btnSecondary, justifyContent: 'center', width: '100%', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', background: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF' }}>Suggest Optimal Config</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Release History</span>
                <span style={{ fontSize: 11, color: t.textMuted }}>Current: Revision {release?.revision}</span>
              </div>
              {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map((rev) => {
                    const isCurrent = rev.revision === release?.revision;
                    const canRollback = !isCurrent && (rev.status === 'deployed' || rev.status === 'superseded');
                    return (
                      <div
                        key={rev.revision}
                        style={{
                          padding: 12, borderRadius: 10,
                          background: isCurrent ? (isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF') : t.cardBg,
                          border: isCurrent ? '1px solid rgba(59,130,246,0.35)' : border,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? '#3b82f6' : t.text }}>Revision {rev.revision}</span>
                            {isCurrent && <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 9999, background: '#3b82f6', color: '#fff', fontWeight: 600 }}>Current</span>}
                            <StatusBadge status={rev.status} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: t.textMuted }}>{rev.updated}</span>
                            {canRollback && (
                              <button
                                onClick={() => handleRollback(rev.revision)}
                                disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, fontWeight: 500, background: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, cursor: 'pointer' }}
                              >
                                <ArrowUturnLeftIcon style={{ width: 12, height: 12 }} />
                                Rollback
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: subText }}>
                          <span>Chart: {rev.chart} v{rev.chart_version}</span>
                          {rev.description && <span style={{ fontStyle: 'italic', color: t.textMuted }}>{rev.description}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                  <ClockIcon style={{ width: 40, height: 40, color: t.textMuted, marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: t.textMuted }}>No revision history available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ServerStackIcon style={{ width: 16, height: 16, color: '#3b82f6' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Kubernetes Resources</span>
                </div>
                <button onClick={fetchManifest} disabled={loadingManifest} style={{ ...btnSecondary, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', background: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF' }}>
                  <ArrowPathIcon style={{ width: 13, height: 13, animation: loadingManifest ? 'spin 1s linear infinite' : 'none' }} />
                  Refresh
                </button>
              </div>
              {loadingManifest ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
                  <ArrowPathIcon style={{ width: 32, height: 32, color: t.textMuted, marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: t.textMuted }}>Loading resources...</p>
                </div>
              ) : manifest ? (
                <div style={{ background: '#0D1117', borderRadius: 10, overflow: 'hidden', border }}>
                  <div style={{ background: '#161B22', padding: '8px 14px', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#8B949E', ...mono }}>manifest.yaml</span>
                    <button onClick={() => navigator.clipboard.writeText(manifest)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <DocumentDuplicateIcon style={{ width: 13, height: 13 }} />Copy
                    </button>
                  </div>
                  <div style={{ padding: 16, overflowY: 'auto', maxHeight: 500 }}>
                    <pre style={{ fontSize: 11, color: '#C9D1D9', ...mono, whiteSpace: 'pre', margin: 0 }}>{manifest}</pre>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
                  <ServerStackIcon style={{ width: 40, height: 40, color: t.textMuted, marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>No resources loaded</p>
                  <button onClick={fetchManifest} style={{ ...btnSecondary, color: '#3b82f6' }}>Load Resources</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'health' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HeartIcon style={{ width: 16, height: 16, color: '#EF4444' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Release Health</span>
                </div>
                <button onClick={fetchHealth} disabled={healthLoading} style={{ ...btnDanger }}>
                  <ArrowPathIcon style={{ width: 13, height: 13 }} />
                  Refresh
                </button>
              </div>
              {healthLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
                  <ArrowPathIcon style={{ width: 32, height: 32, color: t.textMuted, marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: t.textMuted }}>Loading health data...</p>
                </div>
              ) : healthError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
                  <XCircleIcon style={{ width: 40, height: 40, color: '#EF4444', marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{healthError}</p>
                  <button onClick={fetchHealth} style={btnDanger}>Retry</button>
                </div>
              ) : healthData ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {[
                      { icon: healthData.healthy ? CheckCircleIcon : XCircleIcon, color: healthData.healthy ? '#10B981' : '#EF4444', label: healthData.healthy ? 'Healthy' : 'Unhealthy', value: `${healthData.ready_pods}/${healthData.total_pods}`, sub: 'Pods Ready', bg: healthData.healthy ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', bdr: healthData.healthy ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)' },
                      { icon: CubeIcon, color: '#3b82f6', label: 'Total Pods', value: String(healthData.total_pods), sub: 'Running', bg: 'rgba(59,130,246,0.08)', bdr: 'rgba(59,130,246,0.25)' },
                      { icon: ClockIcon, color: '#8B5CF6', label: 'Events', value: String(healthData.events?.length || 0), sub: 'Recent', bg: 'rgba(139,92,246,0.08)', bdr: 'rgba(139,92,246,0.25)' },
                    ].map(({ icon: Icon, color, label, value, sub, bg, bdr }) => (
                      <div key={label} style={{ padding: 16, borderRadius: 10, background: bg, border: `1px solid ${bdr}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Icon style={{ width: 16, height: 16, color }} />
                          <span style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: t.text }}>{value}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>

                  {healthData.pods?.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Pod Details</div>
                      {healthData.pods.map((pod: any, idx: number) => (
                        <div key={idx} style={{ padding: 12, borderRadius: 10, background: pod.ready ? t.cardBg : 'rgba(239,68,68,0.05)', border: pod.ready ? border : '1px solid rgba(239,68,68,0.2)', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                {pod.ready ? <CheckCircleIcon style={{ width: 14, height: 14, color: '#10B981', flexShrink: 0 }} /> : <XCircleIcon style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }} />}
                                <span style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pod.name}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: subText }}>
                                <span>Phase: <strong>{pod.phase}</strong></span>
                                <span>Node: <strong>{pod.node || 'N/A'}</strong></span>
                              </div>
                            </div>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, fontWeight: 500, background: pod.phase === 'Running' ? 'rgba(16,185,129,0.1)' : pod.phase === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: pod.phase === 'Running' ? '#10B981' : pod.phase === 'Pending' ? '#F59E0B' : '#EF4444' }}>
                              {pod.phase}
                            </span>
                          </div>
                          {pod.containers?.map((container: any, cIdx: number) => (
                            <div key={cIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: sectionBg, borderRadius: 6, marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: container.ready ? '#10B981' : '#EF4444' }} />
                                <span style={{ fontSize: 11, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{container.name}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: subText }}>
                                <span>State: <strong>{container.state}</strong></span>
                                <span>Restarts: <strong>{container.restartCount}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {healthData.events?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Recent Events</div>
                      {healthData.events.map((event: any, idx: number) => (
                        <div key={idx} style={{ padding: 10, borderRadius: 8, marginBottom: 6, background: event.type === 'Warning' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${event.type === 'Warning' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)'}` }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            {event.type === 'Warning' ? <ExclamationTriangleIcon style={{ width: 14, height: 14, color: '#F59E0B', flexShrink: 0, marginTop: 1 }} /> : <CheckCircleIcon style={{ width: 14, height: 14, color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{event.reason}</span>
                                {event.count > 1 && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: sectionBg, color: subText }}>{event.count}x</span>}
                              </div>
                              <p style={{ fontSize: 11, color: isDark ? '#D1D5DB' : '#374151', marginBottom: 2 }}>{event.message}</p>
                              <p style={{ fontSize: 10, color: t.textMuted }}>{event.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
                  <HeartIcon style={{ width: 40, height: 40, color: t.textMuted, marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>No health data loaded</p>
                  <button onClick={fetchHealth} style={btnDanger}>Load Health Status</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SparklesIcon style={{ width: 16, height: 16, color: '#8B5CF6' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>AI-Powered Analysis</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={analyzeConfig} disabled={aiLoading || troubleshootLoading} style={btnPurple}>
                    <WrenchScrewdriverIcon style={{ width: 13, height: 13 }} />
                    Analyze Config
                  </button>
                  {healthData && !healthData.healthy && (
                    <button onClick={troubleshootRelease} disabled={aiLoading || troubleshootLoading} style={btnDanger}>
                      <ExclamationTriangleIcon style={{ width: 13, height: 13 }} />
                      Diagnose Issues
                    </button>
                  )}
                </div>
              </div>

              {(aiLoading || troubleshootLoading) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#8B5CF6', marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: t.textMuted }}>{aiLoading ? 'Analyzing configuration...' : 'Diagnosing issues...'}</p>
                </div>
              )}

              {!aiLoading && !troubleshootLoading && aiError && (
                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: 10 }}>
                  <XCircleIcon style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 4 }}>Analysis Error</p>
                    <p style={{ fontSize: 12, color: '#EF4444' }}>{aiError}</p>
                  </div>
                </div>
              )}

              {!aiLoading && !troubleshootLoading && !aiError && aiAnalysis && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ padding: 16, borderRadius: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <ShieldCheckIcon style={{ width: 16, height: 16, color: '#3b82f6' }} />
                        <span style={{ fontSize: 11, color: t.textMuted }}>Security Score</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{aiAnalysis.security_score}/100</div>
                    </div>
                    <div style={{ padding: 16, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <CheckCircleIcon style={{ width: 16, height: 16, color: '#10B981' }} />
                        <span style={{ fontSize: 11, color: t.textMuted }}>Production Ready</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{aiAnalysis.production_ready ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 10, background: sectionBg, border, marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>Analysis</h4>
                    <p style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 1.6 }}>{aiAnalysis.analysis}</p>
                  </div>
                  {aiAnalysis.issues?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Issues Found</h4>
                      {aiAnalysis.issues.map((issue: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: 6 }}>
                          <AIInsightCard isDark={isDark} insight={{ type: issue.severity === 'critical' || issue.severity === 'high' ? 'warning' : issue.severity === 'medium' ? 'suggestion' : 'info', message: `[${issue.severity.toUpperCase()}] ${issue.issue}`, fix: issue.fix }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {aiAnalysis.recommendations?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Recommendations</h4>
                      {aiAnalysis.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} style={{ padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <LightBulbIcon style={{ width: 14, height: 14, color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>{rec.title}</span>
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>{rec.priority}</span>
                              </div>
                              <p style={{ fontSize: 11, color: isDark ? '#93C5FD' : '#1D4ED8' }}>{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!aiLoading && !troubleshootLoading && !aiError && troubleshootData && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 9999, background: troubleshootData.severity === 'critical' ? 'rgba(239,68,68,0.15)' : troubleshootData.severity === 'high' ? 'rgba(249,115,22,0.15)' : 'rgba(245,158,11,0.15)', color: troubleshootData.severity === 'critical' ? '#EF4444' : troubleshootData.severity === 'high' ? '#F97316' : '#F59E0B' }}>
                      {troubleshootData.severity?.toUpperCase() || 'UNKNOWN'} SEVERITY
                    </span>
                  </div>
                  <div style={{ padding: 14, borderRadius: 10, background: sectionBg, border, marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>Diagnosis</h4>
                    <p style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 1.6 }}>{troubleshootData.diagnosis}</p>
                  </div>
                  {troubleshootData.root_causes?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Root Causes</h4>
                      {troubleshootData.root_causes.map((cause: string, idx: number) => (
                        <div key={idx} style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 6, display: 'flex', gap: 8 }}>
                          <ExclamationTriangleIcon style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 11, color: '#EF4444' }}>{cause}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {troubleshootData.fixes?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Recommended Fixes</h4>
                      {troubleshootData.fixes.map((fix: any, idx: number) => (
                        <div key={idx} style={{ padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 6 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <WrenchScrewdriverIcon style={{ width: 14, height: 14, color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>{fix.type || 'Fix'}</span>
                                {fix.priority && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>{fix.priority}</span>}
                              </div>
                              <p style={{ fontSize: 11, color: isDark ? '#6EE7B7' : '#059669' }}>{fix.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!aiLoading && !troubleshootLoading && !aiError && !aiAnalysis && !troubleshootData && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
                  <SparklesIcon style={{ width: 48, height: 48, color: isDark ? '#7C3AED' : '#8B5CF6', opacity: 0.5, marginBottom: 16 }} />
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>No Analysis Yet</h4>
                  <p style={{ fontSize: 13, color: t.textMuted, maxWidth: 400, lineHeight: 1.6 }}>
                    Click "Analyze Config" to get AI-powered insights on your Helm chart configuration, or "Diagnose Issues" to troubleshoot deployment problems.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {!useFullWidth && (
          <div style={{ width: 240, display: 'flex', flexDirection: 'column', borderLeft: border, background: t.cardBg, overflowY: 'auto', flexShrink: 0 }}>
            {isInstallMode ? (
              <div style={{ padding: 12, borderBottom: border }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Installation Config</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: isDark ? '#D1D5DB' : '#374151', marginBottom: 4 }}>Release Name</label>
                  <input
                    type="text"
                    value={installReleaseName}
                    onChange={(e) => setInstallReleaseName(e.target.value)}
                    placeholder="my-release"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 12, border, borderRadius: 6, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', color: t.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>Unique name for this deployment</p>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: isDark ? '#D1D5DB' : '#374151', marginBottom: 4 }}>Namespace</label>
                  <input
                    type="text"
                    value={installNamespace}
                    onChange={(e) => setInstallNamespace(e.target.value)}
                    placeholder="default"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 12, border, borderRadius: 6, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', color: t.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>Kubernetes namespace</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: isDark ? '#D1D5DB' : '#374151', marginBottom: 4 }}>Chart Details</label>
                  <div style={{ padding: 8, background: sectionBg, borderRadius: 6, border }}>
                    {[['Chart', chartInfo?.name], ['Version', chartInfo?.version], ['Repo', chartInfo?.repository]].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: labelColor }}>{label}:</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: label === 'Version' ? '#3b82f6' : valueColor, ...mono }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderBottom: border }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Chart Metadata</div>
                {[['Chart Name', chartInfo?.name || 'N/A'], ['Version', chartInfo?.version || 'N/A', '#3b82f6'], ['App Version', release?.app_version || '—'], ['Maintainers', 'Bitnami']].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: labelColor }}>{label}:</span>
                    <span style={{ fontSize: 11, color: (color as string) || valueColor, ...mono }}>{val}</span>
                  </div>
                ))}
                {chartInfo?.description && <p style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.5 }}>{chartInfo.description}</p>}
              </div>
            )}

            {release && (
              <div style={{ padding: 12, borderBottom: border }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Release Info</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: labelColor }}>Release:</span>
                  <span style={{ fontSize: 11, color: valueColor, ...mono }}>{release.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: labelColor }}>Status:</span>
                  <StatusBadge status={release.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: labelColor }}>Updated:</span>
                  <span style={{ fontSize: 11, color: valueColor }}>{release.updated || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: labelColor }}>Revision:</span>
                  <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>{release.revision}</span>
                </div>
              </div>
            )}

            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <SparklesIcon style={{ width: 13, height: 13, color: '#8B5CF6' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>AI Insights</span>
              </div>
              {aiAnalysis ? (
                <div>
                  {aiAnalysis.issues?.slice(0, 2).map((issue: any, idx: number) => (
                    <div key={idx} style={{ padding: 6, borderRadius: 6, fontSize: 11, marginBottom: 4, background: issue.severity === 'critical' || issue.severity === 'high' ? 'rgba(239,68,68,0.08)' : issue.severity === 'medium' ? 'rgba(245,158,11,0.08)' : sectionBg, color: issue.severity === 'critical' || issue.severity === 'high' ? '#EF4444' : issue.severity === 'medium' ? '#F59E0B' : subText }}>
                      <strong>{issue.severity?.toUpperCase()}:</strong> {issue.description || issue.message}
                    </div>
                  ))}
                  {aiAnalysis.recommendations?.slice(0, 2).map((rec: any, idx: number) => (
                    <div key={idx} style={{ padding: 6, borderRadius: 6, fontSize: 11, marginBottom: 4, background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                      <strong>TIP:</strong> {typeof rec === 'string' ? rec : rec.description || rec.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 8, borderRadius: 6, background: sectionBg, fontSize: 11, color: t.textMuted, textAlign: 'center' }}>
                  Click "Analyze Config" to get AI insights
                </div>
              )}
              <button onClick={analyzeConfig} disabled={aiLoading || !valuesContent} style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#8B5CF6,#EC4899)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: (aiLoading || !valuesContent) ? 0.5 : 1 }}>
                <SparklesIcon style={{ width: 12, height: 12 }} />
                {aiLoading ? 'Analyzing...' : 'Analyze Config'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deployment Progress Modal */}
      {deploymentProgress.show && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { if (deploymentProgress.stage === 'error') setDeploymentProgress({ show: false, message: '', stage: 'validating' }); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: t.cardBg, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border, padding: 32, maxWidth: 420, width: '100%', margin: '0 16px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ marginBottom: 20 }}>
                {deploymentProgress.stage === 'success' ? (
                  <div style={{ padding: 16, borderRadius: '50%', background: 'rgba(16,185,129,0.15)' }}>
                    <CheckCircleIcon style={{ width: 48, height: 48, color: '#10B981' }} />
                  </div>
                ) : deploymentProgress.stage === 'error' ? (
                  <div style={{ padding: 16, borderRadius: '50%', background: 'rgba(239,68,68,0.15)' }}>
                    <XCircleIcon style={{ width: 48, height: 48, color: '#EF4444' }} />
                  </div>
                ) : (
                  <div style={{ padding: 16, borderRadius: '50%', background: 'rgba(59,130,246,0.15)' }}>
                    <RocketLaunchIcon style={{ width: 48, height: 48, color: '#3b82f6' }} />
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 8 }}>{deploymentProgress.message}</h3>
              {deploymentProgress.error && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, width: '100%' }}>
                  <p style={{ fontSize: 12, color: '#EF4444', textAlign: 'left', lineHeight: 1.5 }}>{deploymentProgress.error}</p>
                </div>
              )}
              {deploymentProgress.stage !== 'error' && deploymentProgress.stage !== 'success' && (
                <>
                  <p style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>
                    {deploymentProgress.stage === 'validating' ? 'Checking configuration syntax...' : deploymentProgress.stage === 'deploying' ? 'Applying changes to cluster...' : 'Verifying deployment status...'}
                  </p>
                  <div style={{ width: '100%', marginTop: 20, height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#2563EB)', borderRadius: 3, width: deploymentProgress.stage === 'validating' ? '33%' : deploymentProgress.stage === 'deploying' ? '66%' : '100%', transition: 'width 0.5s ease' }} />
                  </div>
                </>
              )}
              {deploymentProgress.stage === 'error' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, width: '100%' }}>
                  {deploymentProgress.isRepoError ? (
                    <>
                      <button onClick={() => { setDeploymentProgress({ show: false, message: '', stage: 'validating' }); navigate('/deploy/helm/catalog'); }} style={{ ...btnPrimary, justifyContent: 'center', width: '100%', padding: '10px 0' }}>
                        <ServerStackIcon style={{ width: 14, height: 14 }} />Add Repository
                      </button>
                      <button onClick={() => setDeploymentProgress({ show: false, message: '', stage: 'validating' })} style={{ ...btnSecondary, justifyContent: 'center', width: '100%', padding: '10px 0' }}>Close</button>
                    </>
                  ) : (
                    <button onClick={() => setDeploymentProgress({ show: false, message: '', stage: 'validating' })} style={{ ...btnPrimary, justifyContent: 'center', width: '100%', padding: '10px 0' }}>Close</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {showTestModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowTestModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.cardBg, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border, padding: 32, maxWidth: 560, width: '100%', margin: '0 16px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ padding: 12, borderRadius: '50%', background: testResult?.success ? 'rgba(16,185,129,0.15)' : testInProgress ? 'rgba(139,92,246,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {testInProgress ? <ArrowPathIcon style={{ width: 28, height: 28, color: '#8B5CF6' }} /> : testResult?.success ? <CheckCircleIcon style={{ width: 28, height: 28, color: '#10B981' }} /> : <XCircleIcon style={{ width: 28, height: 28, color: '#EF4444' }} />}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{testInProgress ? 'Running Tests...' : 'Test Results'}</h3>
                <p style={{ fontSize: 12, color: t.textMuted }}>{releaseName} in {namespace}</p>
              </div>
            </div>
            {testResult && (
              <>
                <div style={{ padding: 12, borderRadius: 8, background: testResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: testResult.success ? '#10B981' : '#EF4444' }}>{testResult.message}</p>
                </div>
                {testResult.notes && (
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8 }}>Test Output:</h4>
                    <div style={{ background: '#0D1117', borderRadius: 8, padding: 14, overflowX: 'auto' }}>
                      <pre style={{ fontSize: 11, color: '#4ADE80', ...mono, whiteSpace: 'pre-wrap', margin: 0 }}>{testResult.notes}</pre>
                    </div>
                  </div>
                )}
              </>
            )}
            {testInProgress && <p style={{ textAlign: 'center', fontSize: 13, color: t.textMuted, padding: '20px 0' }}>Running Helm tests... This may take a few minutes.</p>}
            {!testInProgress && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setShowTestModal(false)} style={{ ...btnPrimary, padding: '9px 20px' }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowPreviewModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: t.cardBg, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border, padding: 32, maxWidth: '90vw', width: 900, margin: '0 16px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexShrink: 0 }}>
              <div style={{ padding: 12, borderRadius: '50%', background: previewError ? 'rgba(239,68,68,0.15)' : previewLoading ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)' }}>
                {previewLoading ? <ArrowPathIcon style={{ width: 28, height: 28, color: '#3b82f6' }} /> : previewError ? <XCircleIcon style={{ width: 28, height: 28, color: '#EF4444' }} /> : <MagnifyingGlassCircleIcon style={{ width: 28, height: 28, color: '#10B981' }} />}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{previewLoading ? 'Generating Preview...' : 'Preview Changes'}</h3>
                <p style={{ fontSize: 12, color: t.textMuted }}>{isInstallMode ? `Installing ${installReleaseName} in ${installNamespace}` : `Upgrading ${releaseName} in ${namespace}`}</p>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {previewLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ fontSize: 13, color: t.textMuted }}>Running dry-run to preview changes...</p>
                </div>
              ) : previewError ? (
                <div style={{ padding: 14, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>Preview Failed:</p>
                  <p style={{ fontSize: 12, color: '#EF4444' }}>{previewError}</p>
                </div>
              ) : (
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Generated Kubernetes Manifests</h4>
                    <button onClick={() => navigator.clipboard.writeText(previewManifest)} style={btnSecondary}>
                      <DocumentDuplicateIcon style={{ width: 13, height: 13 }} />Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>These resources will be created or updated when you proceed with the {isInstallMode ? 'installation' : 'upgrade'}.</p>
                  <div style={{ background: '#0D1117', borderRadius: 8, padding: 16, overflowY: 'auto' }}>
                    <pre style={{ fontSize: 11, color: '#4ADE80', ...mono, whiteSpace: 'pre', margin: 0 }}>{previewManifest}</pre>
                  </div>
                </div>
              )}
            </div>
            {!previewLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, flexShrink: 0 }}>
                <button onClick={() => setShowPreviewModal(false)} style={btnSecondary}>Close</button>
                {!previewError && (
                  <button onClick={() => { setShowPreviewModal(false); if (isInstallMode) handleInstall(); else handleUpgrade(); }} style={btnPrimary}>
                    {isInstallMode ? 'Proceed with Install' : 'Proceed with Upgrade'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
