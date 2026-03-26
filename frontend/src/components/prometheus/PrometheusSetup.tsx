import { useState, useEffect } from 'react';
import {
  ServerIcon,
  BellIcon,
  ChartBarIcon,
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PlayIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { prometheusApi } from '../../services/prometheusApi';
import type {
  PrometheusStackConfig,
  PrometheusStackStatus,
  StackStatus,
} from '../../types/prometheus';
import { getDefaultStackConfig } from '../../types/prometheus';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

interface StepProps {
  config: PrometheusStackConfig;
  setConfig: (config: PrometheusStackConfig) => void;
  t: ReturnType<typeof getThemeColors>;
}

const inputStyle = (t: ReturnType<typeof getThemeColors>) => ({
  background: 'transparent',
  border: `1px solid ${t.cardBorder}`,
  borderRadius: 6,
  padding: '7px 10px',
  color: t.text,
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
});

const selectStyle = (t: ReturnType<typeof getThemeColors>) => ({
  background: t.cardBg,
  border: `1px solid ${t.cardBorder}`,
  borderRadius: 6,
  padding: '7px 10px',
  color: t.text,
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
});

const labelStyle = (t: ReturnType<typeof getThemeColors>) => ({
  display: 'block' as const,
  fontSize: 12,
  fontWeight: 500 as const,
  color: t.textSub,
  marginBottom: 6,
});

const hintStyle = (t: ReturnType<typeof getThemeColors>) => ({
  marginTop: 4,
  fontSize: 11,
  color: t.textMuted,
});

function ToggleRow({
  label, description, checked, onChange, t,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  t: ReturnType<typeof getThemeColors>;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', background: t.mainBg,
      border: `1px solid ${t.cardBorder}`, borderRadius: 8,
    }}>
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: 0 }}>{label}</h4>
        <p style={{ fontSize: 12, color: t.textMuted, margin: '2px 0 0' }}>{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? t.info : t.cardBorder,
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, borderRadius: '50%',
          width: 18, height: 18, background: '#fff',
          left: checked ? 23 : 3, transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

// Step 1: Namespace & Release Configuration
function NamespaceStep({ config, setConfig, t }: StepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle(t)}>Namespace</label>
        <input
          type="text"
          value={config.namespace}
          onChange={(e) => setConfig({ ...config, namespace: e.target.value })}
          style={inputStyle(t)}
          placeholder="monitoring"
        />
        <p style={hintStyle(t)}>Namespace where Prometheus stack will be deployed</p>
      </div>

      <div>
        <label style={labelStyle(t)}>Release Name</label>
        <input
          type="text"
          value={config.release_name}
          onChange={(e) => setConfig({ ...config, release_name: e.target.value })}
          style={inputStyle(t)}
          placeholder="prometheus-stack"
        />
        <p style={hintStyle(t)}>Helm release name for the stack</p>
      </div>
    </div>
  );
}

// Step 2: Prometheus Configuration
function PrometheusStep({ config, setConfig, t }: StepProps) {
  const retentionOptions = ['7d', '15d', '30d', '60d', '90d'];
  const storageOptions = ['10Gi', '25Gi', '50Gi', '100Gi', '200Gi', '500Gi'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle(t)}>Data Retention</label>
          <select
            value={config.prometheus.retention}
            onChange={(e) => setConfig({ ...config, prometheus: { ...config.prometheus, retention: e.target.value } })}
            style={selectStyle(t)}
          >
            {retentionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle(t)}>Storage Size</label>
          <select
            value={config.prometheus.storage_size}
            onChange={(e) => setConfig({ ...config, prometheus: { ...config.prometheus, storage_size: e.target.value } })}
            style={selectStyle(t)}
          >
            {storageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle(t)}>Storage Class (optional)</label>
        <input
          type="text"
          value={config.prometheus.storage_class || ''}
          onChange={(e) => setConfig({ ...config, prometheus: { ...config.prometheus, storage_class: e.target.value || undefined } })}
          style={inputStyle(t)}
          placeholder="default (uses cluster default)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle(t)}>Replicas</label>
          <select
            value={config.prometheus.replicas}
            onChange={(e) => setConfig({ ...config, prometheus: { ...config.prometheus, replicas: parseInt(e.target.value) } })}
            style={selectStyle(t)}
          >
            <option value={1}>1 (Single)</option>
            <option value={2}>2 (HA)</option>
            <option value={3}>3 (HA)</option>
          </select>
        </div>

        <div>
          <label style={labelStyle(t)}>Scrape Interval</label>
          <select
            value={config.prometheus.scrape_interval}
            onChange={(e) => setConfig({ ...config, prometheus: { ...config.prometheus, scrape_interval: e.target.value } })}
            style={selectStyle(t)}
          >
            <option value="15s">15s</option>
            <option value="30s">30s</option>
            <option value="60s">60s</option>
          </select>
        </div>
      </div>

      <div style={{
        padding: '12px 14px', background: t.infoBg,
        border: `1px solid ${t.info}`, borderRadius: 8,
      }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: t.info, margin: '0 0 10px' }}>Resource Limits</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ ...labelStyle(t), color: t.textMuted }}>CPU Request</label>
            <input
              type="text"
              value={config.prometheus.resources.cpu_request}
              onChange={(e) => setConfig({
                ...config,
                prometheus: { ...config.prometheus, resources: { ...config.prometheus.resources, cpu_request: e.target.value } }
              })}
              style={{ ...inputStyle(t), fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle(t), color: t.textMuted }}>Memory Request</label>
            <input
              type="text"
              value={config.prometheus.resources.memory_request}
              onChange={(e) => setConfig({
                ...config,
                prometheus: { ...config.prometheus, resources: { ...config.prometheus.resources, memory_request: e.target.value } }
              })}
              style={{ ...inputStyle(t), fontSize: 12 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Alertmanager Configuration
function AlertmanagerStep({ config, setConfig, t }: StepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ToggleRow
        label="Enable Alertmanager"
        description="Handle and route alerts to notification channels"
        checked={config.alertmanager.enabled}
        onChange={(val) => setConfig({ ...config, alertmanager: { ...config.alertmanager, enabled: val } })}
        t={t}
      />

      {config.alertmanager.enabled && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle(t)}>Replicas</label>
              <select
                value={config.alertmanager.replicas}
                onChange={(e) => setConfig({ ...config, alertmanager: { ...config.alertmanager, replicas: parseInt(e.target.value) } })}
                style={selectStyle(t)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>

            <div>
              <label style={labelStyle(t)}>Storage Size</label>
              <select
                value={config.alertmanager.storage_size}
                onChange={(e) => setConfig({ ...config, alertmanager: { ...config.alertmanager, storage_size: e.target.value } })}
                style={selectStyle(t)}
              >
                <option value="5Gi">5Gi</option>
                <option value="10Gi">10Gi</option>
                <option value="20Gi">20Gi</option>
              </select>
            </div>
          </div>

          <div style={{
            padding: '10px 14px', background: t.warningBg,
            border: `1px solid ${t.warning}`, borderRadius: 8,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <ExclamationTriangleIcon style={{ width: 16, height: 16, color: t.warning, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: t.warning, margin: 0 }}>
              Notification receivers (Slack, Email, PagerDuty) can be configured after deployment through the Alert Rules Manager.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Step 4: Grafana Configuration
function GrafanaStep({ config, setConfig, t }: StepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ToggleRow
        label="Enable Grafana"
        description="Visualization and dashboards for metrics"
        checked={config.grafana.enabled}
        onChange={(val) => setConfig({ ...config, grafana: { ...config.grafana, enabled: val } })}
        t={t}
      />

      {config.grafana.enabled && (
        <>
          <div>
            <label style={labelStyle(t)}>Admin Password (optional)</label>
            <input
              type="password"
              value={config.grafana.admin_password || ''}
              onChange={(e) => setConfig({ ...config, grafana: { ...config.grafana, admin_password: e.target.value || undefined } })}
              style={inputStyle(t)}
              placeholder="Auto-generated if empty"
            />
          </div>

          <ToggleRow
            label="Enable Persistence"
            description="Store dashboards and settings"
            checked={config.grafana.persistence_enabled}
            onChange={(val) => setConfig({ ...config, grafana: { ...config.grafana, persistence_enabled: val } })}
            t={t}
          />

          {config.grafana.persistence_enabled && (
            <div>
              <label style={labelStyle(t)}>Storage Size</label>
              <select
                value={config.grafana.storage_size}
                onChange={(e) => setConfig({ ...config, grafana: { ...config.grafana, storage_size: e.target.value } })}
                style={selectStyle(t)}
              >
                <option value="5Gi">5Gi</option>
                <option value="10Gi">10Gi</option>
                <option value="20Gi">20Gi</option>
              </select>
            </div>
          )}

          <ToggleRow
            label="Enable Ingress"
            description="Expose Grafana externally"
            checked={config.grafana.ingress_enabled}
            onChange={(val) => setConfig({ ...config, grafana: { ...config.grafana, ingress_enabled: val } })}
            t={t}
          />

          {config.grafana.ingress_enabled && (
            <div>
              <label style={labelStyle(t)}>Ingress Host</label>
              <input
                type="text"
                value={config.grafana.ingress_host || ''}
                onChange={(e) => setConfig({ ...config, grafana: { ...config.grafana, ingress_host: e.target.value || undefined } })}
                style={inputStyle(t)}
                placeholder="grafana.example.com"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Step 5: Exporters Configuration
function ExportersStep({ config, setConfig, t }: StepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ToggleRow
        label="Node Exporter"
        description="Collect hardware and OS metrics from nodes"
        checked={config.node_exporter.enabled}
        onChange={(val) => setConfig({ ...config, node_exporter: { enabled: val } })}
        t={t}
      />

      <ToggleRow
        label="kube-state-metrics"
        description="Collect Kubernetes object state metrics"
        checked={config.kube_state_metrics.enabled}
        onChange={(val) => setConfig({ ...config, kube_state_metrics: { enabled: val } })}
        t={t}
      />

      <div style={{
        padding: '12px 14px', background: t.infoBg,
        border: `1px solid ${t.info}`, borderRadius: 8,
      }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: t.info, margin: '0 0 8px' }}>What you'll get:</h4>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {config.node_exporter.enabled && (
            <li style={{ fontSize: 12, color: t.info }}>- CPU, Memory, Disk, Network metrics per node</li>
          )}
          {config.kube_state_metrics.enabled && (
            <li style={{ fontSize: 12, color: t.info }}>- Deployment, Pod, Service, Node state metrics</li>
          )}
          <li style={{ fontSize: 12, color: t.info }}>- Container CPU/Memory metrics (from kubelet)</li>
          <li style={{ fontSize: 12, color: t.info }}>- Kubernetes API server metrics</li>
        </ul>
      </div>
    </div>
  );
}

// Step 6: Review & Deploy
function ReviewStep({ config, t }: { config: PrometheusStackConfig; t: ReturnType<typeof getThemeColors> }) {
  const reviewCardStyle = {
    padding: '12px 14px', background: t.mainBg,
    border: `1px solid ${t.cardBorder}`, borderRadius: 8,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={reviewCardStyle}>
          <h4 style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Namespace</h4>
          <p style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0, fontFamily: "'SF Mono', monospace" }}>{config.namespace}</p>
        </div>
        <div style={reviewCardStyle}>
          <h4 style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Release Name</h4>
          <p style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0, fontFamily: "'SF Mono', monospace" }}>{config.release_name}</p>
        </div>
      </div>

      <div style={reviewCardStyle}>
        <h4 style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Prometheus</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ fontSize: 12, color: t.textSub }}>
            <span style={{ color: t.textMuted }}>Retention: </span>{config.prometheus.retention}
          </div>
          <div style={{ fontSize: 12, color: t.textSub }}>
            <span style={{ color: t.textMuted }}>Storage: </span>{config.prometheus.storage_size}
          </div>
          <div style={{ fontSize: 12, color: t.textSub }}>
            <span style={{ color: t.textMuted }}>Replicas: </span>{config.prometheus.replicas}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Alertmanager', enabled: config.alertmanager.enabled },
          { label: 'Grafana', enabled: config.grafana.enabled },
          { label: 'Node Exporter', enabled: config.node_exporter.enabled },
        ].map(({ label, enabled }) => (
          <div
            key={label}
            style={{
              padding: '10px 12px', borderRadius: 8,
              background: enabled ? t.successBg : t.mainBg,
              border: `1px solid ${enabled ? t.success : t.cardBorder}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {enabled
              ? <CheckCircleIcon style={{ width: 18, height: 18, color: t.success }} />
              : <XCircleIcon style={{ width: 18, height: 18, color: t.textMuted }} />}
            <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{
        padding: '10px 14px', background: t.warningBg,
        border: `1px solid ${t.warning}`, borderRadius: 8,
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <ExclamationTriangleIcon style={{ width: 16, height: 16, color: t.warning, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: t.warning, margin: 0 }}>
          Deployment may take 5-10 minutes. The stack will be installed via Helm and pods will need time to start.
        </p>
      </div>
    </div>
  );
}

// Main Component
export default function PrometheusSetup() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<PrometheusStackConfig>(getDefaultStackConfig());
  const [status, setStatus] = useState<PrometheusStackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  const steps = [
    { id: 'namespace', title: 'Namespace', icon: ServerIcon },
    { id: 'prometheus', title: 'Prometheus', icon: ChartBarIcon },
    { id: 'alertmanager', title: 'Alertmanager', icon: BellIcon },
    { id: 'grafana', title: 'Grafana', icon: ChartBarIcon },
    { id: 'exporters', title: 'Exporters', icon: CpuChipIcon },
    { id: 'review', title: 'Review', icon: Cog6ToothIcon },
  ];

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await prometheusApi.getStackStatus();
      setStatus(response.data);
    } catch (err) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);
    setDeployResult(null);

    try {
      const response = await prometheusApi.deployStack(config);
      setDeployResult({ success: response.data.success, message: response.data.message });
      if (response.data.success) {
        setStatus(response.data.status || null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMessage);
      setDeployResult({ success: false, message: errorMessage });
    } finally {
      setDeploying(false);
    }
  };

  const getStatusStyle = (stackStatus: StackStatus) => {
    switch (stackStatus) {
      case 'running':
        return { color: t.success, background: t.successBg, border: `1px solid ${t.success}` };
      case 'degraded':
        return { color: t.warning, background: t.warningBg, border: `1px solid ${t.warning}` };
      case 'failed':
        return { color: t.error, background: t.errorBg, border: `1px solid ${t.error}` };
      case 'installing':
      case 'upgrading':
        return { color: t.info, background: t.infoBg, border: `1px solid ${t.info}` };
      default:
        return { color: t.textMuted, background: t.cardBg, border: `1px solid ${t.cardBorder}` };
    }
  };

  const cardStyle = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 20,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, background: t.mainBg }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: `3px solid ${t.cardBorder}`, borderTopColor: t.info,
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  // If stack is already installed, show status
  if (status && status.status !== 'not_installed') {
    const statusStyle = getStatusStyle(status.status);
    return (
      <div style={{ color: t.text }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0 }}>Prometheus Stack Status</h2>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              ...statusStyle,
            }}>
              {status.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Namespace', value: status.namespace },
              { label: 'Release', value: status.release_name },
              { label: 'Version', value: status.version || 'N/A' },
              { label: 'Components', value: String(status.components.length) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '12px 14px', background: t.mainBg,
                border: `1px solid ${t.cardBorder}`, borderRadius: 8,
              }}>
                <p style={{ fontSize: 11, color: t.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0, fontFamily: "'SF Mono', monospace" }}>{value}</p>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, margin: '0 0 12px' }}>Components</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {status.components.map((component) => (
              <div
                key={component.name}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: t.mainBg,
                  border: `1px solid ${t.cardBorder}`, borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {component.ready
                    ? <CheckCircleIcon style={{ width: 18, height: 18, color: t.success }} />
                    : <XCircleIcon style={{ width: 18, height: 18, color: t.error }} />}
                  <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{component.name}</span>
                </div>
                <span style={{ fontSize: 12, color: t.textMuted }}>
                  {component.ready_replicas}/{component.replicas} ready
                </span>
              </div>
            ))}
          </div>

          {status.prometheus_url && (
            <div style={{
              marginTop: 20, padding: '12px 14px', background: t.infoBg,
              border: `1px solid ${t.info}`, borderRadius: 8,
            }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: t.info, margin: '0 0 8px' }}>Access URLs (Internal)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 12, color: t.info, margin: 0, fontFamily: "'SF Mono', monospace" }}>
                  Prometheus: {status.prometheus_url}
                </p>
                {status.alertmanager_url && (
                  <p style={{ fontSize: 12, color: t.info, margin: 0, fontFamily: "'SF Mono', monospace" }}>
                    Alertmanager: {status.alertmanager_url}
                  </p>
                )}
                {status.grafana_url && (
                  <p style={{ fontSize: 12, color: t.info, margin: 0, fontFamily: "'SF Mono', monospace" }}>
                    Grafana: {status.grafana_url}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show setup wizard
  return (
    <div style={{ color: t.text }}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: '0 0 4px' }}>Deploy Prometheus Stack</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: '0 0 24px' }}>
          Deploy a complete monitoring stack with Prometheus, Alertmanager, Grafana, and exporters.
        </p>

        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 4 }}>
          {steps.map((step, index) => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentStep(index)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 8,
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  background: currentStep === index
                    ? t.info
                    : currentStep > index
                    ? t.successBg
                    : t.mainBg,
                  color: currentStep === index
                    ? '#fff'
                    : currentStep > index
                    ? t.success
                    : t.textMuted,
                  border: currentStep === index
                    ? 'none'
                    : currentStep > index
                    ? `1px solid ${t.success}`
                    : `1px solid ${t.cardBorder}`,
                }}
              >
                <step.icon style={{ width: 15, height: 15 }} />
                <span>{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <div style={{
                  width: 20, height: 1, margin: '0 4px',
                  background: currentStep > index ? t.success : t.cardBorder,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ minHeight: 300 }}>
          {currentStep === 0 && <NamespaceStep config={config} setConfig={setConfig} t={t} />}
          {currentStep === 1 && <PrometheusStep config={config} setConfig={setConfig} t={t} />}
          {currentStep === 2 && <AlertmanagerStep config={config} setConfig={setConfig} t={t} />}
          {currentStep === 3 && <GrafanaStep config={config} setConfig={setConfig} t={t} />}
          {currentStep === 4 && <ExportersStep config={config} setConfig={setConfig} t={t} />}
          {currentStep === 5 && <ReviewStep config={config} t={t} />}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: t.errorBg, border: `1px solid ${t.error}`, borderRadius: 8,
          }}>
            <p style={{ fontSize: 13, color: t.error, margin: 0 }}>{error}</p>
          </div>
        )}

        {deployResult && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8,
            background: deployResult.success ? t.successBg : t.errorBg,
            border: `1px solid ${deployResult.success ? t.success : t.error}`,
          }}>
            <p style={{ fontSize: 13, color: deployResult.success ? t.success : t.error, margin: 0 }}>
              {deployResult.message}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 28, paddingTop: 20, borderTop: `1px solid ${t.cardBorder}`,
        }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: 'transparent', border: 'none',
              color: currentStep === 0 ? t.textMuted : t.textSub,
              fontSize: 13, fontWeight: 500,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              opacity: currentStep === 0 ? 0.5 : 1,
            }}
          >
            <ArrowLeftIcon style={{ width: 15, height: 15 }} />
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', background: t.info, border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Next
              <ArrowRightIcon style={{ width: 15, height: 15 }} />
            </button>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={deploying}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', background: t.success, border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: deploying ? 'not-allowed' : 'pointer',
                opacity: deploying ? 0.7 : 1,
              }}
            >
              {deploying ? (
                <>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Deploying...
                </>
              ) : (
                <>
                  <PlayIcon style={{ width: 15, height: 15 }} />
                  Deploy Stack
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
